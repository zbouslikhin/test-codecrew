<script lang="ts">
	import Greeting from '@/features/welcome/components/Greeting/Greeting.svelte';
	import SettingsPage from '@/features/settings/components/SettingsPage/SettingsPage.svelte';
	import AboutPage from '@/features/about/components/AboutPage/AboutPage.svelte';
	import ThemeToggle from '@/features/settings/components/ThemeToggle/ThemeToggle.svelte';
	import { syncThemeToDocument } from '@/features/settings';
	import { DEFAULT_GREETING } from '@/features/welcome';

	$effect(() => syncThemeToDocument());

	type TPage = 'home' | 'settings' | 'about';

	const readPage = (): TPage => {
		switch (window.location.hash) {
			case '#/settings':
				return 'settings';
			case '#/about':
				return 'about';
			default:
				return 'home';
		}
	};

	let page: TPage = $state(readPage());

	$effect(() => {
		const handleHashChange = () => {
			page = readPage();
		};
		window.addEventListener('hashchange', handleHashChange);
		return () => window.removeEventListener('hashchange', handleHashChange);
	});
</script>

<nav>
	<a href="#/" aria-current={page === 'home' ? 'page' : undefined}>Home</a>
	<a href="#/settings" aria-current={page === 'settings' ? 'page' : undefined}>Settings</a>
	<a href="#/about" aria-current={page === 'about' ? 'page' : undefined}>About</a>
	<ThemeToggle />
</nav>

<main>
	{#if page === 'settings'}
		<SettingsPage />
	{:else if page === 'about'}
		<AboutPage />
	{:else}
		<Greeting greeting={DEFAULT_GREETING} />
	{/if}
</main>
