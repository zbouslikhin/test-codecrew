<script lang="ts">
	import styles from './SingularityPanel.module.scss';
	import { STATUS_COPY } from '@/features/ik/constants';
	import type { TJacobianAnalysis, TMatrix } from '@/types/kinematics';
	import { formatNumber } from '@/utils/formatNumber';

	let {
		analysis,
		jacobian,
		inverse
	}: {
		analysis: TJacobianAnalysis;
		jacobian: TMatrix;
		/** J⁻¹ (square) or J⁺ (non-square); undefined when J is singular. */
		inverse?: TMatrix;
	} = $props();

	const copy = $derived(STATUS_COPY[analysis.status]);
	const isSquare = $derived(analysis.rows === analysis.columns);
	const inverseLabel = $derived(isSquare ? 'J⁻¹' : 'J⁺ (pseudo-inverse)');
</script>

<section class={styles.singularityPanel} data-status={analysis.status} aria-live="polite">
	<h2 class={styles.heading}>Jacobian &amp; singularity</h2>
	<p class={styles.badge}>
		<strong>{copy.label}</strong>
		<span>{copy.description}</span>
	</p>

	<dl class={styles.metrics}>
		<div>
			<dt>Size</dt>
			<dd>{analysis.rows} × {analysis.columns}</dd>
		</div>
		<div>
			<dt>Rank</dt>
			<dd>{analysis.rank} / {analysis.genericRank}</dd>
		</div>
		<div>
			<dt>σmin</dt>
			<dd>{formatNumber(analysis.sigmaMin)}</dd>
		</div>
		<div>
			<dt>σmax</dt>
			<dd>{formatNumber(analysis.sigmaMax)}</dd>
		</div>
		<div>
			<dt>‖{isSquare ? 'J⁻¹' : 'J⁺'}‖₂</dt>
			<dd>{formatNumber(analysis.inverseNorm)}</dd>
		</div>
		<div>
			<dt>Condition κ</dt>
			<dd>{formatNumber(analysis.condition, 1)}</dd>
		</div>
		<div>
			<dt>Manipulability</dt>
			<dd>{formatNumber(analysis.manipulability, 4)}</dd>
		</div>
		{#if analysis.determinant !== undefined}
			<div>
				<dt>det J</dt>
				<dd>{formatNumber(analysis.determinant, 4)}</dd>
			</div>
		{/if}
	</dl>

	{#if analysis.genericRank < Math.min(analysis.rows, analysis.columns)}
		<p class={styles.note}>
			This chain can reach at most rank {analysis.genericRank} for this task, so only the first
			{analysis.genericRank} singular values are used to detect singularities.
		</p>
	{/if}
	{#if analysis.lostDirection && analysis.status === 'singular'}
		<p class={styles.note}>
			Lost task direction: [{analysis.lostDirection
				.map((value) => formatNumber(value, 2))
				.join(', ')}] (drawn in red at the end effector).
		</p>
	{/if}

	<details class={styles.details}>
		<summary>Singular values</summary>
		<p class={styles.mono}>
			{analysis.singularValues.map((value) => formatNumber(value)).join('  ')}
		</p>
	</details>

	<details class={styles.details}>
		<summary>Jacobian J</summary>
		<table class={styles.matrix}>
			<tbody>
				{#each jacobian as row, rowIndex (rowIndex)}
					<tr>
						{#each row as value, columnIndex (columnIndex)}
							<td>{formatNumber(value)}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</details>

	<details class={styles.details}>
		<summary>Inverse Jacobian {inverseLabel}</summary>
		{#if inverse}
			<table class={styles.matrix}>
				<tbody>
					{#each inverse as row, rowIndex (rowIndex)}
						<tr>
							{#each row as value, columnIndex (columnIndex)}
								<td>{formatNumber(value)}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class={styles.note}>Does not exist at this configuration: σmin ≈ 0, so 1/σmin diverges.</p>
		{/if}
	</details>
</section>
