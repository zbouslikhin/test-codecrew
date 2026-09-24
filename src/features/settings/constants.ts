import type { TSettings, TThemeOption } from '@/features/settings/types';

export const SETTINGS_STORAGE_KEY = 'my-app:settings';

export const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const THEME_DATA_ATTRIBUTE = 'theme';

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
