import type { TAboutContent } from '@/features/about/types';

export const ABOUT_CONTENT: TAboutContent = {
	title: 'About',
	intro:
		'This app puts on a 3D meteor shower of little robots and lets you set it up the way you like. Here is what you can do.',
	capabilitiesHeading: 'What you can do',
	capabilities: [
		{
			id: 'robot-shower',
			name: 'Watch the robot meteor shower',
			description:
				'The home page shows an animated 3D scene of colourful robots streaking in from every direction across a starry sky. If your system is set to reduce motion, the shower is slower and has fewer robots.',
			href: '#/',
			linkLabel: 'Go to the home page'
		},
		{
			id: 'theme',
			name: 'Switch between light and dark themes',
			description:
				'Use the theme toggle in the navigation bar to pick a light or dark theme, or follow your system setting.',
			href: '#/settings',
			linkLabel: 'Open settings'
		},
		{
			id: 'settings',
			name: 'Personalise your settings',
			description:
				'Set a display name, choose a theme and turn notifications on or off. Your settings are saved in this browser, so they are still there next time you visit.',
			href: '#/settings',
			linkLabel: 'Open settings'
		},
		{
			id: 'contact',
			name: 'Get in touch',
			description:
				'Send a message with your name, email, a subject and your question or feedback. The form checks your details before you send it.',
			href: '#/contact',
			linkLabel: 'Open the contact form'
		}
	],
	sections: [
		{
			id: 'tech',
			heading: 'Built with',
			body: 'Svelte 5, TypeScript, Vite, Three.js and SCSS modules, organised in feature folders.'
		}
	]
};
