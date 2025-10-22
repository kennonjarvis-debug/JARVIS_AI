<script lang="ts">
	import { onMount } from 'svelte';

	let isOpen = $state(false);
	let messages = $state<Array<{ role: 'jarvis' | 'user'; content: string; timestamp: Date }>>([]);
	let inputValue = $state('');
	let isTyping = $state(false);
	let insights = $state<Array<{ id: string; message: string; action?: string }>>([]);

	const jarvisPersonality = {
		greeting: [
			"Good day! I've been analyzing the metrics - quite impressive growth in marketing. Care to discuss?",
			"Hello! I notice 3 approvals pending. Shall we review them together?",
			"Greetings! Your sales conversion rate improved 12% this week. Want the full breakdown?"
		],
		insights: [
			{
				id: '1',
				message:
					"📊 I've detected an unusual spike in marketing engagement (+18%). Your Twitter posts at 2 PM PST are performing exceptionally well. Consider scheduling more content in that window.",
				action: 'View Marketing'
			},
			{
				id: '2',
				message:
					"💰 Sales pipeline value jumped to $24.5k. However, 4 leads have been 'qualified' for 3+ days without follow-up. The Operations Agent could auto-schedule follow-up emails.",
				action: 'Review Sales'
			},
			{
				id: '3',
				message:
					"⚡ System performance is excellent (98.4% success rate), but I'm seeing 3 API errors today. All from the same endpoint. Might be worth investigating.",
				action: 'View Logs'
			}
		]
	};

	onMount(() => {
		// Show initial insights after a delay
		setTimeout(() => {
			insights = jarvisPersonality.insights;
		}, 3000);

		// Greet user when first opened
		const hasGreeted = sessionStorage.getItem('jarvis_greeted');
		if (!hasGreeted) {
			const greeting =
				jarvisPersonality.greeting[
					Math.floor(Math.random() * jarvisPersonality.greeting.length)
				];
			messages = [{ role: 'jarvis', content: greeting, timestamp: new Date() }];
		}
	});

	async function sendMessage() {
		if (!inputValue.trim()) return;

		const userMessage = inputValue.trim();
		inputValue = '';

		messages = [...messages, { role: 'user', content: userMessage, timestamp: new Date() }];

		isTyping = true;

		// Simulate AI response
		setTimeout(() => {
			const response = generateResponse(userMessage);
			messages = [...messages, { role: 'jarvis', content: response, timestamp: new Date() }];
			isTyping = false;

			// Mark as greeted
			sessionStorage.setItem('jarvis_greeted', 'true');
		}, 1000 + Math.random() * 1000);
	}

	function generateResponse(userInput: string): string {
		const input = userInput.toLowerCase();

		// Simple pattern matching for demo
		if (input.includes('marketing') || input.includes('social')) {
			return "Marketing is performing remarkably well! We posted 8 times today with a 12.4% engagement rate - that's up 18% from last week. Twitter engagement spiked between 2-4 PM PST. I'd recommend scheduling our most important content in that window. Want me to analyze which post types perform best?";
		}

		if (input.includes('sales') || input.includes('leads')) {
			return "Sales metrics show healthy growth. We qualified 8 out of 12 new leads today (66.7% qualification rate). However, I noticed 4 qualified leads haven't received follow-ups in 3+ days. The Sales Agent could auto-send personalized follow-up sequences. Current pipeline value is $24.5k. Shall I break down the pipeline by stage?";
		}

		if (input.includes('operations') || input.includes('health')) {
			return "Operations are running smoothly with a 98.4% success rate today. We completed 127 tasks across all agents. System health is at 100%, and all 24 data syncs completed without errors. I did notice 3 minor API errors from the same endpoint - might be worth a quick investigation. Everything else is green across the board.";
		}

		if (input.includes('support') || input.includes('tickets') || input.includes('customer')) {
			return "Customer service metrics are solid. We resolved 12 out of 15 tickets today with an average response time of 8 minutes. Customer satisfaction is at 94%. The Support Agent auto-resolved 8 tickets using our knowledge base. 3 tickets required human intervention - all complex billing questions. Want me to flag patterns in unresolved tickets?";
		}

		if (input.includes('approval') || input.includes('pending')) {
			return "You have 3 items pending approval:\n\n1. Bulk email campaign to 1,500 recipients (Sales)\n2. $150 refund request (Support)\n3. New social media campaign budget $200 (Marketing)\n\nAll fall within normal parameters. I'd recommend approving all three, but the final call is yours. Want details on any of them?";
		}

		if (input.includes('help') || input.includes('what can you')) {
			return "I'm here to help you monitor and optimize business operations! I can:\n\n📊 Analyze metrics and spot trends\n💡 Provide proactive insights\n🔍 Deep-dive into any module\n✅ Help review approvals\n📈 Track performance over time\n🤖 Explain agent behaviors\n\nJust ask me about marketing, sales, operations, support, or any specific metric you'd like to explore!";
		}

		// Default responses
		const defaultResponses = [
			"Interesting question! Let me analyze the relevant data... Based on current metrics, everything appears to be operating normally. Is there a specific area you'd like me to investigate further?",
			"I'm not entirely sure I understood that, but I'm always learning! Could you rephrase or ask about specific metrics like marketing, sales, operations, or support?",
			"That's outside my current knowledge base, but I can help you with marketing metrics, sales pipeline analysis, operational health checks, or customer support trends. What would you like to explore?"
		];

		return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
	}

	function dismissInsight(id: string) {
		insights = insights.filter((i) => i.id !== id);
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
	}
</script>

<!-- Floating Insights (when chat is closed) -->
{#if !isOpen && insights.length > 0}
	<div class="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
		{#each insights as insight}
			<div
				class="bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-xl border border-primary/30 rounded-lg p-4 shadow-2xl animate-slide-in"
			>
				<div class="flex items-start gap-3">
					<div class="text-2xl">🤖</div>
					<div class="flex-1 min-w-0">
						<div class="font-medium text-sm mb-2">{insight.message}</div>
						<div class="flex gap-2">
							{#if insight.action}
								<button
									class="text-xs px-3 py-1 bg-primary/30 hover:bg-primary/40 text-primary rounded transition-colors"
								>
									{insight.action}
								</button>
							{/if}
							<button
								class="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
								onclick={() => dismissInsight(insight.id)}
							>
								Dismiss
							</button>
							<button
								class="text-xs px-3 py-1 bg-secondary/30 hover:bg-secondary/40 text-secondary rounded transition-colors"
								onclick={() => (isOpen = true)}
							>
								Chat with Jarvis
							</button>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Chat Interface -->
<div
	class="fixed bottom-6 right-6 z-50 transition-all duration-300"
	class:translate-y-0={isOpen}
	class:translate-y-full={!isOpen}
>
	{#if !isOpen}
		<button
			onclick={() => (isOpen = true)}
			class="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 transition-transform"
			title="Chat with Jarvis"
		>
			🤖
		</button>
	{/if}

	{#if isOpen}
		<div
			class="w-96 h-[600px] bg-dark-800 border border-primary/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
		>
			<!-- Header -->
			<div class="bg-gradient-to-r from-primary/20 to-secondary/20 p-4 border-b border-white/10">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="text-3xl">🤖</div>
						<div>
							<div class="font-bold text-lg">Jarvis</div>
							<div class="text-xs text-white/60">AI Business Copilot</div>
						</div>
					</div>
					<button
						onclick={() => (isOpen = false)}
						class="text-white/60 hover:text-white transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							></path>
						</svg>
					</button>
				</div>
			</div>

			<!-- Messages -->
			<div class="flex-1 overflow-y-auto p-4 space-y-4">
				{#if messages.length === 0}
					<div class="text-center text-white/40 mt-8">
						<div class="text-4xl mb-3">👋</div>
						<div class="font-medium mb-2">Hello! I'm Jarvis</div>
						<div class="text-sm">
							Your AI copilot for business intelligence. Ask me anything about your metrics,
							operations, or let me share insights I've discovered.
						</div>
					</div>
				{:else}
					{#each messages as message}
						<div class="flex gap-3 {message.role === 'user' ? 'justify-end' : ''}">
							{#if message.role === 'jarvis'}
								<div class="text-2xl">🤖</div>
							{/if}
							<div
								class="max-w-[80%] p-3 rounded-lg {message.role === 'user'
									? 'bg-primary/30 text-white'
									: 'bg-white/10 text-white/90'}"
							>
								<div class="text-sm whitespace-pre-line">{message.content}</div>
								<div class="text-xs text-white/40 mt-1">{formatTime(message.timestamp)}</div>
							</div>
						</div>
					{/each}

					{#if isTyping}
						<div class="flex gap-3">
							<div class="text-2xl">🤖</div>
							<div class="bg-white/10 p-3 rounded-lg">
								<div class="flex gap-1">
									<div class="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
									<div class="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
									<div class="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
								</div>
							</div>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Input -->
			<div class="p-4 border-t border-white/10">
				<form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="flex gap-2">
					<input
						bind:value={inputValue}
						type="text"
						placeholder="Ask Jarvis anything..."
						class="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors"
					/>
					<button
						type="submit"
						class="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors font-medium"
					>
						Send
					</button>
				</form>
				<div class="text-xs text-white/40 mt-2 text-center">
					Powered by Claude Sonnet 4.5 • Real-time insights
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}

	.delay-100 {
		animation-delay: 0.1s;
	}

	.delay-200 {
		animation-delay: 0.2s;
	}
</style>
