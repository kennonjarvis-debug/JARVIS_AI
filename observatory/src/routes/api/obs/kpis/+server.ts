import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Mock KPI data - in production, fetch from Supabase
	const kpis = {
		signups: 234,
		conversion: 3.8,
		retention: 68,
		revenue: 1247
	};

	return json(kpis);
};
