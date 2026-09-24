import type { TMaterial, TObject3D, TPoints, TVector3 } from '@/types/three';

export type THomeHero = {
	title: string;
	subtitle: string;
};

export type TSceneStatus = 'loading' | 'ready' | 'error';

export type TRobotPalette = {
	body: number;
	accent: number;
	eyes: number;
	trail: number;
};

export type TShowerConfig = {
	/** Distance from the origin at which robots appear (a sphere around the scene). */
	spawnRadius: number;
	/** Robots aim at a random point inside this radius around the origin. */
	targetJitter: number;
	/** Robots are removed once they are this far from the origin after passing through. */
	despawnRadius: number;
	minSpeed: number;
	maxSpeed: number;
	minScale: number;
	maxScale: number;
	maxRobots: number;
	/** Average number of robots launched per second. */
	spawnPerSecond: number;
	trailLength: number;
	backgroundStarCount: number;
	cameraDistance: number;
	cameraFov: number;
	/** Seconds used to fade a robot in when it appears. */
	fadeInSeconds: number;
};

export type TShootingRobot = {
	icon: TObject3D;
	trail: TPoints;
	velocity: TVector3;
	spin: TVector3;
	age: number;
	materials: TMaterial[];
	baseOpacities: number[];
	passedCenter: boolean;
};
