/**
 * Database Setup Script
 * Run this to initialize the Observatory database with schema and seed data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing Supabase credentials in .env file');
	console.error('Required: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
	console.log('🚀 Starting database setup...\n');

	// Note: SQL schema should be run manually in Supabase dashboard
	// This is because Supabase JS SDK doesn't support raw SQL execution for security
	console.log('📝 Step 1: Run SQL Schema');
	console.log('   Please run the supabase-schema.sql file in your Supabase dashboard');
	console.log('   SQL Editor -> New Query -> Paste the schema');
	console.log('   File location: ../supabase-schema.sql\n');

	console.log('⏳ Press Enter when you\'ve run the schema...');
	// Wait for user input (in Node environment)
	await new Promise((resolve) => {
		if (typeof process !== 'undefined' && process.stdin) {
			process.stdin.once('data', resolve);
		} else {
			resolve(null);
		}
	});

	// Seed initial data
	console.log('\n🌱 Step 2: Seeding database with initial data...\n');

	try {
		// Seed business metrics
		console.log('📊 Seeding business metrics...');
		const metrics = [
			// Marketing
			{ module: 'marketing', metric_name: 'posts_today', metric_value: 8, unit: 'count' },
			{ module: 'marketing', metric_name: 'engagement_rate', metric_value: 12.4, unit: 'percentage' },
			{ module: 'marketing', metric_name: 'total_reach', metric_value: 4200, unit: 'count' },
			{ module: 'marketing', metric_name: 'campaigns_active', metric_value: 3, unit: 'count' },
			// Sales
			{ module: 'sales', metric_name: 'leads_today', metric_value: 12, unit: 'count' },
			{ module: 'sales', metric_name: 'qualified', metric_value: 8, unit: 'count' },
			{ module: 'sales', metric_name: 'conversion_rate', metric_value: 4.2, unit: 'percentage' },
			{ module: 'sales', metric_name: 'pipeline_value', metric_value: 24500, unit: 'dollars' },
			// Operations
			{ module: 'operations', metric_name: 'tasks_completed', metric_value: 127, unit: 'count' },
			{ module: 'operations', metric_name: 'success_rate', metric_value: 98.4, unit: 'percentage' },
			{ module: 'operations', metric_name: 'system_health', metric_value: 100, unit: 'percentage' },
			{ module: 'operations', metric_name: 'data_syncs', metric_value: 24, unit: 'count' },
			// Support
			{ module: 'support', metric_name: 'tickets_today', metric_value: 15, unit: 'count' },
			{ module: 'support', metric_name: 'resolved', metric_value: 12, unit: 'count' },
			{ module: 'support', metric_name: 'avg_response', metric_value: 8, unit: 'minutes' },
			{ module: 'support', metric_name: 'satisfaction', metric_value: 94, unit: 'percentage' }
		];

		for (const metric of metrics) {
			const { error } = await supabase.from('business_metrics').upsert(metric);
			if (error) throw error;
		}
		console.log('   ✅ Business metrics seeded');

		// Seed events
		console.log('📝 Seeding sample events...');
		const events = [
			{
				type: 'agent.task.completed',
				agent: 'Marketing Agent',
				description: 'Posted to Twitter: "Check out our new MIDI editor!"',
				severity: 'info',
				metadata: { platform: 'twitter' }
			},
			{
				type: 'agent.task.completed',
				agent: 'Sales Agent',
				description: 'Qualified 3 new leads from website signup',
				severity: 'info'
			},
			{
				type: 'agent.task.completed',
				agent: 'Support Agent',
				description: 'Resolved ticket #847 - billing question',
				severity: 'success'
			},
			{
				type: 'system.health.check',
				agent: 'Operations Agent',
				description: 'System health check completed',
				severity: 'info'
			}
		];

		const { error: eventsError } = await supabase.from('events').insert(events);
		if (eventsError) throw eventsError;
		console.log('   ✅ Sample events seeded');

		// Seed agent runs
		console.log('🤖 Seeding agent runs...');
		const agentRuns = [
			{
				agent_id: 'marketing',
				agent_name: 'Marketing Agent',
				task_type: 'social_post',
				task_description: 'Create social media post',
				status: 'completed',
				started_at: new Date(Date.now() - 300000).toISOString(),
				completed_at: new Date().toISOString(),
				duration_ms: 2300
			},
			{
				agent_id: 'sales',
				agent_name: 'Sales Agent',
				task_type: 'lead_qualification',
				task_description: 'Qualify lead from form submission',
				status: 'completed',
				started_at: new Date(Date.now() - 480000).toISOString(),
				completed_at: new Date(Date.now() - 478200).toISOString(),
				duration_ms: 1800
			}
		];

		const { error: runsError } = await supabase.from('agent_runs').insert(agentRuns);
		if (runsError) throw runsError;
		console.log('   ✅ Agent runs seeded');

		console.log('\n✅ Database setup complete!');
		console.log('\n📊 Next steps:');
		console.log('   1. Copy .env.example to .env');
		console.log('   2. Add your Supabase credentials to .env');
		console.log('   3. Run: npm run dev');
		console.log('   4. Visit: http://localhost:5175\n');
	} catch (error) {
		console.error('❌ Error seeding database:', error);
		process.exit(1);
	}
}

setupDatabase();
