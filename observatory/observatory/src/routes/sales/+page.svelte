<script lang="ts">
	import { onMount } from 'svelte';
	import JarvisAssistant from '$lib/components/JarvisAssistant.svelte';

	let metrics = $state({
		leadsToday: 12,
		qualified: 8,
		conversionRate: 4.2,
		pipelineValue: 24500,
		dealsWon: 3,
		avgDealSize: 1247,
		salesCycle: 14,
		winRate: 68
	});

	let pipeline = $state<any[]>([]);
	let recentLeads = $state<any[]>([]);

	onMount(async () => {
		fetchMetrics();
		fetchPipeline();
		fetchRecentLeads();

		const interval = setInterval(() => {
			fetchMetrics();
			fetchPipeline();
			fetchRecentLeads();
		}, 30000);

		return () => clearInterval(interval);
	});

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/obs/sales/metrics');
			const data = await response.json();
			if (data.metrics) {
				metrics = data.metrics;
			}
		} catch (error) {
			console.error('Failed to fetch sales metrics:', error);
		}
	}

	async function fetchPipeline() {
		try {
			const response = await fetch('/api/obs/sales/pipeline');
			const data = await response.json();
			pipeline = data.pipeline || getMockPipeline();
		} catch (error) {
			console.error('Failed to fetch pipeline:', error);
			pipeline = getMockPipeline();
		}
	}

	async function fetchRecentLeads() {
		try {
			const response = await fetch('/api/obs/sales/leads/recent');
			const data = await response.json();
			recentLeads = data.leads || getMockLeads();
		} catch (error) {
			console.error('Failed to fetch recent leads:', error);
			recentLeads = getMockLeads();
		}
	}

	function getMockPipeline() {
		return [
			{ stage: 'New Leads', count: 12, value: 6000, color: 'bg-blue-500' },
			{ stage: 'Qualified', count: 8, value: 8500, color: 'bg-cyan-500' },
			{ stage: 'Proposal', count: 5, value: 7200, color: 'bg-yellow-500' },
			{ stage: 'Negotiation', count: 3, value: 4800, color: 'bg-orange-500' },
			{ stage: 'Closed Won', count: 2, value: 3000, color: 'bg-green-500' }
		];
	}

	function getMockLeads() {
		return [
			{
				id: '1',
				name: 'Acme Studios',
				source: 'Website',
				stage: 'Qualified',
				value: 2500,
				score: 85,
				time: '2 hours ago'
			},
			{
				id: '2',
				name: 'Beat Makers Inc',
				source: 'Referral',
				stage: 'Proposal',
				value: 1800,
				score: 72,
				time: '5 hours ago'
			},
			{
				id: '3',
				name: 'Sound Design Co',
				source: 'LinkedIn',
				stage: 'New',
				value: 3200,
				score: 91,
				time: '1 day ago'
			}
		];
	}

	function getStageColor(stage: string) {
		switch (stage.toLowerCase()) {
			case 'new':
				return 'badge-info';
			case 'qualified':
				return 'badge-success';
			case 'proposal':
				return 'badge-warning';
			default:
				return 'badge';
		}
	}
</script>

<div class="p-8 pb-24">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">💰 Sales Dashboard</h1>
		<p class="text-white/60">Pipeline, leads, and conversion metrics</p>
	</div>

	<!-- Key Metrics -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
		<div class="card">
			<div class="text-sm text-white/60 mb-1">Leads Today</div>
			<div class="text-3xl font-bold text-primary">{metrics.leadsToday}</div>
			<div class="text-xs text-green-400 mt-1">+3 from yesterday</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Qualified</div>
			<div class="text-3xl font-bold text-secondary">{metrics.qualified}</div>
			<div class="text-xs text-white/40 mt-1">
				{Math.round((metrics.qualified / metrics.leadsToday) * 100)}% rate
			</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Conversion Rate</div>
			<div class="text-3xl font-bold text-green-400">{metrics.conversionRate}%</div>
			<div class="text-xs text-green-400 mt-1">+12% vs last week</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Pipeline Value</div>
			<div class="text-3xl font-bold text-primary">${metrics.pipelineValue.toLocaleString()}</div>
			<div class="text-xs text-green-400 mt-1">+8% growth</div>
		</div>
	</div>

	<!-- Pipeline Visualization -->
	<div class="card mb-8">
		<div class="card-header">Sales Pipeline</div>
		<div class="space-y-4">
			{#each pipeline as stage}
				<div>
					<div class="flex justify-between items-center mb-2">
						<div class="flex items-center gap-3">
							<div class="w-3 h-3 {stage.color} rounded-full"></div>
							<span class="font-semibold">{stage.stage}</span>
						</div>
						<div class="flex items-center gap-4 text-sm">
							<span class="text-white/60">{stage.count} deals</span>
							<span class="font-bold">${stage.value.toLocaleString()}</span>
						</div>
					</div>
					<div class="w-full bg-white/10 rounded-full h-3">
						<div
							class="{stage.color} h-3 rounded-full transition-all"
							style="width: {(stage.value / 24500) * 100}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Sales Metrics -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<div class="card">
			<div class="card-header">Performance Metrics</div>
			<div class="space-y-4">
				<div class="flex justify-between items-center">
					<span class="text-white/70">Deals Won (This Week)</span>
					<span class="text-2xl font-bold text-green-400">{metrics.dealsWon}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Avg Deal Size</span>
					<span class="text-2xl font-bold">${metrics.avgDealSize}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Sales Cycle</span>
					<span class="text-2xl font-bold">{metrics.salesCycle} days</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Win Rate</span>
					<span class="text-2xl font-bold text-primary">{metrics.winRate}%</span>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header">Lead Sources</div>
			<div class="space-y-3">
				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<span class="font-medium">Website Signups</span>
					<div class="text-right">
						<div class="text-lg font-bold">7</div>
						<div class="text-xs text-white/60">58% of leads</div>
					</div>
				</div>

				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<span class="font-medium">Referrals</span>
					<div class="text-right">
						<div class="text-lg font-bold">3</div>
						<div class="text-xs text-white/60">25% of leads</div>
					</div>
				</div>

				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<span class="font-medium">LinkedIn</span>
					<div class="text-right">
						<div class="text-lg font-bold">2</div>
						<div class="text-xs text-white/60">17% of leads</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Leads -->
	<div class="card">
		<div class="card-header">Recent Leads</div>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-white/10">
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Company</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Source</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Stage</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Value</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Score</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Time</th>
					</tr>
				</thead>
				<tbody>
					{#each recentLeads as lead}
						<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
							<td class="py-3 px-4 font-medium">{lead.name}</td>
							<td class="py-3 px-4 text-sm text-white/70">{lead.source}</td>
							<td class="py-3 px-4">
								<span class="badge {getStageColor(lead.stage)}">{lead.stage}</span>
							</td>
							<td class="py-3 px-4 font-semibold">${lead.value.toLocaleString()}</td>
							<td class="py-3 px-4">
								<span class="text-{lead.score >= 80 ? 'green' : lead.score >= 60 ? 'yellow' : 'red'}-400">
									{lead.score}/100
								</span>
							</td>
							<td class="py-3 px-4 text-sm text-white/60">{lead.time}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<JarvisAssistant />
