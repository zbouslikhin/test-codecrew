import type { TThreeModule } from '@/types/three';

/**
 * three.js is not (yet) a package dependency, so it is loaded as a pinned ES module
 * from a CDN. r160 ships as a single self-contained module file.
 */
export const THREE_MODULE_URL =
	'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

let threePromise: Promise<TThreeModule> | undefined;

/** Loads three.js once and caches the module. A failed load can be retried. */
export const loadThree = (): Promise<TThreeModule> => {
	if (!threePromise) {
		threePromise = (import(/* @vite-ignore */ THREE_MODULE_URL) as Promise<TThreeModule>).catch(
			(error: unknown) => {
				threePromise = undefined;
				throw error;
			}
		);
	}
	return threePromise;
};
