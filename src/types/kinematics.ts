/**
 * Types for serial-chain kinematics described with standard Denavit–Hartenberg parameters.
 * Angles are in radians and lengths in scene units unless stated otherwise.
 */

export type TJointType = 'revolute' | 'prismatic';

/**
 * One row of a standard DH table. For a revolute joint the joint variable is added to
 * `theta`; for a prismatic joint it is added to `d`.
 */
export type TDhJoint = {
	type: TJointType;
	theta: number;
	d: number;
	a: number;
	alpha: number;
};

export type TVec3 = [number, number, number];

/** Row-major 4×4 homogeneous transform. */
export type TMatrix4 = number[];

/** Row-major 3×3 rotation matrix. */
export type TMatrix3 = number[];

/** Dense row-major matrix, `matrix[row][column]`. */
export type TMatrix = number[][];

/** 'position' solves for the end-effector position (3 rows), 'pose' adds orientation (6 rows). */
export type TTaskMode = 'position' | 'pose';

export type TSingularityStatus = 'regular' | 'near' | 'singular';

export type TJacobianAnalysis = {
	/** Rows (task dimension) × columns (degrees of freedom). */
	rows: number;
	columns: number;
	/** Singular values of J, largest first. */
	singularValues: number[];
	/** Numerical rank of J at this configuration. */
	rank: number;
	/** Highest rank the chain reaches anywhere; dropping below it is a singularity. */
	genericRank: number;
	/** Smallest relevant singular value (σ at index genericRank - 1). */
	sigmaMin: number;
	sigmaMax: number;
	/** ‖J⁺‖₂ = 1 / σmin: how much the inverse Jacobian amplifies task-space velocity. */
	inverseNorm: number;
	/** κ = ‖J‖₂ · ‖J⁺‖₂. */
	condition: number;
	/** Yoshikawa manipulability: product of the relevant singular values. */
	manipulability: number;
	/** det(J) for square Jacobians. */
	determinant?: number;
	/** Task-space direction the chain cannot move along when singular (wide/square J only). */
	lostDirection?: number[];
	status: TSingularityStatus;
};

export type TIkTarget = {
	position: TVec3;
	/** Desired end-effector orientation, used in 'pose' mode. */
	rotation?: TMatrix3;
};

export type TIkOptions = {
	mode: TTaskMode;
	maxIterations: number;
	/** Absolute position tolerance in scene units. */
	positionTolerance: number;
	/** Orientation tolerance in radians. */
	orientationTolerance: number;
	/** Largest position correction per iteration, relative to the chain reach. */
	maxStep: number;
	/** Largest damping factor, relative to σmax, applied near singularities. */
	maxDamping: number;
	/** Damping starts when σmin / σmax drops below this ratio. */
	dampingWindow: number;
	/** Extra random restarts tried when the first attempt does not converge. */
	restarts: number;
};

/**
 * Straight-line Cartesian path from the end effector to the target, solved waypoint by
 * waypoint (each IK solve is seeded with the previous configuration, so the motion is continuous).
 */
export type TIkPath = {
	/** Planned end-effector positions along the straight line, start included. */
	waypoints: TVec3[];
	/** Joint configuration at each waypoint, start included. */
	configurations: number[][];
	/** End-effector positions the robot actually reaches at each waypoint. */
	traced: TVec3[];
	/** Jacobian status at each waypoint. */
	statuses: TSingularityStatus[];
	/** Whether the IK converged at each waypoint. */
	converged: boolean[];
	/** Largest distance between a planned and a reached waypoint. */
	maxDeviation: number;
	singularCount: number;
	nearCount: number;
	/** IK result at the final waypoint (the target). */
	result: TIkResult;
};

export type TIkResult = {
	q: number[];
	converged: boolean;
	iterations: number;
	positionError: number;
	orientationError: number;
	/** True when the solver passed through a singular configuration. */
	singularityEncountered: boolean;
	/** Jacobian analysis at the returned configuration. */
	analysis: TJacobianAnalysis;
};
