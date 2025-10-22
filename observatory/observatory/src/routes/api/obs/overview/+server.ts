import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDAWGAIModules, getPendingApprovals, getBusinessMetrics } from '$lib/supabase';

export const GET: RequestHandler = async () => {
	// Fetch data from Supabase
	const [modules, approvals, metrics] = await Promise.all([
		getDAWGAIModules(),
		getPendingApprovals(),
		getBusinessMetrics('operations')
	]);

	// Calculate DAWG AI progress
	const completedModules = modules.filter((m) => m.status === 'complete').length;
	const dawgAIProgress = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 64;

	// Get tasks completed from metrics
	const tasksMetric = metrics.find((m) => m.metric_name === 'tasks_completed');
	const totalTasks = tasksMetric ? parseInt(tasksMetric.metric_value) : 162;

	const system = {
		dawgAIProgress,
		jarvisUptime: 99.8,
		totalTasks,
		pendingApprovals: approvals.length
	};

	return json({ system });
};
