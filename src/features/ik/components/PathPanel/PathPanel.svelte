<script lang="ts">
	import styles from './PathPanel.module.scss';
	import { MAX_PATH_DURATION, MIN_PATH_DURATION } from '@/features/ik/constants';
	import type { TPathPlayback } from '@/features/ik/types';
	import type { TIkPath } from '@/types/kinematics';
	import { formatNumber } from '@/utils/formatNumber';

	let {
		path,
		playback,
		progress,
		duration,
		distance,
		canPlan,
		onPlan,
		onTogglePlay,
		onReplay,
		onClear,
		onSeek,
		onDurationChange
	}: {
		path?: TIkPath;
		playback: TPathPlayback;
		progress: number;
		/** Playback duration in seconds. */
		duration: number;
		/** Straight-line distance from the end effector to the target. */
		distance: number;
		/** False when the end effector already sits on the target. */
		canPlan: boolean;
		onPlan: () => void;
		onTogglePlay: () => void;
		onReplay: () => void;
		onClear: () => void;
		onSeek: (progress: number) => void;
		onDurationChange: (seconds: number) => void;
	} = $props();

	const reachedTarget = $derived(path ? path.result.converged : false);

	const parse = (raw: string, apply: (value: number) => void) => {
		const parsed = Number.parseFloat(raw);
		if (Number.isFinite(parsed)) {
			apply(parsed);
		}
	};
</script>

<section class={styles.pathPanel}>
	<h2 class={styles.title}>Path planning</h2>
	<p class={styles.hint}>
		Plans a straight Cartesian line from the end effector to the target and solves IK at every
		waypoint (seeded with the previous one), then plays the motion. Turn off automatic solving to
		place the target away from the end effector first.
	</p>

	<label class={styles.slider}>
		<span class={styles.label}>Duration (s)</span>
		<input
			type="range"
			min={MIN_PATH_DURATION}
			max={MAX_PATH_DURATION}
			step="0.5"
			value={duration}
			oninput={(event) => parse(event.currentTarget.value, onDurationChange)}
		/>
		<span class={styles.value}>{formatNumber(duration, 1)}</span>
	</label>

	<div class={styles.actions}>
		<button class={styles.primary} type="button" disabled={!canPlan} onclick={onPlan}>
			Plan path &amp; move
		</button>
		{#if path}
			<button class={styles.secondary} type="button" onclick={onTogglePlay}>
				{playback === 'playing' ? 'Pause' : 'Play'}
			</button>
			<button class={styles.secondary} type="button" onclick={onReplay}>Replay</button>
			<button class={styles.secondary} type="button" onclick={onClear}>Clear path</button>
		{/if}
	</div>
	{#if !canPlan && !path}
		<p class={styles.hint}>The end effector is already at the target: move the target first.</p>
	{:else if !path}
		<p class={styles.hint}>Distance to target: {formatNumber(distance)}</p>
	{/if}

	{#if path}
		<label class={styles.slider}>
			<span class={styles.label}>Progress</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.001"
				value={progress}
				oninput={(event) => parse(event.currentTarget.value, onSeek)}
			/>
			<span class={styles.value}>{Math.round(progress * 100)}%</span>
		</label>

		<dl class={styles.metrics}>
			<div>
				<dt>Waypoints</dt>
				<dd>{path.waypoints.length}</dd>
			</div>
			<div>
				<dt>Max deviation</dt>
				<dd>{formatNumber(path.maxDeviation, 4)}</dd>
			</div>
			<div>
				<dt>Near singular</dt>
				<dd>{path.nearCount}</dd>
			</div>
			<div>
				<dt>Singular</dt>
				<dd>{path.singularCount}</dd>
			</div>
		</dl>

		<p class={reachedTarget ? styles.success : styles.warning} role="status">
			{#if reachedTarget}
				Target reached along the path.
			{:else}
				The target could not be reached (outside the workspace or blocked by a singularity).
			{/if}
			{#if path.singularCount > 0}
				The path crosses {path.singularCount} singular waypoint(s): the inverse Jacobian does not exist
				there, so the end effector leaves the straight line.
			{:else if path.nearCount > 0}
				The path passes close to a singularity ({path.nearCount} waypoint(s)): joint speeds peak there.
			{/if}
		</p>
		<p class={styles.legend}>
			<span class={styles.swatchPlanned}></span> planned line
			<span class={styles.swatchTraced}></span> end-effector trace
			<span class={styles.swatchStart}></span> start point
		</p>
	{/if}
</section>
