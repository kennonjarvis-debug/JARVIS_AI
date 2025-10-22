<script lang="ts">
	import { onMount } from 'svelte';
	import JarvisAssistant from '$lib/components/JarvisAssistant.svelte';

	let metrics = $state({
		postsToday: 8,
		engagement: 12.4,
		reach: 4200,
		campaignsActive: 3,
		impressions: 15300,
		clicks: 892,
		conversions: 34,
		ctr: 5.8
	});

	let recentPosts = $state<any[]>([]);
	let campaigns = $state<any[]>([]);

	onMount(async () => {
		fetchMetrics();
		fetchRecentPosts();
		fetchCampaigns();

		const interval = setInterval(() => {
			fetchMetrics();
			fetchRecentPosts();
			fetchCampaigns();
		}, 30000);

		return () => clearInterval(interval);
	});

	async function fetchMetrics() {
		try {
			const response = await fetch('/api/obs/marketing/metrics');
			const data = await response.json();
			if (data.metrics) {
				metrics = data.metrics;
			}
		} catch (error) {
			console.error('Failed to fetch marketing metrics:', error);
		}
	}

	async function fetchRecentPosts() {
		try {
			const response = await fetch('/api/obs/marketing/posts/recent');
			const data = await response.json();
			recentPosts = data.posts || getMockPosts();
		} catch (error) {
			console.error('Failed to fetch recent posts:', error);
			recentPosts = getMockPosts();
		}
	}

	async function fetchCampaigns() {
		try {
			const response = await fetch('/api/obs/marketing/campaigns');
			const data = await response.json();
			campaigns = data.campaigns || getMockCampaigns();
		} catch (error) {
			console.error('Failed to fetch campaigns:', error);
			campaigns = getMockCampaigns();
		}
	}

	function getMockPosts() {
		return [
			{
				id: '1',
				platform: 'Twitter',
				content: 'Check out our new MIDI editor! 🎵',
				engagement: 156,
				reach: 2300,
				time: '2 hours ago'
			},
			{
				id: '2',
				platform: 'LinkedIn',
				content: 'DAWG AI is revolutionizing music production...',
				engagement: 89,
				reach: 1800,
				time: '4 hours ago'
			},
			{
				id: '3',
				platform: 'Twitter',
				content: 'Voice-controlled DAW? Yes please! 🎤',
				engagement: 203,
				reach: 3200,
				time: '6 hours ago'
			}
		];
	}

	function getMockCampaigns() {
		return [
			{
				id: '1',
				name: 'Q4 Product Launch',
				status: 'active',
				posts: 12,
				reach: 8400,
				engagement: 892,
				budget: 500,
				spent: 287
			},
			{
				id: '2',
				name: 'User Testimonials',
				status: 'active',
				posts: 8,
				reach: 5200,
				engagement: 634,
				budget: 300,
				spent: 156
			},
			{
				id: '3',
				name: 'Feature Highlights',
				status: 'paused',
				posts: 15,
				reach: 12100,
				engagement: 1247,
				budget: 700,
				spent: 423
			}
		];
	}

	function getPlatformIcon(platform: string) {
		switch (platform.toLowerCase()) {
			case 'twitter':
				return '🐦';
			case 'linkedin':
				return '💼';
			case 'facebook':
				return '📘';
			case 'instagram':
				return '📸';
			default:
				return '📱';
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'active':
				return 'bg-green-500';
			case 'paused':
				return 'bg-yellow-500';
			case 'completed':
				return 'bg-blue-500';
			default:
				return 'bg-gray-500';
		}
	}
</script>

<div class="p-8 pb-24">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">📱 Marketing Dashboard</h1>
		<p class="text-white/60">Social media, content, and campaign performance</p>
	</div>

	<!-- Key Metrics Grid -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
		<div class="card">
			<div class="text-sm text-white/60 mb-1">Posts Today</div>
			<div class="text-3xl font-bold text-primary">{metrics.postsToday}</div>
			<div class="text-xs text-green-400 mt-1">+2 from yesterday</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Engagement Rate</div>
			<div class="text-3xl font-bold text-secondary">{metrics.engagement}%</div>
			<div class="text-xs text-green-400 mt-1">+18% vs last week</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Total Reach</div>
			<div class="text-3xl font-bold text-primary">{metrics.reach.toLocaleString()}</div>
			<div class="text-xs text-green-400 mt-1">+12% growth</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Active Campaigns</div>
			<div class="text-3xl font-bold text-secondary">{metrics.campaignsActive}</div>
			<div class="text-xs text-white/40 mt-1">3 campaigns running</div>
		</div>
	</div>

	<!-- Detailed Metrics -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<div class="card">
			<div class="card-header">Performance Metrics</div>
			<div class="space-y-4">
				<div class="flex justify-between items-center">
					<span class="text-white/70">Impressions</span>
					<span class="text-xl font-bold">{metrics.impressions.toLocaleString()}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Clicks</span>
					<span class="text-xl font-bold">{metrics.clicks.toLocaleString()}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">Conversions</span>
					<span class="text-xl font-bold text-green-400">{metrics.conversions}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-white/70">CTR</span>
					<span class="text-xl font-bold text-primary">{metrics.ctr}%</span>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header">Platform Breakdown</div>
			<div class="space-y-3">
				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<div class="flex items-center gap-3">
						<span class="text-2xl">🐦</span>
						<span class="font-medium">Twitter</span>
					</div>
					<div class="text-right">
						<div class="text-lg font-bold">5 posts</div>
						<div class="text-xs text-white/60">2.1k reach</div>
					</div>
				</div>

				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<div class="flex items-center gap-3">
						<span class="text-2xl">💼</span>
						<span class="font-medium">LinkedIn</span>
					</div>
					<div class="text-right">
						<div class="text-lg font-bold">2 posts</div>
						<div class="text-xs text-white/60">1.4k reach</div>
					</div>
				</div>

				<div class="flex items-center justify-between p-3 bg-white/5 rounded">
					<div class="flex items-center gap-3">
						<span class="text-2xl">📸</span>
						<span class="font-medium">Instagram</span>
					</div>
					<div class="text-right">
						<div class="text-lg font-bold">1 post</div>
						<div class="text-xs text-white/60">700 reach</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Posts -->
	<div class="card mb-8">
		<div class="card-header">Recent Posts</div>
		<div class="space-y-3">
			{#each recentPosts as post}
				<div class="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
					<div class="flex items-start gap-3">
						<span class="text-2xl">{getPlatformIcon(post.platform)}</span>
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								<span class="font-semibold">{post.platform}</span>
								<span class="text-xs text-white/40">{post.time}</span>
							</div>
							<div class="text-white/90 mb-3">{post.content}</div>
							<div class="flex gap-4 text-sm">
								<div>
									<span class="text-white/60">Engagement:</span>
									<span class="font-semibold ml-1">{post.engagement}</span>
								</div>
								<div>
									<span class="text-white/60">Reach:</span>
									<span class="font-semibold ml-1">{post.reach.toLocaleString()}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Active Campaigns -->
	<div class="card">
		<div class="card-header">Active Campaigns</div>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-white/10">
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Campaign</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Status</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Posts</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Reach</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Engagement</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Budget</th>
					</tr>
				</thead>
				<tbody>
					{#each campaigns as campaign}
						<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
							<td class="py-3 px-4 font-medium">{campaign.name}</td>
							<td class="py-3 px-4">
								<span class="badge badge-{campaign.status === 'active' ? 'success' : 'warning'}">
									{campaign.status}
								</span>
							</td>
							<td class="py-3 px-4">{campaign.posts}</td>
							<td class="py-3 px-4">{campaign.reach.toLocaleString()}</td>
							<td class="py-3 px-4">{campaign.engagement}</td>
							<td class="py-3 px-4 text-sm">
								<div>${campaign.spent} / ${campaign.budget}</div>
								<div class="w-full bg-white/10 rounded-full h-1 mt-1">
									<div
										class="bg-primary h-1 rounded-full"
										style="width: {(campaign.spent / campaign.budget) * 100}%"
									></div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<JarvisAssistant />
