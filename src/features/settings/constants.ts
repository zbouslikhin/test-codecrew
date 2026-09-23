import type { TSettings, TThemeOption } from '@/features/settings/types';

export const SETTINGS_STORAGE_KEY = 'my-app:settings';

export const DEFAULT_SETTINGS: TSettings = {
	displayName: '',
	theme: 'system',
	notificationsEnabled: true
};

export const THEME_OPTIONS: TThemeOption[] = [
	{ value: 'system', label: 'System' },
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' }
];
