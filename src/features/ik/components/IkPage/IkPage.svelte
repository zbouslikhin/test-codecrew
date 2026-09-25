<script lang="ts">
	import { untrack } from 'svelte';
	import styles from './IkPage.module.scss';
	import DhTable from '@/features/ik/components/DhTable/DhTable.svelte';
	import IkScene from '@/features/ik/components/IkScene/IkScene.svelte';
	import SingularityPanel from '@/features/ik/components/SingularityPanel/SingularityPanel.svelte';
	import FramePanel from '@/features/ik/components/FramePanel/FramePanel.svelte';
	import PathPanel from '@/features/ik/components/PathPanel/PathPanel.svelte';
	import {
		DEFAULT_DH_JOINT,
		DEFAULT_PATH_DURATION,
		DEFAULT_PRESET_ID,
		DH_PRESETS,
		IK_PAGE_COPY,
		MAX_DOF,
		MAX_PATH_DURATION,
		MIN_DOF,
		MIN_PATH_DURATION
	} from '@/features/ik/constants';
	import type { TDhPreset, TIkPageCopy, TPathPlayback } from '@/features/ik/types';
	import type {
		TDhJoint,
		TIkOptions,
		TIkPath,
		TIkResult,
		TMatrix3,
		TTaskMode,
		TVec3
	} from '@/types/kinematics';
	import { configurationAt, planCartesianPath } from '@/utils/pathPlanning';
	import { formatNumber } from '@/utils/formatNumber';
	import {
		DEFAULT_IK_OPTIONS,
		analyzeJacobian,
		chainReach,
		degToRad,
		forwardKinematics,
		framePosition,
		frameRotation,
		genericJacobianRank,
		geometricJacobian,
		inverseJacobian,
		radToDeg,
		rotationToRpy,
		rpyToRotation,
		solveIk
	} from '@/utils/kinematics';

	let { copy = IK_PAGE_COPY }: { copy?: TIkPageCopy } = $props();

	const AXES = ['x', 'y', 'z'] as const;
	const RPY_LABELS = ['Roll', 'Pitch', 'Yaw'] as const;

	const findPreset = (id: string): TDhPreset =>
		DH_PRESETS.find((preset) => preset.id === id) ?? DH_PRESETS[0];

	const homeValues = (preset: TDhPreset): number[] =>
		preset.joints.map((joint, index) =>
			joint.type === 'revolute' ? degToRad(preset.home[index] ?? 0) : (preset.home[index] ?? 0)
		);

	const endEffector = (chain: TDhJoint[], values: number[]) => {
		const frames = forwardKinematics(chain, values);
		const end = frames[frames.length - 1];
		return { position: framePosition(end), rpy: rotationToRpy(frameRotation(end)) };
	};

	const toDegrees = (rpy: TVec3): TVec3 => [radToDeg(rpy[0]), radToDeg(rpy[1]), radToDeg(rpy[2])];

	const initialPreset = findPreset(DEFAULT_PRESET_ID);
	const initialQ = homeValues(initialPreset);
	const initialPose = endEffector(initialPreset.joints, initialQ);

	let presetId = $state(initialPreset.id);
	let joints: TDhJoint[] = $state(initialPreset.joints.map((joint) => ({ ...joint })));
	let q: number[] = $state(initialQ);
	let mode = $state<TTaskMode>('position' as TTaskMode);
	let target: TVec3 = $state(initialPose.position);
	/** Target orientation as roll/pitch/yaw in degrees (pose mode only). */
	let targetRpy: TVec3 = $state(toDegrees(initialPose.rpy));
	let autoSolve = $state(true);
	let lastResult: TIkResult | undefined = $state();

	const dof = $derived(joints.length);
	const reach = $derived(chainReach(joints));
	const genericRank = $derived(genericJacobianRank(joints, mode));
	const jacobian = $derived(geometricJacobian(joints, q, mode));
	const analysis = $derived(analyzeJacobian(joints, q, mode, genericRank, jacobian));
	const inverse = $derived(inverseJacobian(jacobian, analysis));
	const current = $derived(endEffector(joints, q));
	const positionError = $derived(
		Math.hypot(
			target[0] - current.position[0],
			target[1] - current.position[1],
			target[2] - current.position[2]
		)
	);
	const reached = $derived(positionError <= Math.max(reach * 1e-3, 1e-3));
	const targetRange = $derived(Math.ceil(reach * 1.2 * 10) / 10);

	/* ------------------------------------ Reference frames ----------------------------------- */

	/** User choices per frame; frames without a choice yet are shown. */
	let frameChoices: boolean[] = $state([]);
	/** One entry per DH frame {0} (base) … {n} (end effector). */
	const frameVisibility = $derived(
		Array.from({ length: dof + 1 }, (_, index) => frameChoices[index] ?? true)
	);

	const toggleFrame = (index: number) => {
		frameChoices = frameVisibility.map((visible, i) => (i === index ? !visible : visible));
	};

	const setAllFrames = (visible: boolean) => {
		frameChoices = frameVisibility.map(() => visible);
	};

	/* -------------------------------------- Path planning ------------------------------------ */

	let path: TIkPath | undefined = $state.raw();
	let playback: TPathPlayback = $state('idle');
	let pathProgress = $state(0);
	let pathDuration = $state(DEFAULT_PATH_DURATION);

	const canPlan = $derived(!reached || mode === 'pose');

	const clearPath = () => {
		path = undefined;
		playback = 'idle';
		pathProgress = 0;
	};

	const targetRotation = (): TMatrix3 | undefined => {
		const [roll, pitch, yaw] = targetRpy.map(degToRad);
		return mode === 'pose' ? rpyToRotation(roll, pitch, yaw) : undefined;
	};

	const ikOptions = (): TIkOptions => ({
		...DEFAULT_IK_OPTIONS,
		mode,
		positionTolerance: Math.max(reach * 1e-5, 1e-6)
	});

	const planPath = () => {
		// Always start from where the end effector is right now.
		const planned = planCartesianPath(
			$state.snapshot(joints),
			$state.snapshot(q),
			[...target],
			targetRotation(),
			ikOptions(),
			genericRank
		);
		path = planned;
		lastResult = undefined;
		pathProgress = 0;
		q = [...planned.configurations[0]];
		playback = 'playing';
	};

	const togglePlay = () => {
		if (!path) {
			return;
		}
		if (playback === 'playing') {
			playback = 'paused';
			return;
		}
		if (pathProgress >= 1) {
			pathProgress = 0;
		}
		playback = 'playing';
	};

	const replay = () => {
		pathProgress = 0;
		playback = 'playing';
	};

	const seekPath = (progress: number) => {
		if (!path) {
			return;
		}
		pathProgress = Math.min(Math.max(progress, 0), 1);
		q = configurationAt(path, pathProgress);
		playback = pathProgress >= 1 ? 'done' : 'paused';
		lastResult = pathProgress >= 1 ? path.result : undefined;
	};

	const setPathDuration = (seconds: number) => {
		pathDuration = Math.min(MAX_PATH_DURATION, Math.max(MIN_PATH_DURATION, seconds));
	};

	// Playback: advance along the planned configurations, one step per animation frame.
	$effect(() => {
		const plan = path;
		if (!plan || playback !== 'playing') {
			return;
		}
		const durationMs = pathDuration * 1000;
		const startTime = performance.now() - untrack(() => pathProgress) * durationMs;
		let frameId = 0;
		const tick = (now: number) => {
			const progress = Math.min(Math.max((now - startTime) / durationMs, 0), 1);
			pathProgress = progress;
			q = configurationAt(plan, progress);
			if (progress >= 1) {
				playback = 'done';
				lastResult = plan.result;
				return;
			}
			frameId = requestAnimationFrame(tick);
		};
		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	});

	const solve = () => {
		clearPath();
		const result = solveIk(
			$state.snapshot(joints),
			{ position: [...target], rotation: targetRotation() },
			$state.snapshot(q),
			ikOptions(),
			genericRank
		);
		lastResult = result;
		q = result.q;
	};

	const maybeSolve = () => {
		if (autoSolve) {
			solve();
		}
	};

	/** Moves the target onto the current end effector, so the arm starts at rest. */
	const syncTargetToEffector = () => {
		clearPath();
		target = [...current.position];
		targetRpy = toDegrees(current.rpy);
		lastResult = undefined;
	};

	const loadPreset = (id: string) => {
		const preset = findPreset(id);
		presetId = preset.id;
		joints = preset.joints.map((joint) => ({ ...joint }));
		q = homeValues(preset);
		syncTargetToEffector();
	};

	const setDof = (raw: string) => {
		const parsed = Math.round(Number.parseFloat(raw));
		if (!Number.isFinite(parsed)) {
			return;
		}
		const count = Math.min(MAX_DOF, Math.max(MIN_DOF, parsed));
		if (count === joints.length) {
			return;
		}
		const nextJoints = joints.slice(0, count);
		const nextQ = q.slice(0, count);
		while (nextJoints.length < count) {
			nextJoints.push({ ...DEFAULT_DH_JOINT });
			nextQ.push(0);
		}
		clearPath();
		joints = nextJoints;
		q = nextQ;
		presetId = '';
		lastResult = undefined;
	};

	const updateJoint = (index: number, joint: TDhJoint) => {
		clearPath();
		joints = joints.map((existing, i) => (i === index ? joint : existing));
		presetId = '';
		lastResult = undefined;
	};

	const setJointValue = (index: number, raw: string) => {
		const parsed = Number.parseFloat(raw);
		if (!Number.isFinite(parsed)) {
			return;
		}
		clearPath();
		const value = joints[index].type === 'revolute' ? degToRad(parsed) : parsed;
		q = q.map((existing, i) => (i === index ? value : existing));
		lastResult = undefined;
	};

	const setTarget = (axis: number, raw: string) => {
		const parsed = Number.parseFloat(raw);
		if (!Number.isFinite(parsed)) {
			return;
		}
		clearPath();
		target = target.map((value, i) => (i === axis ? parsed : value)) as TVec3;
		maybeSolve();
	};

	const setTargetRpy = (axis: number, raw: string) => {
		const parsed = Number.parseFloat(raw);
		if (!Number.isFinite(parsed)) {
			return;
		}
		clearPath();
		targetRpy = targetRpy.map((value, i) => (i === axis ? parsed : value)) as TVec3;
		maybeSolve();
	};

	const setMode = (next: TTaskMode) => {
		clearPath();
		mode = next;
		lastResult = undefined;
	};

	const round = (value: number, digits = 3): number => {
		const factor = 10 ** digits;
		return Math.round(value * factor) / factor;
	};
</script>

<section class={styles.ikPage}>
	<header class={styles.header}>
		<h1 class={styles.title}>{copy.title}</h1>
		<p class={styles.subtitle}>{copy.subtitle}</p>
	</header>

	<div class={styles.layout}>
		<div class={styles.controls}>
			<section class={styles.card}>
				<h2 class={styles.cardTitle}>Robot</h2>
				<div class={styles.row}>
					<label class={styles.field}>
						<span class={styles.label}>Preset</span>
						<select
							class={styles.input}
							value={presetId}
							onchange={(event) => loadPreset(event.currentTarget.value)}
						>
							{#if presetId === ''}
								<option value="" disabled>Custom</option>
							{/if}
							{#each DH_PRESETS as preset (preset.id)}
								<option value={preset.id}>{preset.label}</option>
							{/each}
						</select>
					</label>
					<label class={styles.field}>
						<span class={styles.label}>Degrees of freedom</span>
						<input
							class={styles.input}
							type="number"
							min={MIN_DOF}
							max={MAX_DOF}
							step="1"
							value={dof}
							onchange={(event) => setDof(event.currentTarget.value)}
						/>
					</label>
				</div>
				<DhTable {joints} onChange={updateJoint} />
			</section>

			<section class={styles.card}>
				<h2 class={styles.cardTitle}>Target</h2>
				<fieldset class={styles.fieldset}>
					<legend class={styles.label}>Task</legend>
					<label class={styles.option}>
						<input
							type="radio"
							name="ik-mode"
							checked={mode === 'position'}
							onchange={() => setMode('position')}
						/>
						Position only (3 rows in J)
					</label>
					<label class={styles.option}>
						<input
							type="radio"
							name="ik-mode"
							checked={mode === 'pose'}
							onchange={() => setMode('pose')}
						/>
						Position + orientation (6 rows in J)
					</label>
				</fieldset>

				{#each AXES as axis, index (axis)}
					<label class={styles.slider}>
						<span class={styles.label}>{axis}</span>
						<input
							type="range"
							min={-targetRange}
							max={targetRange}
							step={targetRange / 200}
							value={target[index]}
							oninput={(event) => setTarget(index, event.currentTarget.value)}
						/>
						<input
							class={styles.input}
							type="number"
							step="0.01"
							value={round(target[index])}
							onchange={(event) => setTarget(index, event.currentTarget.value)}
						/>
					</label>
				{/each}

				{#if mode === 'pose'}
					{#each RPY_LABELS as label, index (label)}
						<label class={styles.slider}>
							<span class={styles.label}>{label}</span>
							<input
								type="range"
								min="-180"
								max="180"
								step="1"
								value={targetRpy[index]}
								oninput={(event) => setTargetRpy(index, event.currentTarget.value)}
							/>
							<input
								class={styles.input}
								type="number"
								step="1"
								value={round(targetRpy[index], 1)}
								onchange={(event) => setTargetRpy(index, event.currentTarget.value)}
							/>
						</label>
					{/each}
				{/if}

				<label class={styles.option}>
					<input type="checkbox" bind:checked={autoSolve} />
					Solve automatically while the target moves
				</label>
				<div class={styles.actions}>
					<button class={styles.primary} type="button" onclick={solve}>Solve IK</button>
					<button class={styles.secondary} type="button" onclick={syncTargetToEffector}>
						Target ← end effector
					</button>
				</div>

				{#if lastResult}
					<p class={lastResult.converged ? styles.success : styles.warning} role="status">
						{lastResult.converged ? 'Converged' : 'Did not converge (target may be unreachable)'}
						in {lastResult.iterations} iterations · position error {formatNumber(
							lastResult.positionError,
							4
						)}
						{#if mode === 'pose'}
							· orientation error {formatNumber(radToDeg(lastResult.orientationError), 2)}°
						{/if}
						{#if lastResult.singularityEncountered}
							· passed near a singularity (damped least squares used)
						{/if}
					</p>
				{/if}
			</section>

			<section class={styles.card}>
				<h2 class={styles.cardTitle}>Joint values</h2>
				<p class={styles.hint}>
					Drive the joints directly (forward kinematics) to explore singular configurations.
				</p>
				{#each joints as joint, index (index)}
					{@const isRevolute = joint.type === 'revolute'}
					{@const shown = isRevolute ? radToDeg(q[index] ?? 0) : (q[index] ?? 0)}
					<label class={styles.slider}>
						<span class={styles.label}>q{index + 1} {isRevolute ? '(°)' : '(u)'}</span>
						<input
							type="range"
							min={isRevolute ? -180 : -reach}
							max={isRevolute ? 180 : reach}
							step={isRevolute ? 0.5 : reach / 200}
							value={shown}
							oninput={(event) => setJointValue(index, event.currentTarget.value)}
						/>
						<input
							class={styles.input}
							type="number"
							step={isRevolute ? 1 : 0.01}
							value={round(shown, 2)}
							onchange={(event) => setJointValue(index, event.currentTarget.value)}
						/>
					</label>
				{/each}
				<p class={styles.mono}>
					End effector: [{current.position.map((value) => formatNumber(value)).join(', ')}]
				</p>
			</section>
		</div>

		<div class={styles.visual}>
			<div class={styles.viewport}>
				<IkScene
					{joints}
					{q}
					{target}
					status={analysis.status}
					lostDirection={analysis.lostDirection}
					{reached}
					{frameVisibility}
					plannedPath={path?.waypoints ?? []}
					tracedPath={path?.traced ?? []}
					{pathProgress}
				/>
			</div>
			<PathPanel
				{path}
				{playback}
				progress={pathProgress}
				duration={pathDuration}
				distance={positionError}
				{canPlan}
				onPlan={planPath}
				onTogglePlay={togglePlay}
				onReplay={replay}
				onClear={clearPath}
				onSeek={seekPath}
				onDurationChange={setPathDuration}
			/>
			<FramePanel visibility={frameVisibility} onToggle={toggleFrame} onSetAll={setAllFrames} />
			<SingularityPanel {analysis} {jacobian} {inverse} />
		</div>
	</div>
</section>
