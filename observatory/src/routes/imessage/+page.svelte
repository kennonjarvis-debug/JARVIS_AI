<script lang="ts">
	import { onMount } from 'svelte';

	let messages = $state<any[]>([]);
	let conversations = $state<any[]>([]);
	let selectedConversation = $state<string | null>(null);
	let newMessage = $state('');
	let agentStatus = $state({
		isRunning: false,
		messagesProcessed: 0,
		lastActivity: null
	});
	let autoRefresh = $state(true);

	onMount(async () => {
		fetchData();

		const interval = setInterval(() => {
			if (autoRefresh) {
				fetchData();
			}
		}, 3000);

		return () => clearInterval(interval);
	});

	async function fetchData() {
		try {
			// Fetch agent status
			const statusResponse = await fetch('/api/obs/imessage/status');
			if (statusResponse.ok) {
				agentStatus = await statusResponse.json();
			}

			// Fetch messages
			const messagesResponse = await fetch('/api/obs/imessage/messages');
			if (messagesResponse.ok) {
				const data = await messagesResponse.json();
				messages = data.messages || getMockMessages();
			}

			// Fetch conversations
			const convsResponse = await fetch('/api/obs/imessage/conversations');
			if (convsResponse.ok) {
				const data = await convsResponse.json();
				conversations = data.conversations || getMockConversations();
			}
		} catch (error) {
			console.error('Failed to fetch iMessage data:', error);
			messages = getMockMessages();
			conversations = getMockConversations();
		}
	}

	function getMockMessages() {
		return [
			{
				id: '1',
				from: '+16234322236',
				text: 'I love hands on and fast pace! What\'s the hardest part? Haha',
				timestamp: new Date().toISOString(),
				isFromMe: false,
				routing: { intent: 'friend', action: 'auto_respond' }
			},
			{
				id: '2',
				from: '+16234322236',
				text: 'Loved "Well it has a bit of everything honestly... customer service, machines for maintenance, HR life...the list is long 😂 But it is hands on',
				timestamp: new Date(Date.now() - 30000).toISOString(),
				isFromMe: true,
				routing: { intent: 'friend', action: 'auto_respond' }
			}
		];
	}

	function getMockConversations() {
		return [
			{
				contact: '+16234322236',
				name: 'Contact',
				avatar: 'DP',
				lastMessage: 'I love hands on and fast pace!',
				messageCount: 5,
				lastActivity: new Date().toISOString(),
				isAllowed: true
			}
		];
	}

	async function sendMessage() {
		if (!newMessage.trim() || !selectedConversation) return;

		try {
			const response = await fetch('/api/obs/imessage/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: selectedConversation,
					message: newMessage
				})
			});

			if (response.ok) {
				newMessage = '';
				fetchData();
			}
		} catch (error) {
			console.error('Failed to send message:', error);
		}
	}

	function formatTime(iso: string) {
		const date = new Date(iso);
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function getInitials(name: string, contact: string) {
		if (name && name !== contact) {
			return name
				.split(' ')
				.map(n => n[0])
				.join('')
				.toUpperCase()
				.substring(0, 2);
		}
		return contact.substring(0, 2);
	}

	const conversationMessages = $derived(
		selectedConversation
			? messages.filter((m) => m.from === selectedConversation)
			: []
	);

	const selectedConvData = $derived(
		conversations.find((c) => c.contact === selectedConversation)
	);
</script>

<div class="imessage-container">
	<!-- Left Sidebar: Conversations List -->
	<div class="imessage-sidebar">
		<!-- Header -->
		<div class="sidebar-header">
			<div class="flex items-center gap-2">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
				</svg>
				<span class="font-medium">Messages</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="status-dot {agentStatus.isRunning ? 'active' : ''}"></div>
				<span class="text-xs text-gray-400">{agentStatus.isRunning ? 'Active' : 'Inactive'}</span>
			</div>
		</div>

		<!-- Conversations List -->
		<div class="conversations-list">
			{#each conversations as conv}
				<button
					class="conversation-item {selectedConversation === conv.contact ? 'selected' : ''}"
					onclick={() => (selectedConversation = conv.contact)}
				>
					<div class="conversation-avatar">
						<div class="avatar-circle">
							{getInitials(conv.name, conv.contact)}
						</div>
					</div>
					<div class="conversation-content">
						<div class="conversation-header">
							<span class="conversation-name">{conv.name || conv.contact}</span>
							<span class="conversation-time">{formatTime(conv.lastActivity)}</span>
						</div>
						<div class="conversation-preview">
							{conv.lastMessage}
						</div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Right Panel: Chat View -->
	<div class="imessage-chat">
		{#if selectedConversation && selectedConvData}
			<!-- Chat Header -->
			<div class="chat-header">
				<div class="flex items-center gap-3">
					<div class="avatar-circle-small">
						{getInitials(selectedConvData.name, selectedConvData.contact)}
					</div>
					<div>
						<div class="text-sm font-medium">{selectedConvData.name || selectedConvData.contact}</div>
						<div class="text-xs text-gray-400">{selectedConvData.contact}</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button class="icon-button">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
						</svg>
					</button>
					<button class="icon-button">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</button>
				</div>
			</div>

			<!-- Messages -->
			<div class="messages-container">
				{#each conversationMessages as message}
					<div class="message-wrapper {message.isFromMe ? 'outgoing' : 'incoming'}">
						<div class="message-bubble {message.isFromMe ? 'outgoing' : 'incoming'}">
							{message.text}
						</div>
					</div>
				{/each}
			</div>

			<!-- Input Area -->
			<div class="input-container">
				<input
					type="text"
					bind:value={newMessage}
					placeholder="iMessage"
					class="message-input"
					onkeydown={(e) => e.key === 'Enter' && sendMessage()}
				/>
				<button onclick={sendMessage} class="send-button" disabled={!newMessage.trim()}>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
					</svg>
				</button>
			</div>
		{:else}
			<!-- No conversation selected -->
			<div class="empty-state">
				<svg class="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
				</svg>
				<p class="text-gray-400">Select a conversation to view messages</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.imessage-container {
		display: flex;
		height: calc(100vh - 4rem);
		background: #1a1a1a;
		border-radius: 12px;
		overflow: hidden;
		margin: 1rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.imessage-sidebar {
		width: 320px;
		background: #2c2c2c;
		border-right: 1px solid #3a3a3a;
		display: flex;
		flex-direction: column;
	}

	.sidebar-header {
		padding: 1rem;
		border-bottom: 1px solid #3a3a3a;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #252525;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ef4444;
	}

	.status-dot.active {
		background: #10b981;
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.conversations-list {
		flex: 1;
		overflow-y: auto;
	}

	.conversation-item {
		display: flex;
		gap: 12px;
		padding: 12px 16px;
		background: transparent;
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
		color: white;
	}

	.conversation-item:hover {
		background: #3a3a3a;
	}

	.conversation-item.selected {
		background: #404040;
	}

	.conversation-avatar {
		flex-shrink: 0;
	}

	.avatar-circle {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 16px;
		color: white;
	}

	.avatar-circle-small {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 12px;
		color: white;
	}

	.conversation-content {
		flex: 1;
		min-width: 0;
	}

	.conversation-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 4px;
	}

	.conversation-name {
		font-weight: 500;
		font-size: 14px;
	}

	.conversation-time {
		font-size: 12px;
		color: #888;
	}

	.conversation-preview {
		font-size: 13px;
		color: #999;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.imessage-chat {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #1a1a1a;
	}

	.chat-header {
		padding: 12px 20px;
		border-bottom: 1px solid #2a2a2a;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #222;
	}

	.icon-button {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #3a3a3a;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: #999;
		transition: all 0.15s;
	}

	.icon-button:hover {
		background: #4a4a4a;
		color: white;
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.message-wrapper {
		display: flex;
		margin-bottom: 4px;
	}

	.message-wrapper.incoming {
		justify-content: flex-start;
	}

	.message-wrapper.outgoing {
		justify-content: flex-end;
	}

	.message-bubble {
		max-width: 65%;
		padding: 10px 14px;
		border-radius: 18px;
		font-size: 14px;
		line-height: 1.4;
		word-wrap: break-word;
	}

	.message-bubble.incoming {
		background: #3a3a3a;
		color: white;
		border-bottom-left-radius: 4px;
	}

	.message-bubble.outgoing {
		background: #007aff;
		color: white;
		border-bottom-right-radius: 4px;
	}

	.input-container {
		padding: 16px 20px;
		border-top: 1px solid #2a2a2a;
		display: flex;
		gap: 12px;
		align-items: center;
		background: #222;
	}

	.message-input {
		flex: 1;
		background: #3a3a3a;
		border: 1px solid #4a4a4a;
		border-radius: 20px;
		padding: 8px 16px;
		color: white;
		font-size: 14px;
		outline: none;
		transition: all 0.15s;
	}

	.message-input:focus {
		border-color: #007aff;
		background: #2a2a2a;
	}

	.message-input::placeholder {
		color: #666;
	}

	.send-button {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #007aff;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: white;
		transition: all 0.15s;
	}

	.send-button:hover:not(:disabled) {
		background: #0062cc;
	}

	.send-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #666;
	}
</style>
