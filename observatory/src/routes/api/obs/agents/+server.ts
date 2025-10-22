import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const agents = [
		{
			id: 'marketing',
			name: 'Marketing Agent',
			status: 'active',
			tasksToday: 12,
			successRate: 98.2,
			lastRun: '5 minutes ago',
			capabilities: ['social-posts', 'content-generation', 'email-campaigns']
		},
		{
			id: 'sales',
			name: 'Sales Agent',
			status: 'active',
			tasksToday: 8,
			successRate: 95.5,
			lastRun: '12 minutes ago',
			capabilities: ['lead-qualification', 'outreach', 'follow-ups']
		},
		{
			id: 'operations',
			name: 'Operations Agent',
			status: 'active',
			tasksToday: 24,
			successRate: 99.1,
			lastRun: '2 minutes ago',
			capabilities: ['data-sync', 'monitoring', 'analytics']
		},
		{
			id: 'support',
			name: 'Support Agent',
			status: 'active',
			tasksToday: 15,
			successRate: 97.3,
			lastRun: '8 minutes ago',
			capabilities: ['ticket-routing', 'auto-responses', 'escalation']
		}
	];

	return json({ agents });
};
