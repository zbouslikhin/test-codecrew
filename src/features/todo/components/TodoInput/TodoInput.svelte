<script lang="ts">
	import styles from './TodoInput.module.scss';
	import { TODO_ADD_LABEL, TODO_INPUT_PLACEHOLDER } from '@/features/todo/constants';

	let { onAdd }: { onAdd: (text: string) => void } = $props();

	let text = $state('');

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		if (!text.trim()) return;
		onAdd(text);
		text = '';
	};
</script>

<form class={styles.form} onsubmit={handleSubmit}>
	<input
		class={styles.input}
		type="text"
		placeholder={TODO_INPUT_PLACEHOLDER}
		aria-label={TODO_INPUT_PLACEHOLDER}
		bind:value={text}
	/>
	<button class={styles.button} type="submit" disabled={!text.trim()}>{TODO_ADD_LABEL}</button>
</form>
