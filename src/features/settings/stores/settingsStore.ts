import { writable } from 'svelte/store';
import {
	DEFAULT_SETTINGS,
	SETTINGS_STORAGE_KEY,
	THEME_OPTIONS
} from '@/features/settings/constants';
import type { TSettings, TTheme } from '@/features/settings/types';

const isTheme = (value: unknown): value is TTheme =>
	THEME_OPTIONS.some((option) => option.value === value);

const loadSettings = (): TSettings => {
	if (typeof localStorage === 'undefined') {
		return { ...DEFAULT_SETTINGS };
	}
	try {
		const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (!raw) {
			return { ...DEFAULT_SETTINGS };
		}
		const parsed: Partial<TSettings> = JSON.parse(raw);
		return {
			displayName:
				typeof parsed.displayName === 'string' ? parsed.displayName : DEFAULT_SETTINGS.displayName,
			theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
			notificationsEnabled:
				typeof parsed.notificationsEnabled === 'boolean'
					? parsed.notificationsEnabled
					: DEFAULT_SETTINGS.notificationsEnabled
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
};

const persistSettings = (settings: TSettings): void => {
	if (typeof localStorage === 'undefined') {
		return;
	}
	try {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// Storage may be unavailable (e.g. private mode); ignore.
	}
};

const createSettingsStore = () => {
	const { subscribe, set } = writable<TSettings>(loadSettings());

	return {
		subscribe,
		save: (settings: TSettings): void => {
			const next = { ...settings };
			persistSettings(next);
			set(next);
		},
		reset: (): void => {
			const next = { ...DEFAULT_SETTINGS };
			persistSettings(next);
			set(next);
		}
	};
};

export const settingsStore = createSettingsStore();
