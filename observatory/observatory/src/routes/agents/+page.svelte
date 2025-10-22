<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getJarvisApiUrl } from '$lib/api-config';

	// API base URL - connect to our Express API server or ngrok tunnel
	const API_BASE = getJarvisApiUrl();

	// State
	let activities = $state<any[]>([]);
	let metrics = $state<any>(null);
	let approvalQueue = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let pollInterval: NodeJS.Timeout | null = null;
	let selectedAgent = $state<string | null>(null);

	onMount(async () => {
		await loadAllData();

		// Poll for updates every 5 seconds
		pollInterval = setInterval(async () => {
			await loadAllData();
		}, 5000);
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});

	async function loadAllData() {
		try {
			await Promise.all([fetchActivities(), fetchMetrics(), fetchApprovalQueue()]);
			loading = false;
			error = null;
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}

	async function fetchActivities() {
		try {
			const res = await fetch(`${API_BASE}/api/agents/activities?limit=50`);
			if (!res.ok) throw new Error('Failed to fetch activities');

			const data = await res.json();
			if (data.success) {
				activities = data.data;
			}
		} catch (err: any) {
			console.error('Failed to fetch activities:', err);
		}
	}

	async function fetchMetrics() {
		try {
			const res = await fetch(`${API_BASE}/api/agents/metrics`);
			if (!res.ok) throw new Error('Failed to fetch metrics');

			const data = await res.json();
			if (data.success) {
				metrics = data.data;
			}
		} catch (err: any) {
			console.error('Failed to fetch metrics:', err);
		}
	}

	async function fetchApprovalQueue() {
		try {
			const res = await fetch(`${API_BASE}/api/agents/approval-queue`);
			if (!res.ok) throw new Error('Failed to fetch approval queue');

			const data = await res.json();
			if (data.success) {
				approvalQueue = data.data;
			}
		} catch (err: any) {
			console.error('Failed to fetch approval queue:', err);
		}
	}

	async function approveAction(activityId: string) {
		try {
			const res = await fetch(`${API_BASE}/api/agents/approve/${activityId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ approvedBy: 'user' })
			});

			if (!res.ok) throw new Error('Failed to approve action');

			// Refresh data
			await loadAllData();
		} catch (err: any) {
			console.error('Failed to approve action:', err);
			alert('Failed to approve action: ' + err.message);
		}
	}

	async function rejectAction(activityId: string) {
		const reason = prompt('Enter rejection reason:');
		if (!reason) return;

		try {
			const res = await fetch(`${API_BASE}/api/agents/reject/${activityId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason, rejectedBy: 'user' })
			});

			if (!res.ok) throw new Error('Failed to reject action');

			// Refresh data
			await loadAllData();
		} catch (err: any) {
			console.error('Failed to reject action:', err);
			alert('Failed to reject action: ' + err.message);
		}
	}

	function formatTimestamp(timestamp: string) {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
		return date.toLocaleDateString();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'active':
			case 'completed':
				return 'bg-green-500';
			case 'pending':
			case 'pending_approval':
				return 'bg-yellow-500';
			case 'failed':
			case 'offline':
				return 'bg-red-500';
			default:
				return 'bg-gray-500';
		}
	}
</script>

<div class="p-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold mb-2">🤖 Agents & Orchestration</h1>
			<p class="text-white/60">Real-time autonomous agent activity monitoring</p>
		</div>
		<div class="flex items-center gap-2">
			{#if loading && activities.length === 0}
				<span class="badge badge-info">Loading...</span>
			{:else if error}
				<span class="badge badge-danger">Error: {error}</span>
			{:else}
				<span class="badge badge-success">
					<span class="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></span>
					Live
				</span>
			{/if}
		</div>
	</div>

	{#if error && activities.length === 0}
		<div class="card bg-red-500/10 border-red-500/50 mb-8">
			<p class="mb-2">⚠️ Cannot connect to API server at {API_BASE}</p>
			<p class="text-sm text-white/60">Make sure the API server is running:</p>
			<code class="block mt-2 p-2 bg-black/30 rounded">npm run api</code>
		</div>
	{/if}

	<!-- Agent Metrics Grid -->
	{#if metrics}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			{#each Object.entries(metrics) as [agentType, stats]}
				<div
					class="card hover:border-primary/30 transition-colors cursor-pointer"
					onclick={() => (selectedAgent = agentType)}
				>
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 {getStatusColor('active')} rounded-full"></div>
							<span class="font-semibold capitalize">Active</span>
						</div>
						<span class="text-2xl">
							{#if agentType === 'marketing'}📱
							{:else if agentType === 'sales'}💰
							{:else if agentType === 'operations'}⚙️
							{:else if agentType === 'support'}💬
							{/if}
						</span>
					</div>
					<h3 class="text-lg font-bold mb-3 capitalize">{agentType} Agent</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-white/60">Total Tasks</span>
							<span class="font-semibold">{stats.total}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-white/60">Completed</span>
							<span class="font-semibold text-green-400">{stats.completed}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-white/60">Pending</span>
							<span class="font-semibold text-yellow-400">{stats.pending}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-white/60">Failed</span>
							<span class="font-semibold text-red-400">{stats.failed}</span>
						</div>
					</div>
					<div class="mt-3 flex gap-2 flex-wrap">
						<span class="badge badge-success text-xs">LOW: {stats.low_risk}</span>
						<span class="badge badge-warning text-xs">MED: {stats.medium_risk}</span>
						<span class="badge badge-danger text-xs">HIGH: {stats.high_risk}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Approval Queue -->
	{#if approvalQueue.length > 0}
		<div class="card bg-yellow-500/10 border-yellow-500/50 mb-8">
			<div class="card-header text-yellow-400">⏳ Requires Your Approval ({approvalQueue.length})</div>
			<div class="space-y-3">
				{#each approvalQueue as item}
					<div class="card bg-black/30 p-4">
						<div class="flex items-center gap-2 mb-2">
							<span class="badge badge-warning capitalize">{item.agent_type}</span>
							<span class="badge badge-{item.risk_level === 'HIGH' ? 'danger' : 'warning'}">
								{item.risk_level}
							</span>
							<span class="text-xs text-white/40 ml-auto">{formatTimestamp(item.timestamp)}</span>
						</div>
						<div class="mb-3">
							<strong class="block mb-1">{item.action}</strong>
							<p class="text-sm text-white/70">{item.description}</p>
							{#if item.metadata && Object.keys(item.metadata).length > 0}
								<details class="mt-2">
									<summary class="text-xs text-white/60 cursor-pointer">View metadata</summary>
									<pre class="text-xs bg-black/50 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(
											item.metadata,
											null,
											2
										)}</pre>
								</details>
							{/if}
						</div>
						<div class="flex gap-2">
							<button
								class="btn btn-success btn-sm flex-1"
								onclick={() => approveAction(item.id)}
							>
								✓ Approve
							</button>
							<button
								class="btn btn-danger btn-sm flex-1"
								onclick={() => rejectAction(item.id)}
							>
								✗ Reject
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Activity Feed -->
	<div class="card">
		<div class="card-header">📊 Recent Agent Activity</div>
		{#if activities.length === 0 && !loading}
			<div class="py-12 text-center">
				<div class="text-6xl mb-4">🤖</div>
				<p class="text-white/60 mb-2">No activities yet. Start the orchestrator to see agent actions:</p>
				<code class="block mt-3 p-3 bg-black/30 rounded inline-block">npm run orchestrator</code>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/10">
							<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Agent</th>
							<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Action</th>
							<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Risk</th>
							<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Status</th>
							<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Duration</th>
							<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Time</th>
						</tr>
					</thead>
					<tbody>
						{#each activities as activity}
							<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
								<td class="py-3 px-4">
									<span class="badge badge-info capitalize">{activity.agent_type}</span>
								</td>
								<td class="py-3 px-4">
									<div class="font-medium">{activity.action}</div>
									{#if activity.description}
										<div class="text-xs text-white/50 mt-0.5">{activity.description}</div>
									{/if}
								</td>
								<td class="py-3 px-4">
									<span
										class="badge {activity.risk_level === 'LOW'
											? 'badge-success'
											: activity.risk_level === 'MEDIUM'
												? 'badge-warning'
												: 'badge-danger'}"
									>
										{activity.risk_level}
									</span>
								</td>
								<td class="py-3 px-4">
									<span
										class="badge {activity.status === 'completed'
											? 'badge-success'
											: activity.status === 'failed'
												? 'badge-danger'
												: activity.status.includes('pending')
													? 'badge-warning'
													: 'badge-info'}"
									>
										{activity.status}
									</span>
								</td>
								<td class="py-3 px-4 text-sm text-white/60">
									{activity.duration_ms ? `${activity.duration_ms}ms` : '-'}
								</td>
								<td class="py-3 px-4 text-sm text-white/60">
									{formatTimestamp(activity.timestamp)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
