import type { TContactForm } from '@/features/contact/types';

export const EMPTY_CONTACT_FORM: TContactForm = {
	name: '',
	email: '',
	subject: '',
	message: ''
};

export const CONTACT_LIMITS = {
	nameMax: 100,
	subjectMax: 150,
	messageMin: 10,
	messageMax: 2000
} as const;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTACT_SUBMIT_DELAY_MS = 600;
