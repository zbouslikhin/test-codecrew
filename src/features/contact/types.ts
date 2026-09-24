export type TContactForm = {
	name: string;
	email: string;
	subject: string;
	message: string;
};

export type TContactField = keyof TContactForm;

export type TContactErrors = Partial<Record<TContactField, string>>;

export type TContactStatus = 'idle' | 'submitting' | 'success' | 'error';

export type TContactSubmitResult = {
	id: string;
	receivedAt: string;
};
