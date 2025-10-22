import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const IMESSAGE_API = 'http://localhost:3001/api/v1/imessage';

export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${IMESSAGE_API}/status`);
		const data = await response.json();

		return json({
			isRunning: data.success,
			messagesProcessed: data.totalMessages || 0,
			lastActivity: new Date().toISOString()
		});
	} catch (error) {
		console.error('Failed to fetch iMessage status:', error);
		return json({
			isRunning: false,
			messagesProcessed: 0,
			lastActivity: null
		});
	}
};
