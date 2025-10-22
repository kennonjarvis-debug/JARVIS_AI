import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const IMESSAGE_API = 'http://localhost:3001/api/v1/imessage';

export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${IMESSAGE_API}/conversations`);
		const data = await response.json();

		if (!data.success) {
			throw new Error('Failed to fetch conversations');
		}

		// Transform to Observatory format
		const conversations = data.conversations.map((conv: any) => ({
			contact: conv.identifier,
			name: conv.displayName || conv.identifier,
			lastMessage: conv.lastMessageText || 'No messages',
			messageCount: conv.messageCount,
			lastActivity: conv.lastMessageDate || new Date().toISOString(),
			isAllowed: true
		}));

		return json({ conversations });
	} catch (error) {
		console.error('Failed to fetch conversations:', error);
		return json({ conversations: [] });
	}
};
