/**
 * Serial-chain kinematics with standard Denavit–Hartenberg parameters:
 * forward kinematics, the geometric Jacobian, a singular value analysis of the Jacobian
 * and a damped least-squares inverse kinematics solver.
 *
 * Frame i is reached from frame i-1 by A_i = Rz(θ) · Tz(d) · Tx(a) · Rx(α).
 */
import type {
	TDhJoint,
	TIkOptions,
	TIkResult,
	TIkTarget,
	TJacobianAnalysis,
	TMatrix,
	TMatrix3,
	TMatrix4,
	TSingularityStatus,
	TTaskMode,
	TVec3
} from '@/types/kinematics';

/** σmin / σmax below this ratio counts as singular. */
export const SINGULAR_RATIO = 1e-3;
/** σmin / σmax below this ratio counts as close to a singularity. */
export const NEAR_SINGULAR_RATIO = 0.05;

export const DEFAULT_IK_OPTIONS: TIkOptions = {
	mode: 'position',
	maxIterations: 200,
	positionTolerance: 1e-4,
	orientationTolerance: 1e-3,
	maxStep: 0.1,
	maxDamping: 0.1,
	dampingWindow: 0.1,
	restarts: 4
};

export const degToRad = (degrees: number): number => (degrees * Math.PI) / 180;
export const radToDeg = (radians: number): number => (radians * 180) / Math.PI;

const wrapAngle = (angle: number): number => {
	const wrapped = (((angle + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
	return wrapped - Math.PI;
};

/* ----------------------------------------- Vectors ---------------------------------------- */

const cross = (a: TVec3, b: TVec3): TVec3 => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];

const subtract = (a: TVec3, b: TVec3): TVec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

const norm = (vector: number[]): number => Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

/* ---------------------------------------- Transforms --------------------------------------- */

export const identity4 = (): TMatrix4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

const multiply4 = (a: TMatrix4, b: TMatrix4): TMatrix4 => {
	const out = new Array<number>(16).fill(0);
	for (let row = 0; row < 4; row++) {
		for (let column = 0; column < 4; column++) {
			let sum = 0;
			for (let k = 0; k < 4; k++) {
				sum += a[row * 4 + k] * b[k * 4 + column];
			}
			out[row * 4 + column] = sum;
		}
	}
	return out;
};

/** Homogeneous DH transform A_i for one joint at joint value `q`. */
export const dhTransform = (joint: TDhJoint, q: number): TMatrix4 => {
	const theta = joint.type === 'revolute' ? joint.theta + q : joint.theta;
	const d = joint.type === 'prismatic' ? joint.d + q : joint.d;
	const ct = Math.cos(theta);
	const st = Math.sin(theta);
	const ca = Math.cos(joint.alpha);
	const sa = Math.sin(joint.alpha);
	return [
		ct,
		-st * ca,
		st * sa,
		joint.a * ct,
		st,
		ct * ca,
		-ct * sa,
		joint.a * st,
		0,
		sa,
		ca,
		d,
		0,
		0,
		0,
		1
	];
};

/** Frames T_0 (base, identity) … T_n (end effector) in base coordinates. */
export const forwardKinematics = (joints: TDhJoint[], q: number[]): TMatrix4[] => {
	const frames: TMatrix4[] = [identity4()];
	joints.forEach((joint, index) => {
		frames.push(multiply4(frames[index], dhTransform(joint, q[index] ?? 0)));
	});
	return frames;
};

export const framePosition = (frame: TMatrix4): TVec3 => [frame[3], frame[7], frame[11]];

/** Column `axis` (0 = x, 1 = y, 2 = z) of the frame's rotation. */
export const frameAxis = (frame: TMatrix4, axis: 0 | 1 | 2): TVec3 => [
	frame[axis],
	frame[4 + axis],
	frame[8 + axis]
];

export const frameRotation = (frame: TMatrix4): TMatrix3 => [
	frame[0],
	frame[1],
	frame[2],
	frame[4],
	frame[5],
	frame[6],
	frame[8],
	frame[9],
	frame[10]
];

/** Rotation from roll/pitch/yaw (radians): R = Rz(yaw) · Ry(pitch) · Rx(roll). */
export const rpyToRotation = (roll: number, pitch: number, yaw: number): TMatrix3 => {
	const cr = Math.cos(roll);
	const sr = Math.sin(roll);
	const cp = Math.cos(pitch);
	const sp = Math.sin(pitch);
	const cy = Math.cos(yaw);
	const sy = Math.sin(yaw);
	return [
		cy * cp,
		cy * sp * sr - sy * cr,
		cy * sp * cr + sy * sr,
		sy * cp,
		sy * sp * sr + cy * cr,
		sy * sp * cr - cy * sr,
		-sp,
		cp * sr,
		cp * cr
	];
};

/** Inverse of rpyToRotation, returns [roll, pitch, yaw] in radians. */
export const rotationToRpy = (rotation: TMatrix3): TVec3 => {
	const pitch = Math.asin(Math.max(-1, Math.min(1, -rotation[6])));
	if (Math.abs(Math.cos(pitch)) < 1e-9) {
		// Gimbal lock: fold roll into yaw.
		return [0, pitch, Math.atan2(-rotation[1], rotation[4])];
	}
	return [Math.atan2(rotation[7], rotation[8]), pitch, Math.atan2(rotation[3], rotation[0])];
};

/** Rough workspace radius, used to scale steps, tolerances and the 3D view. */
export const chainReach = (joints: TDhJoint[]): number => {
	const reach = joints.reduce(
		(sum, joint) =>
			sum + Math.hypot(joint.a, joint.d) + (joint.type === 'prismatic' ? Math.abs(joint.d) + 1 : 0),
		0
	);
	return Math.max(reach, 1e-3);
};

/* ----------------------------------------- Jacobian ---------------------------------------- */

export const taskRows = (mode: TTaskMode): number => (mode === 'pose' ? 6 : 3);

/**
 * Geometric Jacobian in base coordinates. Rows are [vx, vy, vz] ('position')
 * or [vx, vy, vz, ωx, ωy, ωz] ('pose'); one column per joint.
 */
export const geometricJacobian = (
	joints: TDhJoint[],
	q: number[],
	mode: TTaskMode,
	frames: TMatrix4[] = forwardKinematics(joints, q)
): TMatrix => {
	const rows = taskRows(mode);
	const jacobian: TMatrix = Array.from({ length: rows }, () =>
		new Array<number>(joints.length).fill(0)
	);
	const end = framePosition(frames[frames.length - 1]);
	joints.forEach((joint, index) => {
		const z = frameAxis(frames[index], 2);
		const linear =
			joint.type === 'revolute' ? cross(z, subtract(end, framePosition(frames[index]))) : z;
		const angular: TVec3 = joint.type === 'revolute' ? z : [0, 0, 0];
		for (let row = 0; row < 3; row++) {
			jacobian[row][index] = linear[row];
			if (rows === 6) {
				jacobian[row + 3][index] = angular[row];
			}
		}
	});
	return jacobian;
};

/* -------------------------------------- Linear algebra ------------------------------------- */

/**
 * Eigen-decomposition of a symmetric matrix with the cyclic Jacobi method.
 * Returns eigenvalues sorted descending and the matching eigenvectors (as arrays).
 */
export const symmetricEigen = (input: TMatrix): { values: number[]; vectors: number[][] } => {
	const size = input.length;
	const a = input.map((row) => [...row]);
	const v: TMatrix = Array.from({ length: size }, (_, i) =>
		Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
	);
	for (let sweep = 0; sweep < 100; sweep++) {
		let offDiagonal = 0;
		for (let p = 0; p < size; p++) {
			for (let r = p + 1; r < size; r++) {
				offDiagonal += a[p][r] * a[p][r];
			}
		}
		if (offDiagonal < 1e-30) {
			break;
		}
		for (let p = 0; p < size; p++) {
			for (let r = p + 1; r < size; r++) {
				if (Math.abs(a[p][r]) < 1e-300) {
					continue;
				}
				const phi = (a[r][r] - a[p][p]) / (2 * a[p][r]);
				const t = Math.sign(phi || 1) / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
				const c = 1 / Math.sqrt(t * t + 1);
				const s = t * c;
				for (let k = 0; k < size; k++) {
					const akp = a[k][p];
					const akr = a[k][r];
					a[k][p] = c * akp - s * akr;
					a[k][r] = s * akp + c * akr;
				}
				for (let k = 0; k < size; k++) {
					const apk = a[p][k];
					const ark = a[r][k];
					a[p][k] = c * apk - s * ark;
					a[r][k] = s * apk + c * ark;
				}
				for (let k = 0; k < size; k++) {
					const vkp = v[k][p];
					const vkr = v[k][r];
					v[k][p] = c * vkp - s * vkr;
					v[k][r] = s * vkp + c * vkr;
				}
			}
		}
	}
	const order = Array.from({ length: size }, (_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
	return {
		values: order.map((i) => a[i][i]),
		vectors: order.map((i) => v.map((row) => row[i]))
	};
};

/** J · Jᵀ (rows × rows). */
const jacobianGram = (jacobian: TMatrix): TMatrix =>
	jacobian.map((rowA) =>
		jacobian.map((rowB) => rowA.reduce((sum, value, k) => sum + value * rowB[k], 0))
	);

/** Determinant by Gaussian elimination with partial pivoting. */
export const determinant = (input: TMatrix): number => {
	const size = input.length;
	const a = input.map((row) => [...row]);
	let det = 1;
	for (let column = 0; column < size; column++) {
		let pivot = column;
		for (let row = column + 1; row < size; row++) {
			if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) {
				pivot = row;
			}
		}
		if (Math.abs(a[pivot][column]) < 1e-300) {
			return 0;
		}
		if (pivot !== column) {
			[a[pivot], a[column]] = [a[column], a[pivot]];
			det = -det;
		}
		det *= a[column][column];
		for (let row = column + 1; row < size; row++) {
			const factor = a[row][column] / a[column][column];
			for (let k = column; k < size; k++) {
				a[row][k] -= factor * a[column][k];
			}
		}
	}
	return det;
};

type TJacobianSvd = {
	/** Left singular vectors u_i (task space), largest σ first. */
	left: number[][];
	/** Singular values, one per task row, largest first (trailing ones are zero if rows > dof). */
	sigma: number[];
};

const jacobianSvd = (jacobian: TMatrix): TJacobianSvd => {
	const { values, vectors } = symmetricEigen(jacobianGram(jacobian));
	return { left: vectors, sigma: values.map((value) => Math.sqrt(Math.max(value, 0))) };
};

const rankTolerance = (sigmaMax: number): number => 1e-9 * Math.max(sigmaMax, 1);

const numericalRank = (sigma: number[]): number => {
	const tolerance = rankTolerance(sigma[0] ?? 0);
	return sigma.filter((value) => value > tolerance).length;
};

/** Deterministic pseudo-random numbers, so the generic rank is stable between renders. */
const seededRandom = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
};

const randomConfiguration = (joints: TDhJoint[], random: () => number, reach: number): number[] =>
	joints.map((joint) =>
		joint.type === 'revolute' ? (random() * 2 - 1) * Math.PI : (random() * 2 - 1) * reach * 0.5
	);

/**
 * Highest Jacobian rank the chain reaches over sampled configurations. A configuration whose
 * rank is lower than this is singular. (A 3-DOF planar arm, for example, never exceeds rank 2
 * for a 3D position task: that is a property of the chain, not a singularity.)
 */
export const genericJacobianRank = (joints: TDhJoint[], mode: TTaskMode, samples = 24): number => {
	if (joints.length === 0) {
		return 0;
	}
	const random = seededRandom(0x1c0ffee + joints.length);
	const reach = chainReach(joints);
	let best = 0;
	const limit = Math.min(taskRows(mode), joints.length);
	for (let sample = 0; sample < samples && best < limit; sample++) {
		const q = randomConfiguration(joints, random, reach);
		best = Math.max(best, numericalRank(jacobianSvd(geometricJacobian(joints, q, mode)).sigma));
	}
	return best;
};

/**
 * Singularity analysis of the Jacobian at configuration `q`.
 * The inverse Jacobian J⁺ = V Σ⁻¹ Uᵀ has ‖J⁺‖₂ = 1 / σmin: as σmin → 0 the joint
 * velocities needed for some task-space motion blow up, which is the singularity.
 */
export const analyzeJacobian = (
	joints: TDhJoint[],
	q: number[],
	mode: TTaskMode,
	genericRank: number = genericJacobianRank(joints, mode),
	jacobian: TMatrix = geometricJacobian(joints, q, mode)
): TJacobianAnalysis => {
	const rows = jacobian.length;
	const columns = joints.length;
	const { left, sigma } = jacobianSvd(jacobian);
	const singularValues = sigma.slice(0, Math.min(rows, columns));
	const rank = numericalRank(singularValues);
	const sigmaMax = singularValues[0] ?? 0;
	const relevant = Math.max(genericRank, 1);
	const sigmaMin = columns === 0 ? 0 : (singularValues[relevant - 1] ?? 0);
	const ratio = sigmaMax > 0 ? sigmaMin / sigmaMax : 0;
	const inverseNorm = sigmaMin > rankTolerance(sigmaMax) ? 1 / sigmaMin : Infinity;
	const condition = Number.isFinite(inverseNorm) ? sigmaMax * inverseNorm : Infinity;
	const manipulability = singularValues.slice(0, relevant).reduce((product, s) => product * s, 1);

	let status: TSingularityStatus = 'regular';
	if (columns === 0 || rank < genericRank || ratio < SINGULAR_RATIO) {
		status = 'singular';
	} else if (ratio < NEAR_SINGULAR_RATIO) {
		status = 'near';
	}

	return {
		rows,
		columns,
		singularValues,
		rank,
		genericRank,
		sigmaMin,
		sigmaMax,
		inverseNorm,
		condition,
		manipulability,
		determinant: rows === columns ? determinant(jacobian) : undefined,
		lostDirection: status !== 'regular' && columns > 0 ? left[relevant - 1] : undefined,
		status
	};
};

/**
 * Moore–Penrose inverse J⁺ = Σ (Jᵀ uᵢ) uᵢᵀ / σᵢ² over the non-zero singular values
 * (columns × rows). For a square, regular J this equals J⁻¹. Returns undefined when J is
 * singular, because the inverse Jacobian then does not exist.
 */
export const inverseJacobian = (
	jacobian: TMatrix,
	analysis: TJacobianAnalysis
): TMatrix | undefined => {
	if (analysis.status === 'singular' || analysis.columns === 0) {
		return undefined;
	}
	const rows = jacobian.length;
	const columns = analysis.columns;
	const { left, sigma } = jacobianSvd(jacobian);
	const tolerance = rankTolerance(sigma[0] ?? 0);
	const inverse: TMatrix = Array.from({ length: columns }, () => new Array<number>(rows).fill(0));
	sigma.forEach((value, index) => {
		if (value <= tolerance) {
			return;
		}
		const u = left[index];
		for (let column = 0; column < columns; column++) {
			let jtu = 0;
			for (let row = 0; row < rows; row++) {
				jtu += jacobian[row][column] * u[row];
			}
			for (let row = 0; row < rows; row++) {
				inverse[column][row] += (jtu * u[row]) / (value * value);
			}
		}
	});
	return inverse;
};

/* ------------------------------------ Inverse kinematics ----------------------------------- */

/** Orientation error ½ Σ (cᵢ × cᵢ,desired) over the rotation columns. */
const orientationError = (current: TMatrix3, desired: TMatrix3): TVec3 => {
	const error: TVec3 = [0, 0, 0];
	for (let column = 0; column < 3; column++) {
		const c: TVec3 = [current[column], current[3 + column], current[6 + column]];
		const d: TVec3 = [desired[column], desired[3 + column], desired[6 + column]];
		const product = cross(c, d);
		error[0] += product[0] / 2;
		error[1] += product[1] / 2;
		error[2] += product[2] / 2;
	}
	return error;
};

type TTaskError = {
	vector: number[];
	position: number;
	orientation: number;
};

const taskError = (frames: TMatrix4[], target: TIkTarget, mode: TTaskMode): TTaskError => {
	const end = frames[frames.length - 1];
	const positionVector = subtract(target.position, framePosition(end));
	if (mode === 'position' || !target.rotation) {
		return { vector: positionVector, position: norm(positionVector), orientation: 0 };
	}
	const rotationVector = orientationError(frameRotation(end), target.rotation);
	return {
		vector: [...positionVector, ...rotationVector],
		position: norm(positionVector),
		orientation: norm(rotationVector)
	};
};

/**
 * Damped least-squares step Δq = Jᵀ (J Jᵀ + λ² I)⁻¹ e, evaluated through the eigen
 * decomposition of J Jᵀ. λ grows smoothly only when σmin enters the damping window, so far
 * from singularities this is the exact pseudo-inverse step Δq = J⁺ e.
 */
const dampedStep = (
	jacobian: TMatrix,
	error: number[],
	options: TIkOptions,
	genericRank: number
): { step: number[]; singular: boolean } => {
	const columns = jacobian[0]?.length ?? 0;
	const { left, sigma } = jacobianSvd(jacobian);
	const sigmaMax = sigma[0] ?? 0;
	const sigmaMin = sigma[Math.max(genericRank, 1) - 1] ?? 0;
	const dampingStart = options.dampingWindow * sigmaMax;
	const maxLambda = options.maxDamping * Math.max(sigmaMax, 1e-6);
	const lambdaSquared =
		sigmaMin < dampingStart ? (1 - (sigmaMin / dampingStart) ** 2) * maxLambda * maxLambda : 0;
	const weighted = new Array<number>(jacobian.length).fill(0);
	sigma.forEach((value, index) => {
		const denominator = value * value + lambdaSquared;
		if (denominator <= rankTolerance(sigmaMax) ** 2) {
			return;
		}
		const u = left[index];
		const projection = u.reduce((sum, component, k) => sum + component * error[k], 0);
		u.forEach((component, k) => {
			weighted[k] += (component * projection) / denominator;
		});
	});
	const step = new Array<number>(columns).fill(0);
	for (let column = 0; column < columns; column++) {
		for (let row = 0; row < jacobian.length; row++) {
			step[column] += jacobian[row][column] * weighted[row];
		}
	}
	return {
		step,
		singular: sigmaMax > 0 ? sigmaMin / sigmaMax < SINGULAR_RATIO : true
	};
};

const solveFrom = (
	joints: TDhJoint[],
	target: TIkTarget,
	initial: number[],
	options: TIkOptions,
	genericRank: number
): Omit<TIkResult, 'analysis'> => {
	const reach = chainReach(joints);
	const maxPositionStep = options.maxStep * reach;
	const q = joints.map((_, index) => initial[index] ?? 0);
	let singularityEncountered = false;
	let frames = forwardKinematics(joints, q);
	let error = taskError(frames, target, options.mode);
	let iterations = 0;
	const isConverged = (current: TTaskError) =>
		current.position <= options.positionTolerance &&
		current.orientation <= options.orientationTolerance;

	while (iterations < options.maxIterations && !isConverged(error)) {
		iterations++;
		const clamped = [...error.vector];
		if (error.position > maxPositionStep) {
			const scale = maxPositionStep / error.position;
			clamped[0] *= scale;
			clamped[1] *= scale;
			clamped[2] *= scale;
		}
		const jacobian = geometricJacobian(joints, q, options.mode, frames);
		const { step, singular } = dampedStep(jacobian, clamped, options, genericRank);
		singularityEncountered ||= singular;
		joints.forEach((joint, index) => {
			const next = q[index] + step[index];
			q[index] = joint.type === 'revolute' ? wrapAngle(next) : next;
		});
		frames = forwardKinematics(joints, q);
		error = taskError(frames, target, options.mode);
	}

	return {
		q,
		converged: isConverged(error),
		iterations,
		positionError: error.position,
		orientationError: error.orientation,
		singularityEncountered
	};
};

const errorScore = (result: Omit<TIkResult, 'analysis'>, reach: number): number =>
	result.positionError / reach + result.orientationError;

/**
 * Solves q so that the end effector reaches `target`, starting from `initial`
 * (warm start). If that does not converge, a few random restarts are tried and the best
 * attempt is returned. Unreachable targets return the closest configuration found.
 */
export const solveIk = (
	joints: TDhJoint[],
	target: TIkTarget,
	initial: number[],
	options: TIkOptions = DEFAULT_IK_OPTIONS,
	genericRank: number = genericJacobianRank(joints, options.mode)
): TIkResult => {
	const reach = chainReach(joints);
	let best = solveFrom(joints, target, initial, options, genericRank);
	const random = seededRandom(0xbeef + joints.length);
	for (let attempt = 0; attempt < options.restarts && !best.converged; attempt++) {
		const candidate = solveFrom(
			joints,
			target,
			randomConfiguration(joints, random, reach),
			options,
			genericRank
		);
		if (candidate.converged || errorScore(candidate, reach) < errorScore(best, reach)) {
			best = {
				...candidate,
				singularityEncountered: best.singularityEncountered || candidate.singularityEncountered
			};
		}
	}
	return { ...best, analysis: analyzeJacobian(joints, best.q, options.mode, genericRank) };
};
