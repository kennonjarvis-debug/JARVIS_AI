/**
 * Root layout data loader
 * Runs before each page load to check authentication
 */

import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
	// Skip auth check for login page
	if (url.pathname === '/login') {
		return {};
	}

	// Check authentication in browser
	if (browser) {
		const stored = sessionStorage.getItem('jarvis_auth');
		if (!stored) {
			// Not authenticated, redirect to login
			throw redirect(303, '/login');
		}
	}

	return {};
};
