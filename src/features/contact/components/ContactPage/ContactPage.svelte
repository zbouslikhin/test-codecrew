<script lang="ts">
	import styles from './ContactPage.module.scss';
	import { CONTACT_LIMITS, EMAIL_PATTERN, EMPTY_CONTACT_FORM } from '@/features/contact/constants';
	import { submitContactMessage } from '@/features/contact/http/contactApi';
	import type {
		TContactErrors,
		TContactField,
		TContactForm,
		TContactStatus
	} from '@/features/contact/types';

	let draft: TContactForm = $state({ ...EMPTY_CONTACT_FORM });
	let errors: TContactErrors = $state({});
	let status: TContactStatus = $state('idle');
	let touched = $state(false);

	const validate = (form: TContactForm): TContactErrors => {
		const result: TContactErrors = {};
		const name = form.name.trim();
		const email = form.email.trim();
		const subject = form.subject.trim();
		const message = form.message.trim();

		if (!name) {
			result.name = 'Please enter your name.';
		} else if (name.length > CONTACT_LIMITS.nameMax) {
			result.name = `Name must be at most ${CONTACT_LIMITS.nameMax} characters.`;
		}

		if (!email) {
			result.email = 'Please enter your email address.';
		} else if (!EMAIL_PATTERN.test(email)) {
			result.email = 'Please enter a valid email address.';
		}

		if (subject.length > CONTACT_LIMITS.subjectMax) {
			result.subject = `Subject must be at most ${CONTACT_LIMITS.subjectMax} characters.`;
		}

		if (!message) {
			result.message = 'Please enter a message.';
		} else if (message.length < CONTACT_LIMITS.messageMin) {
			result.message = `Message must be at least ${CONTACT_LIMITS.messageMin} characters.`;
		} else if (message.length > CONTACT_LIMITS.messageMax) {
			result.message = `Message must be at most ${CONTACT_LIMITS.messageMax} characters.`;
		}

		return result;
	};

	const errorId = (field: TContactField): string => `contact-${field}-error`;

	const handleInput = () => {
		if (status === 'success' || status === 'error') {
			status = 'idle';
		}
		if (touched) {
			errors = validate(draft);
		}
	};

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		if (status === 'submitting') {
			return;
		}
		touched = true;
		errors = validate(draft);
		if (Object.keys(errors).length > 0) {
			return;
		}

		status = 'submitting';
		try {
			await submitContactMessage({
				name: draft.name.trim(),
				email: draft.email.trim(),
				subject: draft.subject.trim(),
				message: draft.message.trim()
			});
			draft = { ...EMPTY_CONTACT_FORM };
			errors = {};
			touched = false;
			status = 'success';
		} catch {
			status = 'error';
		}
	};
</script>

<section class={styles.contactPage}>
	<h1 class={styles.title}>Contact</h1>
	<p class={styles.intro}>Have a question or feedback? Send us a message.</p>

	<form class={styles.form} novalidate onsubmit={handleSubmit} oninput={handleInput}>
		<label class={styles.field}>
			<span class={styles.label}>Name</span>
			<input
				class={styles.input}
				type="text"
				name="name"
				autocomplete="name"
				maxlength={CONTACT_LIMITS.nameMax}
				placeholder="Your name"
				aria-invalid={errors.name ? 'true' : undefined}
				aria-describedby={errors.name ? errorId('name') : undefined}
				bind:value={draft.name}
			/>
			{#if errors.name}
				<span id={errorId('name')} class={styles.error}>{errors.name}</span>
			{/if}
		</label>

		<label class={styles.field}>
			<span class={styles.label}>Email</span>
			<input
				class={styles.input}
				type="email"
				name="email"
				autocomplete="email"
				placeholder="you@example.com"
				aria-invalid={errors.email ? 'true' : undefined}
				aria-describedby={errors.email ? errorId('email') : undefined}
				bind:value={draft.email}
			/>
			{#if errors.email}
				<span id={errorId('email')} class={styles.error}>{errors.email}</span>
			{/if}
		</label>

		<label class={styles.field}>
			<span class={styles.label}>Subject <span class={styles.optional}>(optional)</span></span>
			<input
				class={styles.input}
				type="text"
				name="subject"
				maxlength={CONTACT_LIMITS.subjectMax}
				placeholder="What is this about?"
				aria-invalid={errors.subject ? 'true' : undefined}
				aria-describedby={errors.subject ? errorId('subject') : undefined}
				bind:value={draft.subject}
			/>
			{#if errors.subject}
				<span id={errorId('subject')} class={styles.error}>{errors.subject}</span>
			{/if}
		</label>

		<label class={styles.field}>
			<span class={styles.label}>Message</span>
			<textarea
				class={styles.textarea}
				name="message"
				rows="6"
				maxlength={CONTACT_LIMITS.messageMax}
				placeholder="Write your message…"
				aria-invalid={errors.message ? 'true' : undefined}
				aria-describedby={errors.message ? errorId('message') : undefined}
				bind:value={draft.message}></textarea>
			<span class={styles.hint}>
				{draft.message.length}/{CONTACT_LIMITS.messageMax}
			</span>
			{#if errors.message}
				<span id={errorId('message')} class={styles.error}>{errors.message}</span>
			{/if}
		</label>

		<div class={styles.actions}>
			<button class={styles.primary} type="submit" disabled={status === 'submitting'}>
				{status === 'submitting' ? 'Sending…' : 'Send message'}
			</button>
		</div>

		{#if status === 'success'}
			<p class={styles.status} role="status">Thanks! Your message has been sent.</p>
		{:else if status === 'error'}
			<p class={styles.failure} role="alert">
				Sorry, your message could not be sent. Please try again.
			</p>
		{/if}
	</form>
</section>
