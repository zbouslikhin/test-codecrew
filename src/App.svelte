<script lang="ts">
	import Greeting from '@/features/welcome/components/Greeting/Greeting.svelte';
	import TodoList from '@/features/todo/components/TodoList/TodoList.svelte';
	import { DEFAULT_GREETING } from '@/features/welcome';
</script>

<main>
	<Greeting greeting={DEFAULT_GREETING} />
	<TodoList />
</main>
