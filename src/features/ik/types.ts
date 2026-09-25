import type { TDhJoint, TSingularityStatus, TVec3 } from '@/types/kinematics';

export type TIkPageCopy = {
	title: string;
	subtitle: string;
};

/** A ready-made DH table with a non-singular starting configuration. */
export type TDhPreset = {
	id: string;
	label: string;
	joints: TDhJoint[];
	/** Starting joint values: degrees for revolute joints, scene units for prismatic ones. */
	home: number[];
};

/** Editable DH column; angles are edited in degrees. */
export type TDhField = 'theta' | 'd' | 'a' | 'alpha';

export type TStatusCopy = Record<TSingularityStatus, { label: string; description: string }>;

/** Latest values the 3D scene renders; updated from props, read every animation frame. */
export type TIkSceneState = {
	joints: TDhJoint[];
	q: number[];
	target: TVec3;
	status: TSingularityStatus;
	/** Task-space direction lost at a singularity (only the linear part is drawn). */
	lostDirection?: number[];
	reached: boolean;
	/** Visibility per DH frame: index 0 is the base frame {0}, index n the end-effector frame. */
	frameVisibility: boolean[];
	/** Planned straight-line path (end-effector waypoints), empty when there is none. */
	plannedPath: TVec3[];
	/** End-effector positions the robot actually reaches along the path. */
	tracedPath: TVec3[];
	/** Playback position along the path, 0…1. */
	pathProgress: number;
};

/** Where the path playback currently is. */
export type TPathPlayback = 'idle' | 'playing' | 'paused' | 'done';

export type TSceneColors = {
	joint: number;
	prismatic: number;
	effector: number;
	target: number;
	targetMissed: number;
	gridMajor: number;
	gridMinor: number;
	axisX: number;
	axisY: number;
	axisZ: number;
	lostDirection: number;
	pathPlanned: number;
	pathTraced: number;
	pathStart: number;
	status: Record<TSingularityStatus, number>;
};
