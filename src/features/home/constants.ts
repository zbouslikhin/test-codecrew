import type { THomeHero, TRobotPalette, TShowerConfig } from '@/features/home/types';

export const HOME_HERO: THomeHero = {
	title: 'Robots incoming',
	subtitle: 'A meteor shower of little robots, streaking in from every direction.'
};

export const SHOWER_CONFIG: TShowerConfig = {
	spawnRadius: 70,
	targetJitter: 14,
	despawnRadius: 80,
	minSpeed: 18,
	maxSpeed: 34,
	minScale: 0.6,
	maxScale: 1.3,
	maxRobots: 40,
	spawnPerSecond: 5,
	trailLength: 9,
	backgroundStarCount: 1200,
	cameraDistance: 42,
	cameraFov: 60,
	fadeInSeconds: 0.6
};

/** Slower, sparser shower for users who prefer reduced motion. */
export const REDUCED_MOTION_SHOWER_CONFIG: TShowerConfig = {
	...SHOWER_CONFIG,
	minSpeed: 5,
	maxSpeed: 9,
	maxRobots: 10,
	spawnPerSecond: 0.8
};

export const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

export const ROBOT_PALETTES: TRobotPalette[] = [
	{ body: 0xcfd8e3, accent: 0x38bdf8, eyes: 0x67e8f9, trail: 0x38bdf8 },
	{ body: 0xe2e8f0, accent: 0xf472b6, eyes: 0xfbcfe8, trail: 0xf472b6 },
	{ body: 0xd6d3d1, accent: 0xfacc15, eyes: 0xfef08a, trail: 0xfbbf24 },
	{ body: 0xdbeafe, accent: 0x4ade80, eyes: 0xbbf7d0, trail: 0x4ade80 },
	{ body: 0xede9fe, accent: 0xa78bfa, eyes: 0xddd6fe, trail: 0xa78bfa }
];

export const SCENE_BACKGROUND_STAR_COLOR = 0xffffff;
export const MAX_PIXEL_RATIO = 2;
/** Clamp for frame delta so a backgrounded tab doesn't teleport robots on return. */
export const MAX_FRAME_DELTA_SECONDS = 0.1;
