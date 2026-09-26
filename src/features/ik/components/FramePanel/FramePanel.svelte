<script lang="ts">
	import styles from './FramePanel.module.scss';

	let {
		visibility,
		onToggle,
		onSetAll
	}: {
		/** One entry per DH frame: {0} (base) … {n} (end effector). */
		visibility: boolean[];
		onToggle: (index: number) => void;
		onSetAll: (visible: boolean) => void;
	} = $props();

	const last = $derived(visibility.length - 1);
	const allVisible = $derived(visibility.every(Boolean));
	const noneVisible = $derived(!visibility.some(Boolean));

	const frameLabel = (index: number): string => {
		if (index === 0) {
			return 'base';
		}
		return index === last ? `joint ${index} · end effector` : `joint ${index}`;
	};
</script>

<section class={styles.framePanel}>
	<div class={styles.header}>
		<h2 class={styles.title}>Reference frames</h2>
		<div class={styles.actions}>
			<button
				class={styles.button}
				type="button"
				disabled={allVisible}
				onclick={() => onSetAll(true)}
			>
				Show all
			</button>
			<button
				class={styles.button}
				type="button"
				disabled={noneVisible}
				onclick={() => onSetAll(false)}
			>
				Hide all
			</button>
		</div>
	</div>
	<p class={styles.hint}>
		DH frame &#123;i&#125; sits at the end of link i. Axes: <span class={styles.x}>x</span>
		<span class={styles.y}>y</span> <span class={styles.z}>z</span>.
	</p>
	<ul class={styles.list}>
		{#each visibility as visible, index (index)}
			<li>
				<label class={styles.option}>
					<input type="checkbox" checked={visible} onchange={() => onToggle(index)} />
					<span class={styles.frame}>&#123;{index}&#125;</span>
					<span class={styles.caption}>{frameLabel(index)}</span>
				</label>
			</li>
		{/each}
	</ul>
</section>
