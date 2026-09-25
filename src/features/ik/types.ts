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
};

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
	status: Record<TSingularityStatus, number>;
};
