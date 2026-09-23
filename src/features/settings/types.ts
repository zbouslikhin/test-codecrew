export type TTheme = 'system' | 'light' | 'dark';

export type TResolvedTheme = Exclude<TTheme, 'system'>;

export type TThemeOption = {
	value: TTheme;
	label: string;
};

export type TSettings = {
	displayName: string;
	theme: TTheme;
	notificationsEnabled: boolean;
};
