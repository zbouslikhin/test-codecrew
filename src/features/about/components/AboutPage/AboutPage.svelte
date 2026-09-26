<script lang="ts">
	import styles from './AboutPage.module.scss';
	import { ABOUT_CONTENT } from '@/features/about/constants';
	import type { TAboutContent } from '@/features/about/types';

	let { content = ABOUT_CONTENT }: { content?: TAboutContent } = $props();
</script>

<section class={styles.aboutPage}>
	<h1 class={styles.title}>{content.title}</h1>
	<p class={styles.intro}>{content.intro}</p>

	<div class={styles.section}>
		<h2 class={styles.heading}>{content.capabilitiesHeading}</h2>
		<ul class={styles.capabilities}>
			{#each content.capabilities as capability (capability.id)}
				<li class={styles.capability}>
					<h3 class={styles.capabilityName}>{capability.name}</h3>
					<p class={styles.body}>{capability.description}</p>
					<a class={styles.capabilityLink} href={capability.href}>{capability.linkLabel}</a>
				</li>
			{/each}
		</ul>
	</div>

	{#each content.sections as section (section.id)}
		<div class={styles.section}>
			<h2 class={styles.heading}>{section.heading}</h2>
			<p class={styles.body}>{section.body}</p>
		</div>
	{/each}
</section>
