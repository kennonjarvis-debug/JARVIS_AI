import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDAWGAIModules } from '$lib/supabase';

export const GET: RequestHandler = async () => {
	const modules = await getDAWGAIModules();

	return json({ modules: modules.length > 0 ? modules : getDefaultModules() });
};

// Fallback data if database is not seeded
function getDefaultModules() {
	return [
		{
			id: 1,
			name: 'Design System',
			status: 'complete',
			progress: 100,
			last_update: '2025-10-15',
			issues: 0
		},
		{
			id: 2,
			name: 'Audio Engine',
			status: 'complete',
			progress: 100,
			last_update: '2025-10-15',
			issues: 0
		},
		{
			id: 3,
			name: 'Track Manager',
			status: 'complete',
			progress: 100,
			last_update: '2025-10-15',
			issues: 0
		},
		{
			id: 4,
			name: 'MIDI Editor',
			status: 'complete',
			progress: 100,
			last_update: '2025-10-15',
			issues: 0
		},
		{
			id: 5,
			name: 'Effects Processor',
			status: 'complete',
			progress: 100,
			last_update: '2025-10-15',
			issues: 0
		},
		{
			id: 6,
			name: 'Voice Interface',
			status: 'complete',
			progress: 100,
			last_update: '2025-10-15',
			issues: 0
		},
		{
			id: 7,
			name: 'AI Beat Generator',
			status: 'not-started',
			progress: 0,
			last_update: null,
			issues: 0
		},
		{
			id: 8,
			name: 'AI Vocal Coach',
			status: 'not-started',
			progress: 0,
			last_update: null,
			issues: 0
		},
		{
			id: 9,
			name: 'AI Mixing',
			status: 'not-started',
			progress: 0,
			last_update: null,
			issues: 0
		},
		{
			id: 10,
			name: 'Backend/Storage',
			status: 'complete',
			progress: 100,
			last_update: '2025-10-15',
			issues: 0
		},
		{
			id: 11,
			name: 'Integration',
			status: 'not-started',
			progress: 0,
			last_update: null,
			issues: 0
		}
	];
}
