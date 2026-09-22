<script lang="ts">
	import styles from './TodoList.module.scss';
	import TodoInput from '@/features/todo/components/TodoInput/TodoInput.svelte';
	import TodoItem from '@/features/todo/components/TodoItem/TodoItem.svelte';
	import { TODO_EMPTY_MESSAGE, TODO_TITLE } from '@/features/todo/constants';
	import { todoStore } from '@/features/todo/stores/todoStore';
</script>

<section class={styles.todoList}>
	<h2 class={styles.title}>{TODO_TITLE}</h2>
	<TodoInput onAdd={todoStore.add} />
	{#if $todoStore.length === 0}
		<p class={styles.empty}>{TODO_EMPTY_MESSAGE}</p>
	{:else}
		<ul class={styles.list}>
			{#each $todoStore as todo (todo.id)}
				<TodoItem {todo} onToggle={todoStore.toggle} />
			{/each}
		</ul>
	{/if}
</section>
