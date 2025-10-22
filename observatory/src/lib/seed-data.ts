/**
 * Seed data script for Observatory database
 * Run this once to populate the database with initial data
 */

import { supabase, logEvent, updateBusinessMetric } from './supabase';

export async function seedDatabase() {
	console.log('🌱 Seeding Observatory database...');

	// Seed business metrics
	console.log('📊 Seeding business metrics...');

	// Marketing metrics
	await updateBusinessMetric('marketing', 'posts_today', 8, 'count');
	await updateBusinessMetric('marketing', 'engagement_rate', 12.4, 'percentage');
	await updateBusinessMetric('marketing', 'total_reach', 4200, 'count');
	await updateBusinessMetric('marketing', 'campaigns_active', 3, 'count');
	await updateBusinessMetric('marketing', 'impressions', 15300, 'count');
	await updateBusinessMetric('marketing', 'clicks', 892, 'count');
	await updateBusinessMetric('marketing', 'conversions', 34, 'count');
	await updateBusinessMetric('marketing', 'ctr', 5.8, 'percentage');

	// Sales metrics
	await updateBusinessMetric('sales', 'leads_today', 12, 'count');
	await updateBusinessMetric('sales', 'qualified', 8, 'count');
	await updateBusinessMetric('sales', 'conversion_rate', 4.2, 'percentage');
	await updateBusinessMetric('sales', 'pipeline_value', 24500, 'dollars');
	await updateBusinessMetric('sales', 'deals_won', 3, 'count');
	await updateBusinessMetric('sales', 'avg_deal_size', 1247, 'dollars');
	await updateBusinessMetric('sales', 'sales_cycle', 14, 'days');
	await updateBusinessMetric('sales', 'win_rate', 68, 'percentage');

	// Operations metrics
	await updateBusinessMetric('operations', 'tasks_completed', 127, 'count');
	await updateBusinessMetric('operations', 'success_rate', 98.4, 'percentage');
	await updateBusinessMetric('operations', 'system_health', 100, 'percentage');
	await updateBusinessMetric('operations', 'data_syncs', 24, 'count');
	await updateBusinessMetric('operations', 'avg_response_time', 245, 'milliseconds');
	await updateBusinessMetric('operations', 'error_rate', 0.3, 'percentage');
	await updateBusinessMetric('operations', 'uptime', 99.8, 'percentage');
	await updateBusinessMetric('operations', 'api_calls', 2347, 'count');

	// Support metrics
	await updateBusinessMetric('support', 'tickets_today', 15, 'count');
	await updateBusinessMetric('support', 'resolved', 12, 'count');
	await updateBusinessMetric('support', 'avg_response', 8, 'minutes');
	await updateBusinessMetric('support', 'satisfaction', 94, 'percentage');
	await updateBusinessMetric('support', 'open_tickets', 3, 'count');
	await updateBusinessMetric('support', 'auto_resolved', 8, 'count');
	await updateBusinessMetric('support', 'escalated', 1, 'count');
	await updateBusinessMetric('support', 'avg_resolution_time', 24, 'hours');

	// Seed sample events
	console.log('📝 Seeding events...');

	await logEvent(
		'agent.task.completed',
		'Marketing Agent',
		'Posted to Twitter: "Check out our new MIDI editor!"',
		'info',
		{ platform: 'twitter', post_id: '123' }
	);

	await logEvent(
		'agent.task.completed',
		'Sales Agent',
		'Qualified 3 new leads from website signup',
		'info',
		{ leads: 3 }
	);

	await logEvent(
		'agent.task.completed',
		'Support Agent',
		'Resolved ticket #847 - billing question',
		'success',
		{ ticket_id: '847', category: 'billing' }
	);

	await logEvent(
		'system.health.check',
		'Operations Agent',
		'System health check completed - all systems operational',
		'info'
	);

	await logEvent(
		'agent.approval.required',
		'Sales Agent',
		'Approval required for bulk email campaign (1,500 recipients)',
		'warning',
		{ recipients: 1500, campaign: 'Q4 Launch' }
	);

	// Seed agent runs
	console.log('🤖 Seeding agent runs...');

	const agentRuns = [
		{
			agent_id: 'marketing',
			agent_name: 'Marketing Agent',
			task_type: 'social_post',
			task_description: 'Create social media post',
			status: 'completed',
			duration_ms: 2300,
			result: { post_id: '123', platform: 'twitter' }
		},
		{
			agent_id: 'sales',
			agent_name: 'Sales Agent',
			task_type: 'lead_qualification',
			task_description: 'Qualify lead from form submission',
			status: 'completed',
			duration_ms: 1800,
			result: { lead_id: '456', score: 85 }
		},
		{
			agent_id: 'support',
			agent_name: 'Support Agent',
			task_type: 'ticket_routing',
			task_description: 'Route ticket #847',
			status: 'completed',
			duration_ms: 900,
			result: { ticket_id: '847', assigned_to: 'auto' }
		},
		{
			agent_id: 'operations',
			agent_name: 'Operations Agent',
			task_type: 'health_check',
			task_description: 'System health check',
			status: 'completed',
			duration_ms: 3100,
			result: { status: 'healthy', components: 4 }
		}
	];

	for (const run of agentRuns) {
		const { error } = await supabase.from('agent_runs').insert({
			...run,
			started_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
			completed_at: new Date().toISOString()
		});

		if (error) {
			console.error('Failed to seed agent run:', error);
		}
	}

	// Seed sample approval
	console.log('✅ Seeding approvals...');

	await supabase.from('approvals').insert({
		agent_id: 'sales',
		agent_name: 'Sales Agent',
		action_type: 'bulk_email',
		action_description: 'Send bulk email campaign to 1,500 recipients',
		risk_level: 'high',
		details: {
			recipients: 1500,
			campaign: 'Q4 Launch',
			subject: 'Introducing new features'
		},
		requested_by: 'sales-agent@dawgai.com'
	});

	console.log('✅ Database seeded successfully!');
}

// Function to continuously update metrics (simulates live data)
export async function simulateLiveMetrics() {
	setInterval(async () => {
		// Randomly update some metrics to simulate live data
		const randomMetrics = [
			{
				module: 'marketing' as const,
				name: 'engagement_rate',
				delta: (Math.random() - 0.5) * 2
			},
			{ module: 'sales' as const, name: 'leads_today', delta: Math.random() > 0.7 ? 1 : 0 },
			{
				module: 'operations' as const,
				name: 'tasks_completed',
				delta: Math.floor(Math.random() * 3)
			}
		];

		for (const metric of randomMetrics) {
			// Get current value
			const { data } = await supabase
				.from('business_metrics')
				.select('metric_value')
				.eq('module', metric.module)
				.eq('metric_name', metric.name)
				.single();

			if (data) {
				const newValue = Math.max(0, data.metric_value + metric.delta);
				await updateBusinessMetric(metric.module, metric.name, newValue);
			}
		}

		// Occasionally add a new event
		if (Math.random() > 0.7) {
			const events = [
				{
					type: 'agent.task.completed',
					agent: 'Marketing Agent',
					description: 'Scheduled social media post',
					severity: 'info' as const
				},
				{
					type: 'agent.task.completed',
					agent: 'Sales Agent',
					description: 'Sent follow-up email to qualified lead',
					severity: 'info' as const
				},
				{
					type: 'system.health.check',
					agent: 'Operations Agent',
					description: 'Health check completed',
					severity: 'info' as const
				}
			];

			const randomEvent = events[Math.floor(Math.random() * events.length)];
			await logEvent(
				randomEvent.type,
				randomEvent.agent,
				randomEvent.description,
				randomEvent.severity
			);
		}
	}, 10000); // Update every 10 seconds
}
