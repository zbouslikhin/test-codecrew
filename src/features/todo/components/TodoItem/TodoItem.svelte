<script lang="ts">
	import styles from './TodoItem.module.scss';
	import type { TTodo } from '@/features/todo/types';

	let { todo, onToggle }: { todo: TTodo; onToggle: (id: number) => void } = $props();
</script>

<li class={styles.item}>
	<label class={styles.label}>
		<input
			class={styles.checkbox}
			type="checkbox"
			checked={todo.done}
			onchange={() => onToggle(todo.id)}
		/>
		<span class={todo.done ? `${styles.text} ${styles.done}` : styles.text}>{todo.text}</span>
	</label>
</li>
