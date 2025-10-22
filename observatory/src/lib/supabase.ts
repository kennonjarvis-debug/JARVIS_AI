import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Check if Supabase credentials are configured
const isSupabaseConfigured = PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY && PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co';

// Create Supabase client only if credentials are provided
export const supabase = isSupabaseConfigured
	? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
	: null;

// Helper to check if Supabase is available
function isSupabaseAvailable(): boolean {
	return supabase !== null;
}

// Helper function to log events
export async function logEvent(
	type: string,
	agent: string,
	description: string,
	severity: 'info' | 'success' | 'warning' | 'error' = 'info',
	metadata: Record<string, any> = {}
) {
	if (!isSupabaseAvailable()) {
		console.warn('Supabase not configured - event not logged');
		return null;
	}

	const { data, error } = await supabase!
		.from('events')
		.insert({
			type,
			agent,
			description,
			severity,
			metadata
		})
		.select()
		.single();

	if (error) {
		console.error('Failed to log event:', error);
		return null;
	}

	return data;
}

// Helper function to update business metrics
export async function updateBusinessMetric(
	module: 'marketing' | 'sales' | 'operations' | 'support',
	metricName: string,
	metricValue: number,
	unit?: string,
	metadata: Record<string, any> = {}
) {
	if (!isSupabaseAvailable()) {
		console.warn('Supabase not configured - metric not updated');
		return null;
	}

	const { data, error } = await supabase!
		.from('business_metrics')
		.upsert(
			{
				module,
				metric_name: metricName,
				metric_value: metricValue,
				unit,
				metadata,
				last_updated: new Date().toISOString()
			},
			{
				onConflict: 'module,metric_name'
			}
		)
		.select()
		.single();

	if (error) {
		console.error('Failed to update business metric:', error);
		return null;
	}

	return data;
}

// Helper to get recent events
export async function getRecentEvents(limit = 100, filter?: { type?: string; agent?: string }) {
	if (!isSupabaseAvailable()) {
		return [];
	}

	let query = supabase!
		.from('events')
		.select('*')
		.order('timestamp', { ascending: false })
		.limit(limit);

	if (filter?.type) {
		query = query.ilike('type', `%${filter.type}%`);
	}

	if (filter?.agent) {
		query = query.eq('agent', filter.agent);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Failed to get recent events:', error);
		return [];
	}

	return data || [];
}

// Helper to get business metrics
export async function getBusinessMetrics(module?: string) {
	if (!isSupabaseAvailable()) {
		return [];
	}

	let query = supabase!.from('business_metrics').select('*');

	if (module) {
		query = query.eq('module', module);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Failed to get business metrics:', error);
		return [];
	}

	return data || [];
}

// Helper to get agent runs
export async function getAgentRuns(limit = 50, agentId?: string) {
	if (!isSupabaseAvailable()) {
		return [];
	}

	let query = supabase!
		.from('agent_runs')
		.select('*')
		.order('started_at', { ascending: false })
		.limit(limit);

	if (agentId) {
		query = query.eq('agent_id', agentId);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Failed to get agent runs:', error);
		return [];
	}

	return data || [];
}

// Helper to get DAWG AI modules
export async function getDAWGAIModules() {
	if (!isSupabaseAvailable()) {
		return [];
	}

	const { data, error } = await supabase!
		.from('dawg_ai_modules')
		.select('*')
		.order('id', { ascending: true });

	if (error) {
		console.error('Failed to get DAWG AI modules:', error);
		return [];
	}

	return data || [];
}

// Helper to get pending approvals
export async function getPendingApprovals() {
	if (!isSupabaseAvailable()) {
		return [];
	}

	const { data, error } = await supabase!
		.from('approvals')
		.select('*')
		.eq('status', 'pending')
		.order('requested_at', { ascending: false });

	if (error) {
		console.error('Failed to get pending approvals:', error);
		return [];
	}

	return data || [];
}
