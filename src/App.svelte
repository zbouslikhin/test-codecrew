<script lang="ts">
	import HomePage from '@/features/home/components/HomePage/HomePage.svelte';
	import SettingsPage from '@/features/settings/components/SettingsPage/SettingsPage.svelte';
	import AboutPage from '@/features/about/components/AboutPage/AboutPage.svelte';
	import ThemeToggle from '@/features/settings/components/ThemeToggle/ThemeToggle.svelte';
	import ContactPage from '@/features/contact/components/ContactPage/ContactPage.svelte';

	type TPage = 'home' | 'settings' | 'about' | 'contact';

	const readPage = (): TPage => {
		switch (window.location.hash) {
			case '#/settings':
				return 'settings';
			case '#/about':
				return 'about';
			case '#/contact':
				return 'contact';
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
	<a href="#/contact" aria-current={page === 'contact' ? 'page' : undefined}>Contact</a>
	<ThemeToggle />
</nav>

<main>
	{#if page === 'settings'}
		<SettingsPage />
	{:else if page === 'about'}
		<AboutPage />
	{:else if page === 'contact'}
		<ContactPage />
	{:else}
		<HomePage />
	{/if}
</main>
