import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	return json({ success: false, message: 'Sending not available (read-only mode)' });
};
