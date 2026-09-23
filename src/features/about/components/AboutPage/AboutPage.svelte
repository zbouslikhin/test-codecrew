<script lang="ts">
	import styles from './AboutPage.module.scss';
	import { ABOUT_CONTENT } from '@/features/about/constants';
	import type { TAboutContent } from '@/features/about/types';

	let { content = ABOUT_CONTENT }: { content?: TAboutContent } = $props();
</script>

<section class={styles.aboutPage}>
	<h1 class={styles.title}>{content.title}</h1>
	<p class={styles.intro}>{content.intro}</p>

	{#each content.sections as section (section.id)}
		<div class={styles.section}>
			<h2 class={styles.heading}>{section.heading}</h2>
			<p class={styles.body}>{section.body}</p>
		</div>
	{/each}
</section>
