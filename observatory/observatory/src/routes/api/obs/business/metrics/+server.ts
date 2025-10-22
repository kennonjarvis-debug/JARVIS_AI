import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBusinessMetrics } from '$lib/supabase';

export const GET: RequestHandler = async () => {
	// Fetch all business metrics from Supabase
	const metrics = await getBusinessMetrics();

	// Transform into the format expected by the frontend
	const modules = {
		marketing: {
			name: 'Marketing',
			icon: '📱',
			metrics: {
				postsToday: getMetricValue(metrics, 'marketing', 'posts_today', 8),
				engagement: getMetricValue(metrics, 'marketing', 'engagement_rate', 12.4),
				reach: getMetricValue(metrics, 'marketing', 'total_reach', 4200),
				campaignsActive: getMetricValue(metrics, 'marketing', 'campaigns_active', 3)
			},
			trend: '+18%',
			status: 'active',
			lastAction: 'Posted to Twitter 5m ago'
		},
		sales: {
			name: 'Sales',
			icon: '💰',
			metrics: {
				leadsToday: getMetricValue(metrics, 'sales', 'leads_today', 12),
				qualified: getMetricValue(metrics, 'sales', 'qualified', 8),
				conversionRate: getMetricValue(metrics, 'sales', 'conversion_rate', 4.2),
				pipelineValue: getMetricValue(metrics, 'sales', 'pipeline_value', 24500)
			},
			trend: '+12%',
			status: 'active',
			lastAction: 'Qualified 3 leads 8m ago'
		},
		operations: {
			name: 'Operations',
			icon: '⚙️',
			metrics: {
				tasksCompleted: getMetricValue(metrics, 'operations', 'tasks_completed', 127),
				successRate: getMetricValue(metrics, 'operations', 'success_rate', 98.4),
				systemHealth: getMetricValue(metrics, 'operations', 'system_health', 100),
				dataSyncs: getMetricValue(metrics, 'operations', 'data_syncs', 24)
			},
			trend: '+5%',
			status: 'healthy',
			lastAction: 'Health check 2m ago'
		},
		support: {
			name: 'Customer Service',
			icon: '💬',
			metrics: {
				ticketsToday: getMetricValue(metrics, 'support', 'tickets_today', 15),
				resolved: getMetricValue(metrics, 'support', 'resolved', 12),
				avgResponse: getMetricValue(metrics, 'support', 'avg_response', 8),
				satisfaction: getMetricValue(metrics, 'support', 'satisfaction', 94)
			},
			trend: '+8%',
			status: 'active',
			lastAction: 'Resolved ticket #847 3m ago'
		}
	};

	return json({ modules });
};

// Helper function to get metric value with fallback
function getMetricValue(
	metrics: any[],
	module: string,
	metricName: string,
	fallback: number
): number {
	const metric = metrics.find((m) => m.module === module && m.metric_name === metricName);
	return metric ? parseFloat(metric.metric_value) : fallback;
}
