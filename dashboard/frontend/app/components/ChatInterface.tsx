'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Trash2, Download, Copy, CheckCheck, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { VoiceInput } from './VoiceInput';
import { VoiceOutput } from './VoiceOutput';

// Get API URL from environment or use default
const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'desktop' | 'web' | 'chatgpt' | 'iphone';
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string>(() => {
    // Generate unique conversation ID for this session
    return `web-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string>('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestInProgressRef = useRef<boolean>(false);
  const API_URL = getApiUrl();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // WebSocket connection
  useEffect(() => {
    // Use WS_URL from environment or construct from API URL
    const getWsUrl = () => {
      if (process.env.NEXT_PUBLIC_WS_URL) {
        return process.env.NEXT_PUBLIC_WS_URL;
      }
      const apiUrl = getApiUrl();
      // Convert http to ws
      return apiUrl.replace('http://', 'ws://').replace('https://', 'wss://').replace(':5001', ':4000');
    };

    const wsUrl = `${getWsUrl()}/ws?source=web&conversationId=${conversationId}`;

    console.log('🔌 Connecting to WebSocket:', wsUrl);

    let shouldConnect = true;

    const connectWebSocket = () => {
      // Prevent duplicate connections
      if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
        console.log('⚠️ WebSocket already exists, skipping connection');
        return;
      }

      if (!shouldConnect) {
        console.log('⚠️ Connection cancelled - component unmounted');
        return;
      }

      // Small delay to ensure cleanup completes (helps with React StrictMode)
      setTimeout(() => {
        if (!shouldConnect) return;

        const websocket = new WebSocket(wsUrl);
        wsRef.current = websocket;

        websocket.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);

          // Join conversation room
          websocket.send(JSON.stringify({
            type: 'join',
            conversationId,
            source: 'web'
          }));
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message:', data);

            if (data.type === 'message' && data.source !== 'web' && data.message) {
              // Message from another source (desktop, chatgpt, etc.)
              const newMessage: Message = {
                id: data.message.id,
                role: data.message.role,
                content: data.message.content,
                timestamp: data.message.timestamp,
                source: data.source
              };

              setMessages((prev) => {
                // Prevent duplicates
                if (prev.find(m => m.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        websocket.onerror = (error) => {
          // Only log errors if we're not in the process of cleaning up
          // In dev mode, StrictMode causes intentional close during mount/unmount cycle
          if (shouldConnect && wsRef.current === websocket) {
            console.error('❌ WebSocket error:', error);
          }
        };

        websocket.onclose = (event) => {
          // Suppress logging for normal cleanup (code 1000) during StrictMode
          if (event.code !== 1000 || shouldConnect) {
            console.log('🔌 WebSocket disconnected', event.code === 1000 ? '(normal)' : `(code: ${event.code})`);
          }

          setIsConnected(false);

          // Only clear wsRef if this is the current connection
          if (wsRef.current === websocket) {
            wsRef.current = null;
          }

          // Only reconnect if component is still mounted and should reconnect
          // And this wasn't a normal closure (1000)
          if (shouldConnect && event.code !== 1000) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Reconnecting WebSocket...');
              connectWebSocket();
            }, 3000);
          }
        };

        setWs(websocket);
      }, 100); // 100ms delay to let StrictMode cleanup complete
    };

    connectWebSocket();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      shouldConnect = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        const currentWs = wsRef.current;
        wsRef.current = null;

        // Only close if not already closing or closed
        if (currentWs.readyState === WebSocket.OPEN || currentWs.readyState === WebSocket.CONNECTING) {
          try {
            currentWs.close(1000, 'Component unmounted');
          } catch (error) {
            // Ignore errors during cleanup - connection may already be closed
            console.log('⚠️ WebSocket cleanup error (expected in dev mode):', error);
          }
        }
      }

      setIsConnected(false);
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Prevent duplicate requests (React StrictMode can double-invoke)
    if (requestInProgressRef.current) {
      console.log('⚠️ Request already in progress, skipping duplicate');
      return;
    }

    requestInProgressRef.current = true;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: input,
          conversationId: conversationId || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'start') {
              if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
              }
            } else if (data.type === 'token') {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                  // Create new message object instead of mutating (fixes React StrictMode duplication)
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: newMessages[lastIndex].content + data.content
                  };
                }
                return newMessages;
              });
            } else if (data.type === 'complete') {
              // Final message already accumulated
              setIsLoading(false);
            } else if (data.type === 'error') {
              console.error('Chat error:', data.error);
              setIsLoading(false);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant' && !newMessages[lastIndex].content) {
          // Create new message object instead of mutating
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: 'Sorry, I encountered an error. Please try again.'
          };
        }
        return newMessages;
      });
      setIsLoading(false);
    } finally {
      requestInProgressRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      // User finished speaking - append to input
      setInput((prev) => {
        const newValue = prev.trim() ? prev + ' ' + transcript.trim() : transcript.trim();
        return newValue;
      });
    }
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice input error:', error);
    // Could add a toast notification here
  };

  const clearConversation = async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      await fetch(`${API_URL}/api/chat/${conversationId}`, {
        method: 'DELETE'
      });
      setMessages([]);
      setConversationId('');
    } catch (error) {
      console.error('Error clearing conversation:', error);
      // Clear locally anyway
      setMessages([]);
      setConversationId('');
    }
  };

  const exportConversation = () => {
    const text = messages
      .map((msg) => `${msg.role.toUpperCase()} [${new Date(msg.timestamp).toLocaleString()}]:\n${msg.content}\n`)
      .join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="glass rounded-t-lg p-4 border-b border-jarvis-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-jarvis-primary to-jarvis-secondary bg-clip-text text-transparent">
              Chat with Jarvis
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-400">
                {messages.length === 0
                  ? 'Start a conversation with your AI assistant'
                  : `${messages.filter((m) => m.role === 'user').length} messages`}
              </p>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Real-time sync' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportConversation}
              disabled={messages.length === 0}
              className="p-2 rounded-lg bg-jarvis-dark/50 border border-jarvis-primary/20 hover:border-jarvis-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export conversation"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={clearConversation}
              disabled={messages.length === 0}
              className="p-2 rounded-lg bg-jarvis-dark/50 border border-jarvis-danger/20 hover:border-jarvis-danger/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear conversation"
            >
              <Trash2 className="w-5 h-5 text-jarvis-danger" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 glass">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-center max-w-md">
              <h3 className="text-xl font-semibold mb-2">Welcome to Jarvis Chat</h3>
              <p className="mb-4">Ask me anything! I can help you with:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="glass rounded-lg p-3 text-left">
                  <span className="text-jarvis-primary">•</span> Generate music tracks
                </div>
                <div className="glass rounded-lg p-3 text-left">
                  <span className="text-jarvis-primary">•</span> Analyze metrics
                </div>
                <div className="glass rounded-lg p-3 text-left">
                  <span className="text-jarvis-primary">•</span> System status
                </div>
                <div className="glass rounded-lg p-3 text-left">
                  <span className="text-jarvis-primary">•</span> Business insights
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onCopy={copyMessage}
              isCopied={copiedId === message.id}
            />
          ))
        )}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 text-gray-400 ml-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Jarvis is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass rounded-b-lg p-4 border-t border-jarvis-primary/20">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak your message... (Shift+Enter for new line)"
            className="flex-1 bg-jarvis-dark/50 border border-jarvis-primary/20 rounded-lg px-4 py-3 focus:outline-none focus:border-jarvis-primary/40 resize-none max-h-32 min-h-[48px]"
            rows={1}
            disabled={isLoading}
          />
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            onError={handleVoiceError}
            continuous={true}
            language="en-US"
            autoStop={30000}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-jarvis-primary to-jarvis-secondary rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Enter to send, Shift+Enter for new line, or click mic to speak</span>
          <span>{input.length} characters</span>
        </div>
      </div>
    </div>
  );
}

// Source Badge Component
function SourceBadge({ source }: { source?: string }) {
  if (!source || source === 'web') return null;

  const badges = {
    desktop: { text: '🖥️ Desktop', color: 'bg-blue-500' },
    chatgpt: { text: '🤖 ChatGPT', color: 'bg-green-500' },
    iphone: { text: '📱 iPhone', color: 'bg-purple-500' }
  };

  const badge = badges[source as keyof typeof badges];
  if (!badge) return null;

  return (
    <span className={`${badge.color} text-white text-xs px-2 py-1 rounded-full`}>
      {badge.text}
    </span>
  );
}

function MessageBubble({
  message,
  onCopy,
  isCopied
}: {
  message: Message;
  onCopy: (id: string, content: string) => void;
  isCopied: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[80%] rounded-2xl p-4 ${
          isUser
            ? 'bg-gradient-to-r from-jarvis-primary to-jarvis-secondary text-white'
            : 'glass border border-jarvis-primary/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm opacity-70">
              {isUser ? 'You' : 'Jarvis'}
            </span>
            <SourceBadge source={message.source} />
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isUser && message.content && (
              <VoiceOutput
                text={message.content}
                autoPlay={false}
                rate={1}
                pitch={1}
                volume={1}
              />
            )}
            <button
              onClick={() => onCopy(message.id, message.content)}
              className="p-1 hover:bg-white/10 rounded"
              title="Copy message"
            >
              {isCopied ? (
                <CheckCheck className="w-4 h-4 text-jarvis-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const inline = !match;
                  return inline ? (
                    <code className="bg-jarvis-dark/50 px-1 py-0.5 rounded text-jarvis-secondary" {...props}>
                      {children}
                    </code>
                  ) : (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: '0.5rem 0',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  );
                }
              }}
            >
              {message.content || '_Thinking..._'}
            </ReactMarkdown>
          </div>
        )}
        <div className="text-xs opacity-50 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
