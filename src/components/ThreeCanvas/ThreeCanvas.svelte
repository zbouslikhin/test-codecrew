<script lang="ts">
	/**
	 * Shared three.js wrapper: loads three.js once, owns the renderer, camera, resize handling
	 * and animation loop. Scenes plug in through a `setup` callback and return a controller.
	 */
	import { untrack } from 'svelte';
	import styles from './ThreeCanvas.module.scss';
	import { loadThree } from '@/utils/loadThree';
	import type { TThreeSceneController, TThreeSceneSetup, TThreeStatus } from '@/types/three';

	const MAX_PIXEL_RATIO = 2;
	/** Clamp for frame delta so a backgrounded tab doesn't jump the simulation on return. */
	const MAX_FRAME_DELTA_SECONDS = 0.1;

	let {
		setup,
		cameraFov = 60,
		cameraNear = 0.1,
		cameraFar = 400,
		clearColor = 0x000000,
		clearAlpha = 0,
		label,
		onStatusChange
	}: {
		setup: TThreeSceneSetup;
		cameraFov?: number;
		cameraNear?: number;
		cameraFar?: number;
		clearColor?: number;
		clearAlpha?: number;
		/** Accessible label; when omitted the canvas is treated as decorative. */
		label?: string;
		onStatusChange?: (status: TThreeStatus) => void;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		const host = container;
		const target = canvas;
		if (!host || !target) {
			return;
		}
		const sceneSetup = setup;
		const fov = cameraFov;
		const near = cameraNear;
		const far = cameraFar;
		const color = clearColor;
		const alpha = clearAlpha;

		// Status callbacks must not become dependencies: a new callback must not restart the scene.
		const notify = (status: TThreeStatus) => untrack(() => onStatusChange?.(status));

		let disposed = false;
		let stop: (() => void) | undefined;
		notify('loading');

		loadThree()
			.then((THREE) => {
				if (disposed) {
					return;
				}
				const renderer = new THREE.WebGLRenderer({
					canvas: target,
					antialias: true,
					alpha: true,
					powerPreference: 'high-performance'
				});
				renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
				renderer.setClearColor(color, alpha);

				const scene = new THREE.Scene();
				const camera = new THREE.PerspectiveCamera(fov, 1, near, far);

				let controller: TThreeSceneController;
				try {
					controller = sceneSetup({ THREE, scene, camera, renderer, host, canvas: target });
				} catch (error) {
					renderer.dispose();
					throw error;
				}

				const resize = () => {
					const width = Math.max(host.clientWidth, 1);
					const height = Math.max(host.clientHeight, 1);
					renderer.setSize(width, height, false);
					camera.aspect = width / height;
					camera.updateProjectionMatrix();
					controller.resize?.(width, height);
				};
				resize();
				const resizeObserver = new ResizeObserver(resize);
				resizeObserver.observe(host);

				let lastTime = performance.now();
				let frameId = 0;
				const tick = (now: number) => {
					frameId = requestAnimationFrame(tick);
					const delta = Math.min(Math.max((now - lastTime) / 1000, 0), MAX_FRAME_DELTA_SECONDS);
					lastTime = now;
					controller.update?.(delta, now);
					renderer.render(scene, camera);
				};
				frameId = requestAnimationFrame(tick);

				stop = () => {
					cancelAnimationFrame(frameId);
					resizeObserver.disconnect();
					controller.dispose?.();
					renderer.dispose();
				};
				notify('ready');
			})
			.catch((error: unknown) => {
				if (!disposed) {
					console.error('Failed to start the three.js scene', error);
					notify('error');
				}
			});

		return () => {
			disposed = true;
			stop?.();
			stop = undefined;
		};
	});
</script>

<div
	class={styles.threeCanvas}
	bind:this={container}
	aria-hidden={label ? undefined : 'true'}
	role={label ? 'img' : undefined}
	aria-label={label}
>
	<canvas class={styles.canvas} bind:this={canvas}></canvas>
</div>
