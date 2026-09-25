<script lang="ts">
	import styles from './IkScene.module.scss';
	import ThreeCanvas from '@/components/ThreeCanvas/ThreeCanvas.svelte';
	import { SCENE_COLORS } from '@/features/ik/constants';
	import type { TIkSceneState } from '@/features/ik/types';
	import type { TDhJoint, TSingularityStatus, TVec3 } from '@/types/kinematics';
	import type {
		TMesh,
		TObject3D,
		TThreeContext,
		TThreeSceneController,
		TThreeStatus
	} from '@/types/three';
	import { chainReach, forwardKinematics, frameAxis, framePosition } from '@/utils/kinematics';

	let {
		joints,
		q,
		target,
		status,
		lostDirection,
		reached
	}: {
		joints: TDhJoint[];
		q: number[];
		target: TVec3;
		status: TSingularityStatus;
		lostDirection?: number[];
		reached: boolean;
	} = $props();

	let sceneStatus: TThreeStatus = $state('loading');

	/** Plain (non-reactive) snapshot the render loop reads every frame. */
	const sceneState: TIkSceneState = {
		joints: [],
		q: [],
		target: [0, 0, 0],
		status: 'regular',
		reached: true
	};

	$effect(() => {
		sceneState.joints = joints;
		sceneState.q = q;
		sceneState.target = target;
		sceneState.status = status;
		sceneState.lostDirection = lostDirection;
		sceneState.reached = reached;
	});

	/** DH frames are z-up; three.js is y-up. */
	const toThree = (point: TVec3): TVec3 => [point[0], point[2], -point[1]];

	const setup = ({ THREE, scene, camera, host }: TThreeContext): TThreeSceneController => {
		scene.add(new THREE.AmbientLight(0xffffff, 0.8));
		const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
		keyLight.position.set(6, 10, 8);
		scene.add(keyLight);

		const cylinder = new THREE.CylinderGeometry(1, 1, 1, 20);
		const sphere = new THREE.SphereGeometry(1, 20, 14);
		const box = new THREE.BoxGeometry(1, 1, 1);

		const linkMaterial = new THREE.MeshStandardMaterial({
			color: SCENE_COLORS.status.regular,
			metalness: 0.3,
			roughness: 0.45
		});
		const jointMaterial = new THREE.MeshStandardMaterial({
			color: SCENE_COLORS.joint,
			metalness: 0.4,
			roughness: 0.4
		});
		const prismaticMaterial = new THREE.MeshStandardMaterial({
			color: SCENE_COLORS.prismatic,
			metalness: 0.3,
			roughness: 0.4
		});
		const effectorMaterial = new THREE.MeshStandardMaterial({
			color: SCENE_COLORS.effector,
			emissive: SCENE_COLORS.status.regular,
			emissiveIntensity: 0.4
		});
		const targetMaterial = new THREE.MeshBasicMaterial({
			color: SCENE_COLORS.target,
			transparent: true,
			opacity: 0.55
		});
		const lostMaterial = new THREE.MeshBasicMaterial({ color: SCENE_COLORS.lostDirection });

		let grid = new THREE.GridHelper(4, 8, SCENE_COLORS.gridMajor, SCENE_COLORS.gridMinor);
		const axes = new THREE.AxesHelper(0.5);
		scene.add(grid, axes);

		/** A cylinder whose local +z runs from 0 to 1, so it can be aimed with lookAt. */
		const createRod = (material: TMesh['material']): TObject3D => {
			const holder = new THREE.Group();
			const mesh = new THREE.Mesh(cylinder, material);
			mesh.rotation.set(Math.PI / 2, 0, 0);
			mesh.position.set(0, 0, 0.5);
			holder.add(mesh);
			scene.add(holder);
			return holder;
		};

		const placeRod = (rod: TObject3D, from: TVec3, to: TVec3, radius: number) => {
			const start = toThree(from);
			const end = toThree(to);
			const length = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
			rod.visible = length > 1e-6;
			if (!rod.visible) {
				return;
			}
			rod.position.set(start[0], start[1], start[2]);
			rod.scale.set(radius, radius, length);
			rod.lookAt(end[0], end[1], end[2]);
		};

		const offsetRods: TObject3D[] = [];
		const linkRods: TObject3D[] = [];
		const jointMeshes: TObject3D[] = [];
		const prismaticMeshes: TMesh[] = [];

		const effector = new THREE.Mesh(sphere, effectorMaterial);
		const targetMarker = new THREE.Mesh(sphere, targetMaterial);
		const lostArrow = createRod(lostMaterial);
		scene.add(effector, targetMarker);

		const ensureCount = (count: number) => {
			while (linkRods.length < count) {
				offsetRods.push(createRod(linkMaterial));
				linkRods.push(createRod(linkMaterial));
				jointMeshes.push(createRod(jointMaterial));
				const slider = new THREE.Mesh(box, prismaticMaterial);
				scene.add(slider);
				prismaticMeshes.push(slider);
			}
			for (let i = 0; i < linkRods.length; i++) {
				const active = i < count;
				if (!active) {
					offsetRods[i].visible = false;
					linkRods[i].visible = false;
					jointMeshes[i].visible = false;
					prismaticMeshes[i].visible = false;
				}
			}
		};

		// Orbit camera: drag to rotate, wheel to zoom.
		let yaw = Math.PI / 4;
		let pitch = 0.5;
		let distance = 6;
		let dragging = false;
		let lastX = 0;
		let lastY = 0;
		let lastReach = 0;

		const handlePointerDown = (event: PointerEvent) => {
			dragging = true;
			lastX = event.clientX;
			lastY = event.clientY;
			host.setPointerCapture?.(event.pointerId);
		};
		const handlePointerMove = (event: PointerEvent) => {
			if (!dragging) {
				return;
			}
			yaw -= (event.clientX - lastX) * 0.008;
			pitch = Math.max(-1.45, Math.min(1.45, pitch + (event.clientY - lastY) * 0.008));
			lastX = event.clientX;
			lastY = event.clientY;
		};
		const handlePointerUp = () => {
			dragging = false;
		};
		const handleWheel = (event: WheelEvent) => {
			event.preventDefault();
			distance = Math.max(0.5, Math.min(100, distance * Math.exp(event.deltaY * 0.001)));
		};
		host.addEventListener('pointerdown', handlePointerDown);
		host.addEventListener('pointermove', handlePointerMove);
		host.addEventListener('pointerup', handlePointerUp);
		host.addEventListener('pointercancel', handlePointerUp);
		host.addEventListener('wheel', handleWheel, { passive: false });

		const update = () => {
			const { joints: chain, q: values, target: goal } = sceneState;
			const reach = chainReach(chain);
			if (Math.abs(reach - lastReach) > 1e-6) {
				lastReach = reach;
				distance = reach * 2.6 + 1;
				scene.remove(grid);
				grid.dispose();
				const size = Math.max(2, Math.ceil(reach * 2.5));
				grid = new THREE.GridHelper(size, size * 2, SCENE_COLORS.gridMajor, SCENE_COLORS.gridMinor);
				scene.add(grid);
				axes.scale.setScalar(Math.max(reach * 0.25, 0.2));
			}
			const radius = Math.max(reach * 0.022, 0.015);
			const statusColor = SCENE_COLORS.status[sceneState.status];
			linkMaterial.color.setHex(statusColor);
			effectorMaterial.emissive.setHex(statusColor);

			const frames = forwardKinematics(chain, values);
			ensureCount(chain.length);
			chain.forEach((joint, index) => {
				const origin = framePosition(frames[index]);
				const z = frameAxis(frames[index], 2);
				const next = framePosition(frames[index + 1]);
				const d = joint.type === 'prismatic' ? joint.d + (values[index] ?? 0) : joint.d;
				const elbow: TVec3 = [origin[0] + z[0] * d, origin[1] + z[1] * d, origin[2] + z[2] * d];
				placeRod(offsetRods[index], origin, elbow, radius);
				placeRod(linkRods[index], elbow, next, radius);

				// Joint axis drawn along z_{i-1}, centred on the joint.
				const half = radius * 3;
				placeRod(
					jointMeshes[index],
					[origin[0] - z[0] * half, origin[1] - z[1] * half, origin[2] - z[2] * half],
					[origin[0] + z[0] * half, origin[1] + z[1] * half, origin[2] + z[2] * half],
					radius * 2.2
				);
				const slider = prismaticMeshes[index];
				slider.visible = joint.type === 'prismatic';
				if (slider.visible) {
					const center = toThree(elbow);
					slider.position.set(center[0], center[1], center[2]);
					slider.scale.setScalar(radius * 3.2);
				}
			});

			const end = toThree(framePosition(frames[frames.length - 1]));
			effector.position.set(end[0], end[1], end[2]);
			effector.scale.setScalar(radius * 2.4);

			const goalPoint = toThree(goal);
			targetMarker.position.set(goalPoint[0], goalPoint[1], goalPoint[2]);
			targetMarker.scale.setScalar(radius * 3.4);
			targetMaterial.color.setHex(
				sceneState.reached ? SCENE_COLORS.target : SCENE_COLORS.targetMissed
			);

			const lost = sceneState.lostDirection;
			const lostLength = lost ? Math.hypot(lost[0], lost[1], lost[2]) : 0;
			if (lost && lostLength > 1e-3 && sceneState.status !== 'regular') {
				const endPoint = framePosition(frames[frames.length - 1]);
				const scale = (reach * 0.35) / lostLength;
				placeRod(
					lostArrow,
					endPoint,
					[
						endPoint[0] + lost[0] * scale,
						endPoint[1] + lost[1] * scale,
						endPoint[2] + lost[2] * scale
					],
					radius * 0.6
				);
			} else {
				lostArrow.visible = false;
			}

			const lookY = reach * 0.3;
			camera.position.set(
				distance * Math.cos(pitch) * Math.cos(yaw),
				lookY + distance * Math.sin(pitch),
				distance * Math.cos(pitch) * Math.sin(yaw)
			);
			camera.lookAt(0, lookY, 0);
		};

		const dispose = () => {
			host.removeEventListener('pointerdown', handlePointerDown);
			host.removeEventListener('pointermove', handlePointerMove);
			host.removeEventListener('pointerup', handlePointerUp);
			host.removeEventListener('pointercancel', handlePointerUp);
			host.removeEventListener('wheel', handleWheel);
			[
				cylinder,
				sphere,
				box,
				linkMaterial,
				jointMaterial,
				prismaticMaterial,
				effectorMaterial,
				targetMaterial,
				lostMaterial,
				grid,
				axes
			].forEach((resource) => resource.dispose());
		};

		return { update, dispose };
	};
</script>

<div class={styles.ikScene} data-status={sceneStatus}>
	<ThreeCanvas
		{setup}
		cameraFov={45}
		cameraNear={0.01}
		label="3D view of the robot arm. Drag to orbit, scroll to zoom."
		onStatusChange={(next) => (sceneStatus = next)}
	/>
	{#if sceneStatus === 'loading'}
		<p class={styles.notice} role="status">Loading 3D view…</p>
	{:else if sceneStatus === 'error'}
		<p class={styles.error} role="status">The 3D view could not be loaded.</p>
	{/if}
	<p class={styles.hint}>Drag to orbit · scroll to zoom</p>
</div>
