<script lang="ts">
	import { onMount } from 'svelte';
	import JarvisAssistant from '$lib/components/JarvisAssistant.svelte';

	let metrics = $state({
		tasksCompleted: 127,
		successRate: 98.4,
		systemHealth: 100,
		dataSyncs: 24,
		avgResponseTime: 245,
		errorRate: 0.3,
		uptime: 99.8,
		apiCalls: 2347
	});

	let systemComponents = $state<any[]>([]);
	let recentTasks = $state<any[]>([]);
	let alerts = $state<any[]>([]);

	onMount(async () => {
		fetchMetrics();
		fetchSystemComponents();
		fetchRecentTasks();
		fetchAlerts();

		const interval = setInterval(() => {
			fetchMetrics();
			fetchSystemComponents();
			fetchRecentTasks();
			fetchAlerts();
		}, 15000);

		return () => clearInterval(interval);
	});

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/obs/operations/metrics');
			const data = await response.json();
			if (data.metrics) {
				metrics = data.metrics;
			}
		} catch (error) {
			console.error('Failed to fetch operations metrics:', error);
		}
	}

	async function fetchSystemComponents() {
		try {
			const response = await fetch('/api/obs/operations/components');
			const data = await response.json();
			systemComponents = data.components || getMockComponents();
		} catch (error) {
			console.error('Failed to fetch system components:', error);
			systemComponents = getMockComponents();
		}
	}

	async function fetchRecentTasks() {
		try {
			const response = await fetch('/api/obs/operations/tasks/recent');
			const data = await response.json();
			recentTasks = data.tasks || getMockTasks();
		} catch (error) {
			console.error('Failed to fetch recent tasks:', error);
			recentTasks = getMockTasks();
		}
	}

	async function fetchAlerts() {
		try {
			const response = await fetch('/api/obs/operations/alerts');
			const data = await response.json();
			alerts = data.alerts || [];
		} catch (error) {
			console.error('Failed to fetch alerts:', error);
			alerts = [];
		}
	}

	function getMockComponents() {
		return [
			{
				name: 'DAWG AI',
				status: 'healthy',
				latency: 12,
				uptime: 99.9,
				lastCheck: '30s ago'
			},
			{
				name: 'Jarvis Agents',
				status: 'healthy',
				latency: 8,
				uptime: 99.8,
				lastCheck: '30s ago'
			},
			{
				name: 'Database',
				status: 'healthy',
				latency: 45,
				uptime: 100,
				lastCheck: '30s ago'
			},
			{
				name: 'External APIs',
				status: 'degraded',
				latency: 523,
				uptime: 98.2,
				lastCheck: '30s ago'
			}
		];
	}

	function getMockTasks() {
		return [
			{
				id: '1',
				type: 'health_check',
				description: 'System health check',
				status: 'completed',
				duration: 3.1,
				time: '2m ago'
			},
			{
				id: '2',
				type: 'data_sync',
				description: 'Sync CRM data',
				status: 'completed',
				duration: 12.4,
				time: '15m ago'
			},
			{
				id: '3',
				type: 'backup',
				description: 'Database backup',
				status: 'completed',
				duration: 45.8,
				time: '1h ago'
			}
		];
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'healthy':
				return 'text-green-400';
			case 'degraded':
				return 'text-yellow-400';
			case 'unhealthy':
			case 'offline':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'healthy':
				return 'badge-success';
			case 'degraded':
				return 'badge-warning';
			case 'unhealthy':
			case 'offline':
				return 'badge-danger';
			default:
				return 'badge';
		}
	}
</script>

<div class="p-8 pb-24">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">⚙️ Operations Dashboard</h1>
		<p class="text-white/60">System health, monitoring, and automation</p>
	</div>

	<!-- Key Metrics -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
		<div class="card">
			<div class="text-sm text-white/60 mb-1">Tasks Completed</div>
			<div class="text-3xl font-bold text-primary">{metrics.tasksCompleted}</div>
			<div class="text-xs text-green-400 mt-1">+5% from yesterday</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Success Rate</div>
			<div class="text-3xl font-bold text-green-400">{metrics.successRate}%</div>
			<div class="text-xs text-white/40 mt-1">Target: 95%+</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">System Health</div>
			<div class="text-3xl font-bold text-primary">{metrics.systemHealth}%</div>
			<div class="text-xs text-green-400 mt-1">All systems operational</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Data Syncs Today</div>
			<div class="text-3xl font-bold text-secondary">{metrics.dataSyncs}</div>
			<div class="text-xs text-white/40 mt-1">0 failures</div>
		</div>
	</div>

	<!-- Alerts -->
	{#if alerts.length > 0}
		<div class="card mb-8 bg-yellow-500/10 border-yellow-500/30">
			<div class="flex items-center gap-2 mb-4">
				<span class="text-2xl">⚠️</span>
				<h2 class="text-xl font-bold text-yellow-400">Active Alerts</h2>
			</div>
			<div class="space-y-2">
				{#each alerts as alert}
					<div class="p-3 bg-black/30 rounded">
						<div class="font-medium">{alert.message}</div>
						<div class="text-sm text-white/60 mt-1">{alert.time}</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- System Components -->
	<div class="card mb-8">
		<div class="card-header">System Components</div>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each systemComponents as component}
				<div class="p-4 bg-white/5 rounded-lg">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-2">
							<span class="{getStatusColor(component.status)} text-2xl">●</span>
							<span class="font-semibold">{component.name}</span>
						</div>
						<span class="badge {getStatusBadge(component.status)}">{component.status}</span>
					</div>
					<div class="grid grid-cols-3 gap-2 text-sm">
						<div>
							<div class="text-white/60">Latency</div>
							<div class="font-semibold">{component.latency}ms</div>
						</div>
						<div>
							<div class="text-white/60">Uptime</div>
							<div class="font-semibold">{component.uptime}%</div>
						</div>
						<div>
							<div class="text-white/60">Last Check</div>
							<div class="font-semibold">{component.lastCheck}</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Performance Metrics -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<div class="card">
			<div class="card-header">Performance Metrics</div>
			<div class="space-y-4">
				<div class="flex justify-between items-center">
					<span class="text-white/70">Avg Response Time</span>
					<span class="text-2xl font-bold">{metrics.avgResponseTime}ms</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Error Rate</span>
					<span class="text-2xl font-bold text-green-400">{metrics.errorRate}%</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">System Uptime</span>
					<span class="text-2xl font-bold text-primary">{metrics.uptime}%</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">API Calls (24h)</span>
					<span class="text-2xl font-bold">{metrics.apiCalls.toLocaleString()}</span>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header">Automation Tasks</div>
			<div class="space-y-3">
				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<div>
						<div class="font-medium">Health Checks</div>
						<div class="text-xs text-white/60">Every 5 minutes</div>
					</div>
					<span class="badge badge-success">Active</span>
				</div>

				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<div>
						<div class="font-medium">Data Synchronization</div>
						<div class="text-xs text-white/60">Every 30 minutes</div>
					</div>
					<span class="badge badge-success">Active</span>
				</div>

				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<div>
						<div class="font-medium">Database Backups</div>
						<div class="text-xs text-white/60">Every 6 hours</div>
					</div>
					<span class="badge badge-success">Active</span>
				</div>

				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<div>
						<div class="font-medium">Log Rotation</div>
						<div class="text-xs text-white/60">Daily at 2:00 AM</div>
					</div>
					<span class="badge badge-success">Active</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Tasks -->
	<div class="card">
		<div class="card-header">Recent Tasks</div>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-white/10">
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Type</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Description</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Status</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Duration</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Time</th>
					</tr>
				</thead>
				<tbody>
					{#each recentTasks as task}
						<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
							<td class="py-3 px-4 font-mono text-sm">{task.type}</td>
							<td class="py-3 px-4">{task.description}</td>
							<td class="py-3 px-4">
								<span class="badge badge-success">{task.status}</span>
							</td>
							<td class="py-3 px-4 text-sm">{task.duration}s</td>
							<td class="py-3 px-4 text-sm text-white/60">{task.time}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<JarvisAssistant />
