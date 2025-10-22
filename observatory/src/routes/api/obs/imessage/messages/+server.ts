import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const IMESSAGE_API = 'http://localhost:3001/api/v1/imessage';

export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${IMESSAGE_API}/recent?limit=50`);
		const data = await response.json();

		if (!data.success) {
			throw new Error('Failed to fetch messages');
		}

		// Transform to Observatory format
		const messages = data.messages.map((msg: any) => ({
			id: msg.id.toString(),
			from: msg.handle || 'Unknown',
			text: msg.text,
			timestamp: msg.date,
			isFromMe: msg.isFromMe,
			routing: {
				intent: msg.isFromMe ? 'outbound' : 'inbound',
				action: msg.isFromMe ? 'sent' : 'received'
			}
		}));

		return json({ messages });
	} catch (error) {
		console.error('Failed to fetch iMessage messages:', error);
		return json({ messages: [] });
	}
};
