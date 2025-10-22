import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRecentEvents } from '$lib/supabase';

export const GET: RequestHandler = async () => {
	const events = await getRecentEvents(10);

	// Transform to match expected format
	const formattedEvents = events.map((event) => ({
		id: event.id,
		icon: getEventIcon(event.type),
		description: event.description,
		agent: event.agent,
		time: formatTimeAgo(new Date(event.timestamp))
	}));

	return json({ events: formattedEvents });
};

function getEventIcon(type: string): string {
	if (type.includes('marketing')) return '📱';
	if (type.includes('sales')) return '💰';
	if (type.includes('support')) return '💬';
	if (type.includes('operations') || type.includes('system')) return '⚙️';
	return '📝';
}

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();

	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}
