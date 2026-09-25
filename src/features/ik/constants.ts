import type { TDhJoint } from '@/types/kinematics';
import type { TDhPreset, TIkPageCopy, TSceneColors, TStatusCopy } from '@/features/ik/types';

export const IK_PAGE_COPY: TIkPageCopy = {
	title: 'Inverse kinematics simulator',
	subtitle:
		'Describe a serial robot with standard Denavit–Hartenberg parameters, move the target and watch the solver. The Jacobian (and its inverse) reveals singular configurations.'
};

export const MIN_DOF = 1;
export const MAX_DOF = 7;

/** Row added when the degrees of freedom are increased. */
export const DEFAULT_DH_JOINT: TDhJoint = {
	type: 'revolute',
	theta: 0,
	d: 0,
	a: 0.5,
	alpha: 0
};

const deg = (degrees: number): number => (degrees * Math.PI) / 180;

export const DH_PRESETS: TDhPreset[] = [
	{
		id: 'planar-2r',
		label: 'Planar 2R arm (2 DOF)',
		joints: [
			{ type: 'revolute', theta: 0, d: 0, a: 1, alpha: 0 },
			{ type: 'revolute', theta: 0, d: 0, a: 0.8, alpha: 0 }
		],
		home: [20, 60]
	},
	{
		id: 'planar-3r',
		label: 'Planar 3R arm (3 DOF)',
		joints: [
			{ type: 'revolute', theta: 0, d: 0, a: 1, alpha: 0 },
			{ type: 'revolute', theta: 0, d: 0, a: 0.8, alpha: 0 },
			{ type: 'revolute', theta: 0, d: 0, a: 0.5, alpha: 0 }
		],
		home: [15, 45, 30]
	},
	{
		id: 'scara',
		label: 'SCARA RRP (3 DOF)',
		joints: [
			{ type: 'revolute', theta: 0, d: 0.8, a: 1, alpha: 0 },
			{ type: 'revolute', theta: 0, d: 0, a: 0.8, alpha: deg(180) },
			{ type: 'prismatic', theta: 0, d: 0.2, a: 0, alpha: 0 }
		],
		home: [20, 50, 0.2]
	},
	{
		id: 'elbow',
		label: 'Anthropomorphic elbow arm (3 DOF)',
		joints: [
			{ type: 'revolute', theta: 0, d: 0.8, a: 0, alpha: deg(90) },
			{ type: 'revolute', theta: 0, d: 0, a: 1, alpha: 0 },
			{ type: 'revolute', theta: 0, d: 0, a: 0.8, alpha: 0 }
		],
		home: [30, 40, -70]
	},
	{
		id: 'spherical-wrist',
		label: 'Elbow arm + spherical wrist (6 DOF)',
		joints: [
			{ type: 'revolute', theta: 0, d: 0.8, a: 0, alpha: deg(90) },
			{ type: 'revolute', theta: 0, d: 0, a: 1, alpha: 0 },
			{ type: 'revolute', theta: deg(90), d: 0, a: 0, alpha: deg(90) },
			{ type: 'revolute', theta: 0, d: 0.9, a: 0, alpha: deg(-90) },
			{ type: 'revolute', theta: 0, d: 0, a: 0, alpha: deg(90) },
			{ type: 'revolute', theta: 0, d: 0.2, a: 0, alpha: 0 }
		],
		home: [20, 30, -40, 10, 45, 0]
	},
	{
		id: 'redundant-7r',
		label: 'Redundant 7R arm (7 DOF)',
		joints: [
			{ type: 'revolute', theta: 0, d: 0.7, a: 0, alpha: deg(-90) },
			{ type: 'revolute', theta: 0, d: 0, a: 0, alpha: deg(90) },
			{ type: 'revolute', theta: 0, d: 0.8, a: 0, alpha: deg(90) },
			{ type: 'revolute', theta: 0, d: 0, a: 0, alpha: deg(-90) },
			{ type: 'revolute', theta: 0, d: 0.8, a: 0, alpha: deg(-90) },
			{ type: 'revolute', theta: 0, d: 0, a: 0, alpha: deg(90) },
			{ type: 'revolute', theta: 0, d: 0.2, a: 0, alpha: 0 }
		],
		home: [0, 40, 0, -60, 0, 45, 0]
	}
];

export const DEFAULT_PRESET_ID = 'elbow';

/** Path playback duration range, in seconds. */
export const MIN_PATH_DURATION = 0.5;
export const MAX_PATH_DURATION = 10;
export const DEFAULT_PATH_DURATION = 3;

export const STATUS_COPY: TStatusCopy = {
	regular: {
		label: 'Regular',
		description: 'The Jacobian has full rank; its inverse is well conditioned.'
	},
	near: {
		label: 'Near singularity',
		description:
			'σmin is small: the inverse Jacobian amplifies some task-space velocities strongly.'
	},
	singular: {
		label: 'Singular',
		description:
			'The Jacobian lost rank: its inverse does not exist and the end effector cannot move along the highlighted direction.'
	}
};

export const SCENE_COLORS: TSceneColors = {
	joint: 0x475569,
	prismatic: 0x7c3aed,
	effector: 0xf8fafc,
	target: 0x22c55e,
	targetMissed: 0xf97316,
	gridMajor: 0x64748b,
	gridMinor: 0x334155,
	axisX: 0xef4444,
	axisY: 0x22c55e,
	axisZ: 0x3b82f6,
	lostDirection: 0xf43f5e,
	pathPlanned: 0xa3a3a3,
	pathTraced: 0xf59e0b,
	pathStart: 0xe879f9,
	status: {
		regular: 0x38bdf8,
		near: 0xfacc15,
		singular: 0xef4444
	}
};
