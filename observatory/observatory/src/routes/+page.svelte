<script lang="ts">
	import { onMount } from 'svelte';
	import JarvisAssistant from '$lib/components/JarvisAssistant.svelte';

	// Business Module Data
	let businessModules = $state({
		marketing: {
			name: 'Marketing',
			icon: '📱',
			metrics: {
				postsToday: 8,
				engagement: 12.4,
				reach: 4200,
				campaignsActive: 3
			},
			trend: '+18%',
			status: 'active',
			lastAction: 'Posted to Twitter 5m ago'
		},
		sales: {
			name: 'Sales',
			icon: '💰',
			metrics: {
				leadsToday: 12,
				qualified: 8,
				conversionRate: 4.2,
				pipelineValue: 24500
			},
			trend: '+12%',
			status: 'active',
			lastAction: 'Qualified 3 leads 8m ago'
		},
		operations: {
			name: 'Operations',
			icon: '⚙️',
			metrics: {
				tasksCompleted: 127,
				successRate: 98.4,
				systemHealth: 100,
				dataSyncs: 24
			},
			trend: '+5%',
			status: 'healthy',
			lastAction: 'Health check 2m ago'
		},
		support: {
			name: 'Customer Service',
			icon: '💬',
			metrics: {
				ticketsToday: 15,
				resolved: 12,
				avgResponse: 8,
				satisfaction: 94
			},
			trend: '+8%',
			status: 'active',
			lastAction: 'Resolved ticket #847 3m ago'
		}
	});

	let systemOverview = $state({
		dawgAIProgress: 64,
		jarvisUptime: 99.8,
		totalTasks: 162,
		pendingApprovals: 3
	});

	onMount(async () => {
		fetchBusinessMetrics();
		fetchSystemOverview();

		const interval = setInterval(() => {
			fetchBusinessMetrics();
			fetchSystemOverview();
		}, 30000);

		return () => clearInterval(interval);
	});

	async function fetchBusinessMetrics() {
		try {
			const response = await fetch('/api/obs/business/metrics');
			const data = await response.json();
			if (data.modules) {
				businessModules = data.modules;
			}
		} catch (error) {
			console.error('Failed to fetch business metrics:', error);
		}
	}

	async function fetchSystemOverview() {
		try {
			const response = await fetch('/api/obs/overview');
			const data = await response.json();
			if (data.system) {
				systemOverview = data.system;
			}
		} catch (error) {
			console.error('Failed to fetch system overview:', error);
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'active':
			case 'healthy':
				return 'bg-green-500';
			case 'warning':
			case 'degraded':
				return 'bg-yellow-500';
			case 'error':
			case 'offline':
				return 'bg-red-500';
			default:
				return 'bg-gray-500';
		}
	}

	function formatNumber(num: number) {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
		if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
		return num.toString();
	}
</script>

<div class="p-8 pb-24">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Business Intelligence Dashboard</h1>
		<p class="text-white/60">
			Real-time metrics across marketing, sales, operations, and customer service
		</p>
	</div>

	<!-- System Overview Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		<div class="card">
			<div class="text-sm text-white/60 mb-1">DAWG AI Progress</div>
			<div class="text-3xl font-bold mb-2 text-primary">{systemOverview.dawgAIProgress}%</div>
			<div class="text-xs text-white/40">7/11 modules complete</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Jarvis Uptime</div>
			<div class="text-3xl font-bold mb-2 text-green-400">{systemOverview.jarvisUptime}%</div>
			<div class="text-xs text-white/40">Last 30 days</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Tasks Today</div>
			<div class="text-3xl font-bold mb-2 text-secondary">{systemOverview.totalTasks}</div>
			<div class="text-xs text-white/40">Across all agents</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Pending Approvals</div>
			<div class="text-3xl font-bold mb-2 text-yellow-400">{systemOverview.pendingApprovals}</div>
			<div class="text-xs text-white/40">
				<a href="/logs" class="hover:text-primary transition-colors">View →</a>
			</div>
		</div>
	</div>

	<!-- Business Module Widgets -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Marketing Widget -->
		<div class="card">
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-3">
					<span class="text-3xl">{businessModules.marketing.icon}</span>
					<div>
						<h2 class="text-xl font-bold">{businessModules.marketing.name}</h2>
						<div class="flex items-center gap-2 text-sm">
							<div class="w-2 h-2 {getStatusColor(businessModules.marketing.status)} rounded-full"></div>
							<span class="text-white/60 capitalize">{businessModules.marketing.status}</span>
						</div>
					</div>
				</div>
				<div class="text-right">
					<div class="text-2xl font-bold text-primary">{businessModules.marketing.trend}</div>
					<div class="text-xs text-white/40">vs last week</div>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 mb-4">
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Posts Today</div>
					<div class="text-2xl font-bold">{businessModules.marketing.metrics.postsToday}</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Engagement</div>
					<div class="text-2xl font-bold">{businessModules.marketing.metrics.engagement}%</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Reach</div>
					<div class="text-2xl font-bold">
						{formatNumber(businessModules.marketing.metrics.reach)}
					</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Active Campaigns</div>
					<div class="text-2xl font-bold">{businessModules.marketing.metrics.campaignsActive}</div>
				</div>
			</div>

			<div class="text-xs text-white/40 mb-3">
				Latest: {businessModules.marketing.lastAction}
			</div>

			<a
				href="/marketing"
				class="block w-full text-center py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
			>
				View Full Dashboard →
			</a>
		</div>

		<!-- Sales Widget -->
		<div class="card">
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-3">
					<span class="text-3xl">{businessModules.sales.icon}</span>
					<div>
						<h2 class="text-xl font-bold">{businessModules.sales.name}</h2>
						<div class="flex items-center gap-2 text-sm">
							<div class="w-2 h-2 {getStatusColor(businessModules.sales.status)} rounded-full"></div>
							<span class="text-white/60 capitalize">{businessModules.sales.status}</span>
						</div>
					</div>
				</div>
				<div class="text-right">
					<div class="text-2xl font-bold text-primary">{businessModules.sales.trend}</div>
					<div class="text-xs text-white/40">vs last week</div>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 mb-4">
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Leads Today</div>
					<div class="text-2xl font-bold">{businessModules.sales.metrics.leadsToday}</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Qualified</div>
					<div class="text-2xl font-bold">{businessModules.sales.metrics.qualified}</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Conversion Rate</div>
					<div class="text-2xl font-bold">{businessModules.sales.metrics.conversionRate}%</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Pipeline</div>
					<div class="text-2xl font-bold">
						${formatNumber(businessModules.sales.metrics.pipelineValue)}
					</div>
				</div>
			</div>

			<div class="text-xs text-white/40 mb-3">Latest: {businessModules.sales.lastAction}</div>

			<a
				href="/sales"
				class="block w-full text-center py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
			>
				View Full Dashboard →
			</a>
		</div>

		<!-- Operations Widget -->
		<div class="card">
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-3">
					<span class="text-3xl">{businessModules.operations.icon}</span>
					<div>
						<h2 class="text-xl font-bold">{businessModules.operations.name}</h2>
						<div class="flex items-center gap-2 text-sm">
							<div
								class="w-2 h-2 {getStatusColor(businessModules.operations.status)} rounded-full"
							></div>
							<span class="text-white/60 capitalize">{businessModules.operations.status}</span>
						</div>
					</div>
				</div>
				<div class="text-right">
					<div class="text-2xl font-bold text-primary">{businessModules.operations.trend}</div>
					<div class="text-xs text-white/40">vs last week</div>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 mb-4">
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Tasks Done</div>
					<div class="text-2xl font-bold">{businessModules.operations.metrics.tasksCompleted}</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Success Rate</div>
					<div class="text-2xl font-bold">{businessModules.operations.metrics.successRate}%</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">System Health</div>
					<div class="text-2xl font-bold">{businessModules.operations.metrics.systemHealth}%</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Data Syncs</div>
					<div class="text-2xl font-bold">{businessModules.operations.metrics.dataSyncs}</div>
				</div>
			</div>

			<div class="text-xs text-white/40 mb-3">
				Latest: {businessModules.operations.lastAction}
			</div>

			<a
				href="/operations"
				class="block w-full text-center py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
			>
				View Full Dashboard →
			</a>
		</div>

		<!-- Customer Service Widget -->
		<div class="card">
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-3">
					<span class="text-3xl">{businessModules.support.icon}</span>
					<div>
						<h2 class="text-xl font-bold">{businessModules.support.name}</h2>
						<div class="flex items-center gap-2 text-sm">
							<div class="w-2 h-2 {getStatusColor(businessModules.support.status)} rounded-full"></div>
							<span class="text-white/60 capitalize">{businessModules.support.status}</span>
						</div>
					</div>
				</div>
				<div class="text-right">
					<div class="text-2xl font-bold text-primary">{businessModules.support.trend}</div>
					<div class="text-xs text-white/40">vs last week</div>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 mb-4">
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Tickets Today</div>
					<div class="text-2xl font-bold">{businessModules.support.metrics.ticketsToday}</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Resolved</div>
					<div class="text-2xl font-bold">{businessModules.support.metrics.resolved}</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Avg Response</div>
					<div class="text-2xl font-bold">{businessModules.support.metrics.avgResponse}m</div>
				</div>
				<div class="bg-white/5 p-3 rounded">
					<div class="text-xs text-white/60 mb-1">Satisfaction</div>
					<div class="text-2xl font-bold">{businessModules.support.metrics.satisfaction}%</div>
				</div>
			</div>

			<div class="text-xs text-white/40 mb-3">Latest: {businessModules.support.lastAction}</div>

			<a
				href="/support"
				class="block w-full text-center py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
			>
				View Full Dashboard →
			</a>
		</div>
	</div>
</div>

<!-- Jarvis AI Assistant -->
<JarvisAssistant />
