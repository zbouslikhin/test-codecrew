<script lang="ts">
	import styles from './RobotShowerScene.module.scss';
	import { loadThree } from '@/utils/loadThree';
	import {
		MAX_FRAME_DELTA_SECONDS,
		MAX_PIXEL_RATIO,
		REDUCED_MOTION_MEDIA_QUERY,
		REDUCED_MOTION_SHOWER_CONFIG,
		ROBOT_PALETTES,
		SCENE_BACKGROUND_STAR_COLOR,
		SHOWER_CONFIG
	} from '@/features/home/constants';
	import type { TSceneStatus, TShootingRobot, TShowerConfig } from '@/features/home/types';
	import type {
		TBufferGeometry,
		TDisposable,
		TMaterial,
		TObject3D,
		TThreeModule,
		TVector3
	} from '@/types/three';

	type TRobotGeometries = {
		head: TBufferGeometry;
		eye: TBufferGeometry;
		mouth: TBufferGeometry;
		antenna: TBufferGeometry;
		antennaTip: TBufferGeometry;
		ear: TBufferGeometry;
	};

	let {
		config,
		onStatusChange
	}: {
		/** Overrides the shower settings; defaults respect prefers-reduced-motion. */
		config?: TShowerConfig;
		onStatusChange?: (status: TSceneStatus) => void;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();

	const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

	const resolveConfig = (): TShowerConfig => {
		if (config) {
			return config;
		}
		const prefersReducedMotion =
			typeof window.matchMedia === 'function' &&
			window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
		return prefersReducedMotion ? REDUCED_MOTION_SHOWER_CONFIG : SHOWER_CONFIG;
	};

	const createRobotGeometries = (THREE: TThreeModule): TRobotGeometries => ({
		head: new THREE.BoxGeometry(1.6, 1.3, 1.2),
		eye: new THREE.SphereGeometry(0.18, 16, 12),
		mouth: new THREE.BoxGeometry(0.8, 0.12, 0.06),
		antenna: new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8),
		antennaTip: new THREE.SphereGeometry(0.14, 12, 10),
		ear: new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16)
	});

	/** Unit direction uniformly distributed on a sphere. */
	const randomDirection = (THREE: TThreeModule): TVector3 => {
		const z = randomBetween(-1, 1);
		const theta = randomBetween(0, Math.PI * 2);
		const r = Math.sqrt(1 - z * z);
		return new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), z);
	};

	const startScene = (
		THREE: TThreeModule,
		host: HTMLDivElement,
		target: HTMLCanvasElement,
		settings: TShowerConfig
	): (() => void) => {
		const renderer = new THREE.WebGLRenderer({
			canvas: target,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance'
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
		renderer.setClearColor(0x000000, 0);

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(settings.cameraFov, 1, 0.1, 400);
		camera.position.set(0, 0, settings.cameraDistance);
		camera.lookAt(0, 0, 0);

		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
		keyLight.position.set(10, 14, 20);
		scene.add(keyLight);
		const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
		rimLight.position.set(-14, -6, -10);
		scene.add(rimLight);

		// Static distant starfield so the flying robots have depth to read against.
		const starPositions = new Float32Array(settings.backgroundStarCount * 3);
		for (let i = 0; i < settings.backgroundStarCount; i++) {
			const direction = randomDirection(THREE).multiplyScalar(randomBetween(120, 220));
			starPositions[i * 3] = direction.x;
			starPositions[i * 3 + 1] = direction.y;
			starPositions[i * 3 + 2] = direction.z;
		}
		const starGeometry = new THREE.BufferGeometry();
		starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
		const starMaterial = new THREE.PointsMaterial({
			color: SCENE_BACKGROUND_STAR_COLOR,
			size: 0.9,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.8,
			depthWrite: false
		});
		const starfield = new THREE.Points(starGeometry, starMaterial);
		scene.add(starfield);

		const geometries = createRobotGeometries(THREE);
		const robots: TShootingRobot[] = [];
		const trailSpacing = 0.9;
		const direction = new THREE.Vector3();

		const buildRobotIcon = (materials: {
			body: TMaterial;
			accent: TMaterial;
			eyes: TMaterial;
		}): TObject3D => {
			const icon = new THREE.Group();
			const head = new THREE.Mesh(geometries.head, materials.body);
			const mouth = new THREE.Mesh(geometries.mouth, materials.accent);
			mouth.position.set(0, -0.32, 0.61);
			const antenna = new THREE.Mesh(geometries.antenna, materials.body);
			antenna.position.set(0, 0.9, 0);
			const antennaTip = new THREE.Mesh(geometries.antennaTip, materials.accent);
			antennaTip.position.set(0, 1.2, 0);
			icon.add(head, mouth, antenna, antennaTip);
			for (const side of [-1, 1]) {
				const eye = new THREE.Mesh(geometries.eye, materials.eyes);
				eye.position.set(side * 0.38, 0.12, 0.6);
				const ear = new THREE.Mesh(geometries.ear, materials.accent);
				ear.position.set(side * 0.9, 0, 0);
				ear.rotation.set(0, 0, Math.PI / 2);
				icon.add(eye, ear);
			}
			return icon;
		};

		const updateTrail = (robot: TShootingRobot) => {
			const positions = robot.trail.geometry.getAttribute('position');
			direction.copy(robot.velocity).normalize();
			const step = trailSpacing * robot.icon.scale.x;
			const origin = robot.icon.position;
			for (let i = 0; i < settings.trailLength; i++) {
				const offset = (i + 1) * step;
				positions.array[i * 3] = origin.x - direction.x * offset;
				positions.array[i * 3 + 1] = origin.y - direction.y * offset;
				positions.array[i * 3 + 2] = origin.z - direction.z * offset;
			}
			positions.needsUpdate = true;
		};

		const spawnRobot = (headStartSeconds = 0) => {
			const palette = ROBOT_PALETTES[Math.floor(Math.random() * ROBOT_PALETTES.length)];
			const body = new THREE.MeshStandardMaterial({
				color: palette.body,
				metalness: 0.6,
				roughness: 0.35,
				transparent: true,
				opacity: 0
			});
			const accent = new THREE.MeshStandardMaterial({
				color: palette.accent,
				emissive: palette.accent,
				emissiveIntensity: 0.6,
				metalness: 0.3,
				roughness: 0.4,
				transparent: true,
				opacity: 0
			});
			const eyes = new THREE.MeshBasicMaterial({
				color: palette.eyes,
				transparent: true,
				opacity: 0
			});

			const trailPositions = new Float32Array(settings.trailLength * 3);
			const trailColors = new Float32Array(settings.trailLength * 3);
			const red = ((palette.trail >> 16) & 0xff) / 255;
			const green = ((palette.trail >> 8) & 0xff) / 255;
			const blue = (palette.trail & 0xff) / 255;
			for (let i = 0; i < settings.trailLength; i++) {
				// Additive blending: darker vertex colors read as a fading tail.
				const fade = Math.pow(1 - i / settings.trailLength, 1.6);
				trailColors[i * 3] = red * fade;
				trailColors[i * 3 + 1] = green * fade;
				trailColors[i * 3 + 2] = blue * fade;
			}
			const trailGeometry = new THREE.BufferGeometry();
			trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
			trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
			const trailMaterial = new THREE.PointsMaterial({
				size: 0.9,
				sizeAttenuation: true,
				vertexColors: true,
				transparent: true,
				opacity: 0,
				depthWrite: false,
				blending: THREE.AdditiveBlending
			});
			const trail = new THREE.Points(trailGeometry, trailMaterial);
			trail.frustumCulled = false;

			const icon = buildRobotIcon({ body, accent, eyes });
			icon.scale.setScalar(randomBetween(settings.minScale, settings.maxScale));
			icon.rotation.set(
				randomBetween(0, Math.PI * 2),
				randomBetween(0, Math.PI * 2),
				randomBetween(0, Math.PI * 2)
			);

			const start = randomDirection(THREE).multiplyScalar(settings.spawnRadius);
			const aim = randomDirection(THREE).multiplyScalar(randomBetween(0, settings.targetJitter));
			const velocity = aim
				.sub(start)
				.normalize()
				.multiplyScalar(randomBetween(settings.minSpeed, settings.maxSpeed));
			icon.position.copy(start).addScaledVector(velocity, headStartSeconds);

			const robot: TShootingRobot = {
				icon,
				trail,
				velocity,
				spin: new THREE.Vector3(randomBetween(-1.5, 1.5), randomBetween(-1.5, 1.5), 0),
				age: headStartSeconds,
				materials: [body, accent, eyes, trailMaterial],
				baseOpacities: [1, 1, 1, 0.9],
				passedCenter: false
			};
			robots.push(robot);
			updateTrail(robot);
			scene.add(icon, trail);
		};

		const removeRobot = (index: number) => {
			const [robot] = robots.splice(index, 1);
			scene.remove(robot.icon, robot.trail);
			robot.materials.forEach((material) => material.dispose());
			robot.trail.geometry.dispose();
		};

		const resize = () => {
			const width = Math.max(host.clientWidth, 1);
			const height = Math.max(host.clientHeight, 1);
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};
		resize();
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(host);

		// Gentle parallax: the camera drifts toward the pointer.
		let pointerX = 0;
		let pointerY = 0;
		const handlePointerMove = (event: PointerEvent) => {
			const bounds = host.getBoundingClientRect();
			pointerX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1;
			pointerY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1;
		};
		window.addEventListener('pointermove', handlePointerMove);

		// Pre-warm so the page doesn't open on an empty sky.
		const initialRobots = Math.min(settings.maxRobots, Math.ceil(settings.spawnPerSecond * 2));
		const travelSeconds = settings.spawnRadius / settings.maxSpeed;
		for (let i = 0; i < initialRobots; i++) {
			spawnRobot(randomBetween(0, travelSeconds * 1.5));
		}

		let spawnAccumulator = 0;
		let lastTime = performance.now();
		let frameId = 0;

		const tick = (now: number) => {
			frameId = requestAnimationFrame(tick);
			const delta = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA_SECONDS);
			lastTime = now;

			spawnAccumulator = Math.min(spawnAccumulator + delta * settings.spawnPerSecond, 3);
			while (spawnAccumulator >= 1) {
				spawnAccumulator -= 1;
				if (robots.length < settings.maxRobots) {
					spawnRobot();
				}
			}

			for (let i = robots.length - 1; i >= 0; i--) {
				const robot = robots[i];
				robot.age += delta;
				robot.icon.position.addScaledVector(robot.velocity, delta);
				robot.icon.rotation.x += robot.spin.x * delta;
				robot.icon.rotation.y += robot.spin.y * delta;

				const fadeIn = Math.min(robot.age / settings.fadeInSeconds, 1);
				robot.materials.forEach((material, index) => {
					material.opacity = robot.baseOpacities[index] * fadeIn;
				});
				updateTrail(robot);

				const position = robot.icon.position;
				const velocity = robot.velocity;
				const movingAway =
					position.x * velocity.x + position.y * velocity.y + position.z * velocity.z > 0;
				if (movingAway) {
					robot.passedCenter = true;
				}
				if (robot.passedCenter && position.length() > settings.despawnRadius) {
					removeRobot(i);
				}
			}

			starfield.rotation.y += delta * 0.01;
			camera.position.x += (pointerX * 4 - camera.position.x) * Math.min(delta * 2, 1);
			camera.position.y += (-pointerY * 3 - camera.position.y) * Math.min(delta * 2, 1);
			camera.lookAt(0, 0, 0);

			renderer.render(scene, camera);
		};
		frameId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frameId);
			resizeObserver.disconnect();
			window.removeEventListener('pointermove', handlePointerMove);
			while (robots.length > 0) {
				removeRobot(robots.length - 1);
			}
			const sharedResources: TDisposable[] = [
				...Object.values(geometries),
				starGeometry,
				starMaterial,
				renderer
			];
			sharedResources.forEach((resource) => resource.dispose());
		};
	};

	$effect(() => {
		const host = container;
		const target = canvas;
		if (!host || !target) {
			return;
		}
		const settings = resolveConfig();
		let disposed = false;
		let stopScene: (() => void) | undefined;

		onStatusChange?.('loading');
		loadThree()
			.then((THREE) => {
				if (disposed) {
					return;
				}
				stopScene = startScene(THREE, host, target, settings);
				onStatusChange?.('ready');
			})
			.catch((error: unknown) => {
				console.error('Failed to start the robot shower scene', error);
				if (!disposed) {
					onStatusChange?.('error');
				}
			});

		return () => {
			disposed = true;
			stopScene?.();
		};
	});
</script>

<div class={styles.robotShowerScene} bind:this={container} aria-hidden="true">
	<canvas class={styles.canvas} bind:this={canvas}></canvas>
</div>
