import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRecentEvents } from '$lib/supabase';

export const GET: RequestHandler = async ({ url }) => {
	const filter = url.searchParams.get('filter') || 'all';
	const search = url.searchParams.get('search') || '';

	// Fetch events from Supabase
	const allEvents = await getRecentEvents(100);

	// Apply filters
	let events = allEvents;

	if (filter !== 'all') {
		events = events.filter((e) => e.type.includes(filter) || e.severity === filter);
	}

	if (search) {
		events = events.filter((e) => e.description.toLowerCase().includes(search.toLowerCase()));
	}

	return json({ events });
};
