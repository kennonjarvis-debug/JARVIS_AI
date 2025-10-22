<script lang="ts">
	import { onMount } from 'svelte';
	import JarvisAssistant from '$lib/components/JarvisAssistant.svelte';

	let metrics = $state({
		ticketsToday: 15,
		resolved: 12,
		avgResponse: 8,
		satisfaction: 94,
		openTickets: 3,
		autoResolved: 8,
		escalated: 1,
		avgResolutionTime: 24
	});

	let tickets = $state<any[]>([]);
	let categories = $state<any[]>([]);

	onMount(async () => {
		fetchMetrics();
		fetchTickets();
		fetchCategories();

		const interval = setInterval(() => {
			fetchMetrics();
			fetchTickets();
			fetchCategories();
		}, 30000);

		return () => clearInterval(interval);
	});

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/obs/support/metrics');
			const data = await response.json();
			if (data.metrics) {
				metrics = data.metrics;
			}
		} catch (error) {
			console.error('Failed to fetch support metrics:', error);
		}
	}

	async function fetchTickets() {
		try {
			const response = await fetch('/api/obs/support/tickets/recent');
			const data = await response.json();
			tickets = data.tickets || getMockTickets();
		} catch (error) {
			console.error('Failed to fetch tickets:', error);
			tickets = getMockTickets();
		}
	}

	async function fetchCategories() {
		try {
			const response = await fetch('/api/obs/support/categories');
			const data = await response.json();
			categories = data.categories || getMockCategories();
		} catch (error) {
			console.error('Failed to fetch categories:', error);
			categories = getMockCategories();
		}
	}

	function getMockTickets() {
		return [
			{
				id: '847',
				subject: 'Billing question - refund request',
				status: 'resolved',
				priority: 'medium',
				category: 'Billing',
				assignedTo: 'Support Agent',
				time: '3m ago'
			},
			{
				id: '846',
				subject: 'How to export MIDI files?',
				status: 'resolved',
				priority: 'low',
				category: 'Technical',
				assignedTo: 'Auto-resolved',
				time: '1h ago'
			},
			{
				id: '845',
				subject: 'Voice interface not working',
				status: 'open',
				priority: 'high',
				category: 'Technical',
				assignedTo: 'Human Agent',
				time: '2h ago'
			}
		];
	}

	function getMockCategories() {
		return [
			{ name: 'Technical Issues', count: 6, percentage: 40 },
			{ name: 'Billing', count: 4, percentage: 27 },
			{ name: 'Feature Requests', count: 3, percentage: 20 },
			{ name: 'General Inquiry', count: 2, percentage: 13 }
		];
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'open':
				return 'badge-warning';
			case 'resolved':
				return 'badge-success';
			case 'escalated':
				return 'badge-danger';
			default:
				return 'badge';
		}
	}

	function getPriorityColor(priority: string) {
		switch (priority) {
			case 'high':
			case 'urgent':
				return 'text-red-400';
			case 'medium':
				return 'text-yellow-400';
			case 'low':
				return 'text-green-400';
			default:
				return 'text-white/60';
		}
	}
</script>

<div class="p-8 pb-24">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">💬 Customer Service Dashboard</h1>
		<p class="text-white/60">Support tickets, response times, and satisfaction</p>
	</div>

	<!-- Key Metrics -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
		<div class="card">
			<div class="text-sm text-white/60 mb-1">Tickets Today</div>
			<div class="text-3xl font-bold text-primary">{metrics.ticketsToday}</div>
			<div class="text-xs text-green-400 mt-1">-2 from yesterday</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Resolved</div>
			<div class="text-3xl font-bold text-green-400">{metrics.resolved}</div>
			<div class="text-xs text-white/40 mt-1">
				{Math.round((metrics.resolved / metrics.ticketsToday) * 100)}% resolution rate
			</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Avg Response</div>
			<div class="text-3xl font-bold text-secondary">{metrics.avgResponse}m</div>
			<div class="text-xs text-green-400 mt-1">+8% improvement</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Satisfaction</div>
			<div class="text-3xl font-bold text-primary">{metrics.satisfaction}%</div>
			<div class="text-xs text-green-400 mt-1">+2% increase</div>
		</div>
	</div>

	<!-- Performance Overview -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<div class="card">
			<div class="card-header">Performance Metrics</div>
			<div class="space-y-4">
				<div class="flex justify-between items-center">
					<span class="text-white/70">Open Tickets</span>
					<span class="text-2xl font-bold text-yellow-400">{metrics.openTickets}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Auto-Resolved</span>
					<span class="text-2xl font-bold text-green-400">{metrics.autoResolved}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Escalated</span>
					<span class="text-2xl font-bold text-red-400">{metrics.escalated}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Avg Resolution</span>
					<span class="text-2xl font-bold">{metrics.avgResolutionTime}h</span>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header">Ticket Categories</div>
			<div class="space-y-3">
				{#each categories as category}
					<div>
						<div class="flex justify-between items-center mb-1">
							<span class="font-medium">{category.name}</span>
							<span class="text-sm text-white/60">{category.count} ({category.percentage}%)</span>
						</div>
						<div class="w-full bg-white/10 rounded-full h-2">
							<div
								class="bg-primary h-2 rounded-full transition-all"
								style="width: {category.percentage}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Agent Performance -->
	<div class="card mb-8">
		<div class="card-header">Agent Performance</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="p-4 bg-white/5 rounded-lg">
				<div class="flex items-center gap-2 mb-3">
					<span class="text-2xl">🤖</span>
					<span class="font-semibold">Support Agent (AI)</span>
				</div>
				<div class="grid grid-cols-2 gap-2 text-sm">
					<div>
						<div class="text-white/60">Handled</div>
						<div class="text-lg font-bold">12</div>
					</div>
					<div>
						<div class="text-white/60">Resolved</div>
						<div class="text-lg font-bold text-green-400">8</div>
					</div>
					<div>
						<div class="text-white/60">Avg Time</div>
						<div class="text-lg font-bold">6m</div>
					</div>
					<div>
						<div class="text-white/60">CSAT</div>
						<div class="text-lg font-bold text-primary">92%</div>
					</div>
				</div>
			</div>

			<div class="p-4 bg-white/5 rounded-lg">
				<div class="flex items-center gap-2 mb-3">
					<span class="text-2xl">👤</span>
					<span class="font-semibold">Human Agents</span>
				</div>
				<div class="grid grid-cols-2 gap-2 text-sm">
					<div>
						<div class="text-white/60">Handled</div>
						<div class="text-lg font-bold">3</div>
					</div>
					<div>
						<div class="text-white/60">Resolved</div>
						<div class="text-lg font-bold text-green-400">2</div>
					</div>
					<div>
						<div class="text-white/60">Avg Time</div>
						<div class="text-lg font-bold">18m</div>
					</div>
					<div>
						<div class="text-white/60">CSAT</div>
						<div class="text-lg font-bold text-primary">98%</div>
					</div>
				</div>
			</div>

			<div class="p-4 bg-white/5 rounded-lg">
				<div class="font-semibold mb-3">Knowledge Base</div>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-white/60">Articles</span>
						<span class="font-semibold">127</span>
					</div>
					<div class="flex justify-between">
						<span class="text-white/60">Views Today</span>
						<span class="font-semibold">342</span>
					</div>
					<div class="flex justify-between">
						<span class="text-white/60">Self-Serve Rate</span>
						<span class="font-semibold text-green-400">64%</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Tickets -->
	<div class="card">
		<div class="card-header">Recent Tickets</div>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-white/10">
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">ID</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Subject</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Status</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Priority</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Category</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Assigned</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Time</th>
					</tr>
				</thead>
				<tbody>
					{#each tickets as ticket}
						<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
							<td class="py-3 px-4 font-mono text-sm">#{ticket.id}</td>
							<td class="py-3 px-4">{ticket.subject}</td>
							<td class="py-3 px-4">
								<span class="badge {getStatusColor(ticket.status)}">{ticket.status}</span>
							</td>
							<td class="py-3 px-4">
								<span class="{getPriorityColor(ticket.priority)} font-medium">
									{ticket.priority}
								</span>
							</td>
							<td class="py-3 px-4 text-sm">{ticket.category}</td>
							<td class="py-3 px-4 text-sm text-white/70">{ticket.assignedTo}</td>
							<td class="py-3 px-4 text-sm text-white/60">{ticket.time}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<JarvisAssistant />
