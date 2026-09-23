<script lang="ts">
	import Greeting from '@/features/welcome/components/Greeting/Greeting.svelte';
	import SettingsPage from '@/features/settings/components/SettingsPage/SettingsPage.svelte';
	import { DEFAULT_GREETING } from '@/features/welcome';

	type TPage = 'home' | 'settings';

	const readPage = (): TPage => (window.location.hash === '#/settings' ? 'settings' : 'home');

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
</nav>

<main>
	{#if page === 'settings'}
		<SettingsPage />
	{:else}
		<Greeting greeting={DEFAULT_GREETING} />
	{/if}
</main>
