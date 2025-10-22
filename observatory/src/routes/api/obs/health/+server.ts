import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Mock system health - in production, check actual services
	const health = {
		dawgAI: 'online',
		jarvisAgents: 'online',
		database: 'online',
		apis: 'online'
	};

	return json(health);
};
