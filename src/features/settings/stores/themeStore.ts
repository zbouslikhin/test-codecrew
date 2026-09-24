import { derived, readable } from 'svelte/store';
import { DARK_MODE_MEDIA_QUERY, THEME_DATA_ATTRIBUTE } from '@/features/settings/constants';
import { settingsStore } from '@/features/settings/stores/settingsStore';
import type { TResolvedTheme } from '@/features/settings/types';

const systemPrefersDark = readable(false, (set) => {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return;
	}
	const mediaQuery = window.matchMedia(DARK_MODE_MEDIA_QUERY);
	set(mediaQuery.matches);
	const handleChange = (event: MediaQueryListEvent) => set(event.matches);
	mediaQuery.addEventListener('change', handleChange);
	return () => mediaQuery.removeEventListener('change', handleChange);
});

/** The effective theme actually shown, with 'system' resolved via the OS preference. */
export const resolvedThemeStore = derived(
	[settingsStore, systemPrefersDark],
	([$settings, $systemPrefersDark]): TResolvedTheme => {
		if ($settings.theme === 'system') {
			return $systemPrefersDark ? 'dark' : 'light';
		}
		return $settings.theme;
	}
);

/** Keeps `<html data-theme="...">` in sync with the resolved theme. Returns an unsubscribe. */
export const syncThemeToDocument = (): (() => void) =>
	resolvedThemeStore.subscribe((theme) => {
		if (typeof document === 'undefined') {
			return;
		}
		document.documentElement.dataset[THEME_DATA_ATTRIBUTE] = theme;
	});
