<script lang="ts">
	import styles from './HomePage.module.scss';
	import RobotShowerScene from '@/features/home/components/RobotShowerScene/RobotShowerScene.svelte';
	import { HOME_HERO } from '@/features/home/constants';
	import type { THomeHero, TSceneStatus } from '@/features/home/types';

	let { hero = HOME_HERO }: { hero?: THomeHero } = $props();

	let status: TSceneStatus = $state('loading');
</script>

<section class={styles.homePage} data-status={status}>
	<RobotShowerScene onStatusChange={(next) => (status = next)} />
	<div class={styles.hero}>
		<h1 class={styles.title}>{hero.title}</h1>
		<p class={styles.subtitle}>{hero.subtitle}</p>
		{#if status === 'error'}
			<p class={styles.notice} role="status">The 3D scene could not be loaded.</p>
		{/if}
	</div>
</section>
