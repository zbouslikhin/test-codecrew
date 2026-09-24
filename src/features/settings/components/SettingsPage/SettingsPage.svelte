<script lang="ts">
	import styles from './SettingsPage.module.scss';
	import { get } from 'svelte/store';
	import { THEME_OPTIONS } from '@/features/settings/constants';
	import { settingsStore } from '@/features/settings/stores/settingsStore';
	import type { TSettings, TTheme } from '@/features/settings/types';

	let draft: TSettings = $state({ ...get(settingsStore) });
	let saved = $state(false);

	// Keep the theme choice in sync when it is changed elsewhere (e.g. the nav toggle).
	$effect(() => {
		draft.theme = $settingsStore.theme;
	});

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		settingsStore.save({ ...draft, displayName: draft.displayName.trim() });
		draft = { ...get(settingsStore) };
		saved = true;
	};

	const handleReset = () => {
		settingsStore.reset();
		draft = { ...get(settingsStore) };
		saved = true;
	};

	const handleInput = () => {
		saved = false;
	};

	// Apply (and persist) the theme immediately so the whole app switches right away,
	// instead of waiting for the form to be saved.
	const handleThemeChange = (theme: TTheme) => {
		draft.theme = theme;
		settingsStore.setTheme(theme);
	};
</script>

<section class={styles.settingsPage}>
	<h1 class={styles.title}>Settings</h1>

	<form class={styles.form} onsubmit={handleSubmit} oninput={handleInput}>
		<label class={styles.field}>
			<span class={styles.label}>Display name</span>
			<input
				class={styles.input}
				type="text"
				placeholder="Your name"
				bind:value={draft.displayName}
			/>
		</label>

		<fieldset class={styles.fieldset}>
			<legend class={styles.label}>Theme</legend>
			{#each THEME_OPTIONS as option (option.value)}
				<label class={styles.option}>
					<input
						type="radio"
						name="theme"
						value={option.value}
						checked={draft.theme === option.value}
						onchange={() => handleThemeChange(option.value)}
					/>
					{option.label}
				</label>
			{/each}
		</fieldset>

		<label class={styles.option}>
			<input type="checkbox" bind:checked={draft.notificationsEnabled} />
			Enable notifications
		</label>

		<div class={styles.actions}>
			<button class={styles.primary} type="submit">Save</button>
			<button class={styles.secondary} type="button" onclick={handleReset}>
				Reset to defaults
			</button>
		</div>

		{#if saved}
			<p class={styles.status} role="status">Settings saved.</p>
		{/if}
	</form>
</section>
