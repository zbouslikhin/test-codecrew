export type TTheme = 'system' | 'light' | 'dark';

export type TThemeOption = {
	value: TTheme;
	label: string;
};

export type TSettings = {
	displayName: string;
	theme: TTheme;
	notificationsEnabled: boolean;
};
