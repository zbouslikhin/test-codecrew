import { CONTACT_SUBMIT_DELAY_MS } from '@/features/contact/constants';
import type { TContactForm, TContactSubmitResult } from '@/features/contact/types';

/**
 * Submits a contact message.
 *
 * There is no backend yet, so this simulates a network request. Replace the
 * body with a real `fetch` call once an endpoint is available; the signature
 * is intended to stay the same.
 */
export const submitContactMessage = (form: TContactForm): Promise<TContactSubmitResult> =>
	new Promise((resolve, reject) => {
		setTimeout(() => {
			if (!form.email || !form.message) {
				reject(new Error('Invalid contact message.'));
				return;
			}
			resolve({
				id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
				receivedAt: new Date().toISOString()
			});
		}, CONTACT_SUBMIT_DELAY_MS);
	});
