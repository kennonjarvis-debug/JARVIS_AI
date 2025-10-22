<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			// Simple authentication check
			// In production, this should call an API endpoint
			if (username === 'admin' && password === 'jarvis2025') {
				authStore.login(username);
				goto('/');
			} else {
				error = 'Invalid username or password';
			}
		} catch (err: any) {
			error = err.message || 'Login failed';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - Jarvis Observatory</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
	<div class="w-full max-w-md">
		<!-- Logo/Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
				Jarvis Observatory
			</h1>
			<p class="text-white/60">Autonomous Agent Control Hub</p>
		</div>

		<!-- Login Card -->
		<div class="card p-8">
			<h2 class="text-2xl font-bold mb-6">Login</h2>

			{#if error}
				<div class="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
					<p class="text-red-400 text-sm">🔐 {error}</p>
				</div>
			{/if}

			<form onsubmit={handleLogin} class="space-y-6">
				<div>
					<label for="username" class="block text-sm font-medium text-white/70 mb-2">
						Username
					</label>
					<input
						type="text"
						id="username"
						bind:value={username}
						required
						class="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
						placeholder="Enter username"
						disabled={loading}
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-white/70 mb-2">
						Password
					</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						required
						class="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
						placeholder="Enter password"
						disabled={loading}
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full btn btn-primary py-3 text-lg font-semibold {loading ? 'opacity-50 cursor-not-allowed' : ''}"
				>
					{loading ? '🔄 Logging in...' : '🔓 Login'}
				</button>
			</form>

			<div class="mt-6 pt-6 border-t border-white/10">
				<p class="text-sm text-white/50 text-center">
					Default credentials: <code class="bg-black/30 px-2 py-1 rounded">admin / jarvis2025</code>
				</p>
			</div>
		</div>

		<!-- Info Box -->
		<div class="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
			<p class="text-sm text-blue-400">
				<strong>🛡️ Security Note:</strong> This is a basic authentication for development.
				For production, implement proper OAuth/JWT authentication.
			</p>
		</div>
	</div>
</div>
