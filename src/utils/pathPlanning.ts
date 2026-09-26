/**
 * Cartesian path planning for a serial chain: the end effector follows a straight line
 * (and, in 'pose' mode, a geodesic rotation) from its current pose to the target.
 * Every waypoint is solved with IK seeded by the previous configuration, so consecutive
 * configurations stay close together and the motion is continuous.
 */
import type {
	TDhJoint,
	TIkOptions,
	TIkPath,
	TIkResult,
	TMatrix3,
	TSingularityStatus,
	TVec3
} from '@/types/kinematics';
import {
	DEFAULT_IK_OPTIONS,
	analyzeJacobian,
	chainReach,
	forwardKinematics,
	framePosition,
	frameRotation,
	solveIk
} from '@/utils/kinematics';

export const MIN_PATH_WAYPOINTS = 12;
export const MAX_PATH_WAYPOINTS = 160;

/* ------------------------------------- 3×3 rotations ------------------------------------- */

const multiply3 = (a: TMatrix3, b: TMatrix3): TMatrix3 => {
	const out = new Array<number>(9).fill(0);
	for (let row = 0; row < 3; row++) {
		for (let column = 0; column < 3; column++) {
			let sum = 0;
			for (let k = 0; k < 3; k++) {
				sum += a[row * 3 + k] * b[k * 3 + column];
			}
			out[row * 3 + column] = sum;
		}
	}
	return out;
};

const transpose3 = (m: TMatrix3): TMatrix3 => [
	m[0],
	m[3],
	m[6],
	m[1],
	m[4],
	m[7],
	m[2],
	m[5],
	m[8]
];

/** Rotation vector (axis · angle) of a rotation matrix. */
const rotationLog = (m: TMatrix3): TVec3 => {
	const cosAngle = Math.max(-1, Math.min(1, (m[0] + m[4] + m[8] - 1) / 2));
	const angle = Math.acos(cosAngle);
	if (angle < 1e-9) {
		return [0, 0, 0];
	}
	const sinAngle = Math.sin(angle);
	if (sinAngle > 1e-6) {
		const scale = angle / (2 * sinAngle);
		return [(m[7] - m[5]) * scale, (m[2] - m[6]) * scale, (m[3] - m[1]) * scale];
	}
	// angle ≈ π: recover the axis from the diagonal of R = 2 n nᵀ - I.
	const axis: TVec3 = [
		Math.sqrt(Math.max(0, (m[0] + 1) / 2)),
		Math.sqrt(Math.max(0, (m[4] + 1) / 2)),
		Math.sqrt(Math.max(0, (m[8] + 1) / 2))
	];
	const largest = axis.indexOf(Math.max(...axis));
	if (largest === 0) {
		axis[1] = Math.sign(m[1] || 1) * axis[1];
		axis[2] = Math.sign(m[2] || 1) * axis[2];
	} else if (largest === 1) {
		axis[0] = Math.sign(m[1] || 1) * axis[0];
		axis[2] = Math.sign(m[5] || 1) * axis[2];
	} else {
		axis[0] = Math.sign(m[2] || 1) * axis[0];
		axis[1] = Math.sign(m[5] || 1) * axis[1];
	}
	return [axis[0] * angle, axis[1] * angle, axis[2] * angle];
};

/** Rodrigues' formula: rotation matrix from a rotation vector. */
const rotationExp = (w: TVec3): TMatrix3 => {
	const angle = Math.hypot(w[0], w[1], w[2]);
	if (angle < 1e-12) {
		return [1, 0, 0, 0, 1, 0, 0, 0, 1];
	}
	const [x, y, z] = [w[0] / angle, w[1] / angle, w[2] / angle];
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	const t = 1 - c;
	return [
		t * x * x + c,
		t * x * y - s * z,
		t * x * z + s * y,
		t * x * y + s * z,
		t * y * y + c,
		t * y * z - s * x,
		t * x * z - s * y,
		t * y * z + s * x,
		t * z * z + c
	];
};

/** Rotation a fraction `s` of the way from `from` to `to` along the shortest arc. */
export const interpolateRotation = (from: TMatrix3, to: TMatrix3, s: number): TMatrix3 => {
	const w = rotationLog(multiply3(transpose3(from), to));
	return multiply3(from, rotationExp([w[0] * s, w[1] * s, w[2] * s]));
};

const lerp3 = (a: TVec3, b: TVec3, s: number): TVec3 => [
	a[0] + (b[0] - a[0]) * s,
	a[1] + (b[1] - a[1]) * s,
	a[2] + (b[2] - a[2]) * s
];

const distance3 = (a: TVec3, b: TVec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Shifts revolute joint angles by multiples of 2π so each one is closest to the previous
 * configuration; otherwise interpolating between waypoints could spin a joint a full turn.
 */
const unwrapRevolute = (joints: TDhJoint[], previous: number[], next: number[]): number[] =>
	next.map((value, index) => {
		if (joints[index]?.type !== 'revolute') {
			return value;
		}
		const reference = previous[index] ?? value;
		const turns = Math.round((reference - value) / (2 * Math.PI));
		return value + turns * 2 * Math.PI;
	});

/** Number of segments so that each step is a small fraction of the chain reach (or of a turn). */
export const pathSegmentCount = (distance: number, angle: number, reach: number): number => {
	const byDistance = Math.ceil(distance / Math.max(reach * 0.015, 1e-6));
	const byAngle = Math.ceil(angle / 0.04);
	return Math.min(MAX_PATH_WAYPOINTS, Math.max(MIN_PATH_WAYPOINTS, byDistance, byAngle));
};

/** Joint configuration a fraction `progress` (0…1) along a planned path. */
export const configurationAt = (path: TIkPath, progress: number): number[] => {
	const { configurations } = path;
	const last = configurations.length - 1;
	if (last <= 0) {
		return [...(configurations[0] ?? [])];
	}
	const position = Math.min(Math.max(progress, 0), 1) * last;
	const index = Math.min(Math.floor(position), last - 1);
	const s = position - index;
	const from = configurations[index];
	const to = configurations[index + 1];
	return from.map((value, joint) => value + ((to[joint] ?? value) - value) * s);
};

/**
 * Plans a straight-line Cartesian path from the end effector at `startQ` to `target`.
 * `targetRotation` is only used in 'pose' mode.
 */
export const planCartesianPath = (
	joints: TDhJoint[],
	startQ: number[],
	target: TVec3,
	targetRotation: TMatrix3 | undefined,
	options: TIkOptions = DEFAULT_IK_OPTIONS,
	genericRank?: number
): TIkPath => {
	const reach = chainReach(joints);
	const startFrames = forwardKinematics(joints, startQ);
	const startFrame = startFrames[startFrames.length - 1];
	const startPosition = framePosition(startFrame);
	const startRotation = frameRotation(startFrame);
	const goalRotation = options.mode === 'pose' ? targetRotation : undefined;
	const turn = goalRotation
		? Math.hypot(...rotationLog(multiply3(transpose3(startRotation), goalRotation)))
		: 0;
	const segments = pathSegmentCount(distance3(startPosition, target), turn, reach);
	// Restarts would jump to a different IK branch; a path must stay on the current one.
	const stepOptions: TIkOptions = { ...options, restarts: 0 };

	const waypoints: TVec3[] = [startPosition];
	const configurations: number[][] = [[...startQ]];
	const traced: TVec3[] = [startPosition];
	const statuses: TSingularityStatus[] = [
		analyzeJacobian(joints, startQ, options.mode, genericRank).status
	];
	const converged: boolean[] = [true];
	let maxDeviation = 0;
	let q = [...startQ];
	let result: TIkResult | undefined;

	for (let step = 1; step <= segments; step++) {
		const s = step / segments;
		const waypoint = lerp3(startPosition, target, s);
		const rotation = goalRotation ? interpolateRotation(startRotation, goalRotation, s) : undefined;
		result = solveIk(joints, { position: waypoint, rotation }, q, stepOptions, genericRank);
		if (step === segments && !result.converged && options.restarts > 0) {
			// The path got stuck: let the final waypoint try restarts to still reach the target.
			result = solveIk(joints, { position: waypoint, rotation }, q, options, genericRank);
		}
		q = unwrapRevolute(joints, q, result.q);
		const frames = forwardKinematics(joints, q);
		const reached = framePosition(frames[frames.length - 1]);
		waypoints.push(waypoint);
		configurations.push([...q]);
		traced.push(reached);
		converged.push(result.converged);
		maxDeviation = Math.max(maxDeviation, distance3(waypoint, reached));
		statuses.push(result.analysis.status);
	}

	const finalResult = result as TIkResult;
	return {
		waypoints,
		configurations,
		traced,
		statuses,
		converged,
		maxDeviation,
		singularCount: statuses.filter((status) => status === 'singular').length,
		nearCount: statuses.filter((status) => status === 'near').length,
		result: finalResult
	};
};
