<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	let { children } = $props();

	const navItems = [
		{ path: '/', label: 'Overview', icon: '📊' },
		{ path: '/dawg-ai', label: 'DAWG AI', icon: '🎵' },
		{ path: '/agents', label: 'Agents', icon: '🤖' },
		{ path: '/imessage', label: 'iMessage', icon: '💬' },
		{ path: '/marketing', label: 'Marketing', icon: '📱' },
		{ path: '/sales', label: 'Sales', icon: '💰' },
		{ path: '/operations', label: 'Operations', icon: '⚙️' },
		{ path: '/support', label: 'Support', icon: '🗨️' },
		{ path: '/logs', label: 'Logs', icon: '📝' }
	];

	let isAuthenticated = $state(false);
	let username = $state<string | null>(null);

	onMount(() => {
		// Check authentication on mount
		const isAuth = authStore.checkAuth();
		authStore.subscribe((state) => {
			isAuthenticated = state.isAuthenticated;
			username = state.username;

			// Redirect to login if not authenticated and not on login page
			if (!state.isAuthenticated && $page.url.pathname !== '/login') {
				goto('/login');
			}
		});
	});

	function handleLogout() {
		authStore.logout();
		goto('/login');
	}
</script>

<svelte:head>
	<title>Jarvis Observatory - Business Intelligence Dashboard</title>
</svelte:head>

{#if $page.url.pathname === '/login'}
	<!-- Login page - full screen without sidebar -->
	<main class="min-h-screen">
		{@render children?.()}
	</main>
{:else}
	<!-- Dashboard - with sidebar -->
	<div class="min-h-screen flex">
		<!-- Sidebar -->
		<aside class="w-64 bg-dark-800 border-r border-white/10 flex flex-col">
			<div class="p-6 border-b border-white/10">
				<h1
					class="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
				>
					Jarvis Observatory
				</h1>
				<p class="text-sm text-white/60 mt-1">Business Intelligence</p>
			</div>

			<nav class="flex-1 p-4">
				<ul class="space-y-1">
					{#each navItems as item}
						<li>
							<a
								href={item.path}
								class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {$page.url
									.pathname === item.path
									? 'bg-primary/20 text-primary'
									: 'text-white/70 hover:bg-white/5 hover:text-white'}"
							>
								<span class="text-xl">{item.icon}</span>
								<span class="font-medium">{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<div class="p-4 border-t border-white/10">
				<!-- User info -->
				{#if username}
					<div class="mb-3">
						<div class="text-xs text-white/50 mb-1">Logged in as</div>
						<div class="text-sm font-medium text-white/90">{username}</div>
					</div>
				{/if}

				<!-- System status -->
				<div class="flex items-center justify-between text-xs text-white/50 mb-3">
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
						System Online
					</div>
				</div>

				<!-- Logout button -->
				<button
					onclick={handleLogout}
					class="w-full btn btn-sm bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400"
				>
					🚪 Logout
				</button>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 overflow-auto">
			{@render children?.()}
		</main>
	</div>
{/if}
