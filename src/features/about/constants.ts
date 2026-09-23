import type { TAboutContent } from '@/features/about/types';

export const ABOUT_CONTENT: TAboutContent = {
	title: 'About',
	intro:
		'This app is a small Svelte 5 + TypeScript project built with a feature-folder architecture.',
	sections: [
		{
			id: 'purpose',
			heading: 'Purpose',
			body: 'It serves as a starting point for building features in a consistent, well-structured way.'
		},
		{
			id: 'features',
			heading: 'Features',
			body: 'Browse the home page for a greeting and use the settings page to personalise your experience.'
		},
		{
			id: 'tech',
			heading: 'Built with',
			body: 'Svelte 5, TypeScript, Vite and SCSS modules.'
		}
	]
};
