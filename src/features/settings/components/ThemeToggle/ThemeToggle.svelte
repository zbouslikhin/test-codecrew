<script lang="ts">
	import styles from './ThemeToggle.module.scss';
	import { settingsStore } from '@/features/settings/stores/settingsStore';
	import { resolvedThemeStore } from '@/features/settings/stores/themeStore';

	const isDark = $derived($resolvedThemeStore === 'dark');
	const label = $derived(isDark ? 'Switch to light theme' : 'Switch to dark theme');

	const handleClick = () => {
		settingsStore.setTheme(isDark ? 'light' : 'dark');
	};
</script>

<button
	class={styles.themeToggle}
	type="button"
	aria-pressed={isDark}
	aria-label={label}
	title={label}
	onclick={handleClick}
>
	<span class={styles.icon} aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
	<span class={styles.text}>{isDark ? 'Light' : 'Dark'}</span>
</button>
