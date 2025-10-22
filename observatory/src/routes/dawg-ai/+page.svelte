<script lang="ts">
	import { onMount } from 'svelte';

	let modules = $state<any[]>([]);
	let runtimeHealth = $state({
		audioEngine: { status: 'healthy', latency: 12 },
		voiceInterface: { status: 'healthy', latency: 850 },
		database: { status: 'healthy', responseTime: 45 },
		apiCalls: { count: 2347, errorsToday: 3 }
	});

	onMount(async () => {
		fetchModuleStatus();
		fetchRuntimeHealth();

		const interval = setInterval(() => {
			fetchModuleStatus();
			fetchRuntimeHealth();
		}, 10000);

		return () => clearInterval(interval);
	});

	async function fetchModuleStatus() {
		try {
			const response = await fetch('/api/obs/dawg-ai/modules');
			const data = await response.json();
			modules = data.modules || [];
		} catch (error) {
			console.error('Failed to fetch module status:', error);
			modules = [];
		}
	}

	async function fetchRuntimeHealth() {
		try {
			const response = await fetch('/api/obs/dawg-ai/health');
			const data = await response.json();
			runtimeHealth = data;
		} catch (error) {
			console.error('Failed to fetch runtime health:', error);
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'complete':
				return '✅';
			case 'in-progress':
				return '🔄';
			case 'not-started':
				return '⏳';
			case 'blocked':
				return '⚠️';
			default:
				return '📝';
		}
	}

	function getStatusClass(status: string) {
		switch (status) {
			case 'complete':
				return 'badge-success';
			case 'in-progress':
				return 'badge-info';
			case 'not-started':
				return 'badge-warning';
			case 'blocked':
				return 'badge-danger';
			default:
				return 'badge';
		}
	}

	function getHealthColor(status: string) {
		switch (status) {
			case 'healthy':
				return 'text-green-400';
			case 'degraded':
				return 'text-yellow-400';
			case 'unhealthy':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}

	// Use $derived for reactive computations (Svelte 5 runes mode)
	let completedModules = $derived(modules.filter((m) => m.status === 'complete').length);
	let totalProgress = $derived(
		modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0
	);
</script>

<div class="p-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">DAWG AI Monitor</h1>
		<p class="text-white/60">Real-time development progress and runtime health</p>
	</div>

	<!-- Overall Progress -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<div class="card">
			<div class="text-sm text-white/60 mb-1">Overall Progress</div>
			<div class="text-4xl font-bold mb-3 text-primary">{totalProgress}%</div>
			<div class="w-full bg-white/10 rounded-full h-2">
				<div class="bg-primary h-2 rounded-full transition-all" style="width: {totalProgress}%"></div>
			</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Modules Complete</div>
			<div class="text-4xl font-bold mb-3 text-green-400">{completedModules}/11</div>
			<div class="text-sm text-white/60">
				{modules.filter((m) => m.status === 'in-progress').length} in progress
			</div>
		</div>

		<div class="card">
			<div class="text-sm text-white/60 mb-1">Active Issues</div>
			<div class="text-4xl font-bold mb-3 text-yellow-400">
				{modules.reduce((sum, m) => sum + m.issues, 0)}
			</div>
			<div class="text-sm text-white/60">Across all modules</div>
		</div>
	</div>

	<!-- Module Status Grid -->
	<div class="card mb-8">
		<div class="card-header">Module Status Matrix</div>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-white/10">
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">ID</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Module</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Status</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Progress</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Last Update</th>
						<th class="text-left py-3 px-4 text-sm font-semibold text-white/70">Issues</th>
					</tr>
				</thead>
				<tbody>
					{#each modules as module}
						<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
							<td class="py-3 px-4 text-white/60">{module.id}</td>
							<td class="py-3 px-4 font-medium">
								<span class="mr-2">{getStatusIcon(module.status)}</span>
								{module.name}
							</td>
							<td class="py-3 px-4">
								<span class="badge {getStatusClass(module.status)} capitalize">
									{module.status.replace('-', ' ')}
								</span>
							</td>
							<td class="py-3 px-4">
								<div class="flex items-center gap-3">
									<div class="w-24 bg-white/10 rounded-full h-2">
										<div
											class="bg-primary h-2 rounded-full transition-all"
											style="width: {module.progress}%"
										></div>
									</div>
									<span class="text-sm text-white/60">{module.progress}%</span>
								</div>
							</td>
							<td class="py-3 px-4 text-sm text-white/60">{module.lastUpdate}</td>
							<td class="py-3 px-4">
								{#if module.issues > 0}
									<span class="badge badge-danger">{module.issues}</span>
								{:else}
									<span class="text-white/40">0</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Runtime Health -->
	<div class="card">
		<div class="card-header">Runtime Health</div>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<div>
				<div class="text-sm text-white/60 mb-2">Audio Engine</div>
				<div class="flex items-baseline gap-2">
					<span class="text-2xl font-bold {getHealthColor(runtimeHealth.audioEngine.status)}">
						{runtimeHealth.audioEngine.status}
					</span>
				</div>
				<div class="text-xs text-white/40 mt-1">
					Latency: {runtimeHealth.audioEngine.latency}ms
				</div>
			</div>

			<div>
				<div class="text-sm text-white/60 mb-2">Voice Interface</div>
				<div class="flex items-baseline gap-2">
					<span class="text-2xl font-bold {getHealthColor(runtimeHealth.voiceInterface.status)}">
						{runtimeHealth.voiceInterface.status}
					</span>
				</div>
				<div class="text-xs text-white/40 mt-1">
					Response time: {runtimeHealth.voiceInterface.latency}ms
				</div>
			</div>

			<div>
				<div class="text-sm text-white/60 mb-2">Database</div>
				<div class="flex items-baseline gap-2">
					<span class="text-2xl font-bold {getHealthColor(runtimeHealth.database.status)}">
						{runtimeHealth.database.status}
					</span>
				</div>
				<div class="text-xs text-white/40 mt-1">
					Response: {runtimeHealth.database.responseTime}ms
				</div>
			</div>

			<div>
				<div class="text-sm text-white/60 mb-2">API Calls (24h)</div>
				<div class="flex items-baseline gap-2">
					<span class="text-2xl font-bold text-primary">{runtimeHealth.apiCalls.count}</span>
				</div>
				<div class="text-xs text-white/40 mt-1">
					{runtimeHealth.apiCalls.errorsToday} errors
				</div>
			</div>
		</div>
	</div>
</div>
