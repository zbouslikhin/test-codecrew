import App from '@/App.svelte';
import '@/app.css';
import { syncThemeToDocument } from '@/features/settings';
import { mount } from 'svelte';

// Apply the persisted theme before the first render so the page never flashes the wrong theme.
syncThemeToDocument();

const app = mount(App, { target: document.getElementById('app')! });

export default app;
