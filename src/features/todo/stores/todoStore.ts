import { writable } from 'svelte/store';
import type { TTodo } from '@/features/todo/types';

const createTodoStore = () => {
	const { subscribe, update, set } = writable<TTodo[]>([]);
	let nextId = 1;

	return {
		subscribe,
		add: (text: string) => {
			const trimmed = text.trim();
			if (!trimmed) return;
			const todo: TTodo = { id: nextId++, text: trimmed, done: false };
			update((todos) => [...todos, todo]);
		},
		toggle: (id: number) => {
			update((todos) =>
				todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
			);
		},
		reset: () => {
			nextId = 1;
			set([]);
		}
	};
};

export const todoStore = createTodoStore();
