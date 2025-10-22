import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAgentRuns } from '$lib/supabase';

export const GET: RequestHandler = async () => {
	const runs = await getAgentRuns(20);

	// Transform to match expected format
	const formattedRuns = runs.map((run) => ({
		id: run.id,
		agent: run.agent_name,
		task: run.task_description || run.task_type,
		status: run.status,
		duration: run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '-',
		time: formatTimeAgo(new Date(run.started_at))
	}));

	return json({ runs: formattedRuns });
};

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();

	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);

	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	return `${hours}h ago`;
}
