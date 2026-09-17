import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Pin,
  Trash2,
  Users,
  ShieldCheck,
  User as UserIcon,
  Radio,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowDown,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { ChatMessage, ChatPresenceUser, User } from '../types';

interface ChatPageProps {
  onNavigate?: (page: any) => void;
}

const SHIFT_PRESET_MESSAGES = [
  '📦 Morning inventory count verified & balanced.',
  '🔔 Low stock notice: Mouth Squash & Wave Rider display needs restock.',
  '💰 Cash drawer balanced and prepared for shift.',
  '🛍️ Store opening: displays and POS checkout ready.',
  '✅ Evening shift handover complete. All receipts reconciled.',
];

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pinOnSend, setPinOnSend] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<ChatPresenceUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch registered users for presence directory
  const loadAllUsers = async () => {
    try {
      const uList = await api.getUsers();
      setAllUsers(uList);
    } catch (e) {
      console.warn('Could not load user list:', e);
    }
  };

  // Fetch initial message history
  const fetchMessages = async () => {
    try {
      const data = await api.getChatMessages();
      setMessages(data.messages || []);
      if (data.online_users) {
        setOnlineUsers(data.online_users);
      }
    } catch (err: any) {
      console.error('Error loading chat messages:', err);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  // WebSocket connection handler
  useEffect(() => {
    fetchMessages();
    loadAllUsers();

    if (!user) return;

    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          // Broadcast current logged in user presence
          ws.send(
            JSON.stringify({
              type: 'join',
              user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
              },
            })
          );
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'new_message' && data.message) {
              setMessages((prev) => {
                // Avoid duplicate if already added
                if (prev.some((m) => m.id === data.message.id)) return prev;
                return [...prev, data.message];
              });
              // Scroll to bottom on new message
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            } else if (data.type === 'delete_message' && data.id) {
              setMessages((prev) => prev.filter((m) => m.id !== data.id));
            } else if (data.type === 'pin_message' && data.id) {
              setMessages((prev) =>
                prev.map((m) => (m.id === data.id ? { ...m, pinned: data.pinned } : m))
              );
            } else if (data.type === 'presence_update' && Array.isArray(data.users)) {
              setOnlineUsers(data.users);
            } else if (data.type === 'user_typing') {
              const typingName = data.user?.name || data.user?.username;
              if (data.isTyping && typingName && typingName !== user.name) {
                setTypingUsers((prev) => Array.from(new Set([...prev, typingName])));
              } else if (!data.isTyping && typingName) {
                setTypingUsers((prev) => prev.filter((n) => n !== typingName));
              }
            }
          } catch (e) {
            console.error('Error handling WS message:', e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Auto reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            if (isMounted) connectWebSocket();
          }, 3000);
        };

        ws.onerror = (err) => {
          console.warn('WebSocket connection error:', err);
          ws.close();
        };
      } catch (err) {
        console.warn('Could not establish WebSocket, falling back to REST:', err);
      }
    };

    connectWebSocket();

    // Fallback periodic sync interval (every 10 seconds)
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 10000);

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  // Scroll to bottom when messages finish initial loading
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading]);

  // Handle scroll detection for "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Broadcast typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          isTyping: true,
        })
      );

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'typing',
              isTyping: false,
            })
          );
        }
      }, 2000);
    }
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();

    const textToSend = (customText !== undefined ? customText : inputMessage).trim();
    if (!textToSend || !user) return;

    setSending(true);
    try {
      // Send via REST API which triggers broadcast and DB persistence
      const savedMsg = await api.postChatMessage({
        message: textToSend,
        user_id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        pinned: pinOnSend,
      });

      // Optimistic append if not already arrived via WebSocket
      setMessages((prev) => {
        if (prev.some((m) => m.id === savedMsg.id)) return prev;
        return [...prev, savedMsg];
      });

      setInputMessage('');
      setPinOnSend(false);
      setTimeout(scrollToBottom, 50);

      // Stop typing status
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'typing',
            isTyping: false,
          })
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to post message');
    } finally {
      setSending(false);
    }
  };

  // Toggle Pin message
  const handleTogglePin = async (msg: ChatMessage) => {
    try {
      await api.togglePinChatMessage(msg.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, pinned: !m.pinned } : m))
      );
      toast.success(msg.pinned ? 'Message unpinned' : 'Message pinned to top');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pin');
    }
  };

  // Confirm delete
  const handleDeleteMessage = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteChatMessage(deleteTarget.id);
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      toast.success('Message deleted');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date helper
  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatMessageDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (d.toDateString() === today.toDateString()) {
        return 'Today';
      }
      if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return dateStr;
    }
  };

  const pinnedMessages = messages.filter((m) => m.pinned);

  // Group messages by date
  const groupedMessages: { date: string; items: ChatMessage[] }[] = [];
  let currentDate = '';
  for (const m of messages) {
    const dStr = formatMessageDate(m.created_at);
    if (dStr !== currentDate) {
      currentDate = dStr;
      groupedMessages.push({ date: dStr, items: [m] });
    } else {
      groupedMessages[groupedMessages.length - 1].items.push(m);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* TOP USER IDENTITY & PRESENCE BAR */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-925 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Active Logged In User Info */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md border ${
                  user?.role === 'admin'
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                    : 'bg-blue-950/80 border-blue-500/60 text-blue-300'
                }`}
              >
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'ME'}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
                title={isConnected ? 'Connected live' : 'Offline / Polling'}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Logged in as:
                </span>
                <span className="font-bold text-sm sm:text-base text-zinc-100 font-['Space_Grotesk']">
                  {user?.name || 'Staff Member'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    user?.role === 'admin'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                  }`}
                >
                  {user?.role === 'admin' ? 'Store Admin' : 'Cashier Staff'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <span>@{user?.username}</span>
                <span>•</span>
                <span className="text-zinc-500">
                  Ready to post announcements & shift handovers
                </span>
              </p>
            </div>
          </div>

          {/* Connection & Presence Status Pill */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                isConnected
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-zinc-850 border-zinc-750 text-zinc-400'
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`}
              />
              <span>{isConnected ? 'Real-Time Live' : 'HTTP Sync'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold text-zinc-100">
                {onlineUsers.length > 0 ? onlineUsers.length : 1}
              </span>
              <span className="text-zinc-400">Online</span>
            </div>

            <button
              type="button"
              onClick={fetchMessages}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 transition-colors"
              title="Refresh messages"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CHAT MAIN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT/MAIN CHAT FEED (8-9 columns) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm h-[680px]">
          {/* Chat Window Header */}
          <div className="px-5 py-3.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100 font-['Space_Grotesk']">
                  FEELFST Team Channel
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Shared board for shift logs, inventory notices & handovers
                </p>
              </div>
            </div>

            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 italic animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{typingUsers.join(', ')} typing...</span>
              </div>
            )}
          </div>

          {/* PINNED ANNOUNCEMENTS BANNER */}
          {pinnedMessages.length > 0 && (
            <div className="bg-amber-950/30 border-b border-amber-900/40 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
                <span>Pinned Shift Notices & Announcements</span>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {pinnedMessages.map((pm) => (
                  <div
                    key={`pin-${pm.id}`}
                    className="flex items-start justify-between gap-3 text-xs bg-zinc-950/50 p-2 rounded-xl border border-amber-800/30"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-zinc-200">
                        {pm.name}:{' '}
                      </span>
                      <span className="text-zinc-300">{pm.message}</span>
                    </div>
                    {user?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleTogglePin(pm)}
                        className="text-[10px] text-amber-400 hover:text-amber-200 underline shrink-0 cursor-pointer"
                        title="Unpin message"
                      >
                        Unpin
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGES SCROLL AREA */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5 relative"
          >
            {loading ? (
              <div className="h-full flex items-center justify-center text-zinc-400">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono">Loading team messages...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-850 flex items-center justify-center text-zinc-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-300 text-sm">No messages yet</p>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Be the first to leave a message, record a shift handover, or ask about inventory.
                  </p>
                </div>
              </div>
            ) : (
              groupedMessages.map((group, groupIdx) => (
                <div key={`group-${groupIdx}`} className="space-y-3.5">
                  {/* Date Divider */}
                  <div className="flex items-center justify-center my-2">
                    <span className="px-3 py-1 rounded-full bg-zinc-850 text-zinc-400 text-[10px] font-medium border border-zinc-800">
                      {group.date}
                    </span>
                  </div>

                  {group.items.map((msg) => {
                    const isMe = user?.id === msg.user_id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 group ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Avatar for other users */}
                        {!isMe && (
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                              msg.role === 'admin'
                                ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                                : 'bg-blue-950/60 border-blue-600/50 text-blue-300'
                            }`}
                            title={`${msg.name} (@${msg.username})`}
                          >
                            {msg.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                        )}

                        <div
                          className={`max-w-[82%] sm:max-w-[70%] space-y-1 ${
                            isMe ? 'items-end text-right' : 'items-start text-left'
                          }`}
                        >
                          {/* Sender name & info */}
                          <div
                            className={`flex items-center gap-1.5 text-[11px] ${
                              isMe ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span className="font-bold text-zinc-200">
                              {isMe ? 'You' : msg.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                msg.role === 'admin'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {msg.role}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {msg.pinned && (
                              <span
                                className="inline-flex items-center text-[10px] text-amber-400"
                                title="Pinned message"
                              >
                                <Pin className="w-3 h-3 fill-amber-400/40 ml-0.5" />
                              </span>
                            )}
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`relative p-3 rounded-2xl text-xs leading-relaxed break-words shadow-sm transition-all ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
                                : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-750'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>

                            {/* Message actions on hover */}
                            <div
                              className={`absolute top-1 ${
                                isMe ? '-left-14' : '-right-14'
                              } hidden group-hover:flex items-center gap-1 bg-zinc-900 border border-zinc-750 rounded-lg p-1 shadow-lg z-10`}
                            >
                              <button
                                type="button"
                                onClick={() => handleTogglePin(msg)}
                                className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                                  msg.pinned ? 'text-amber-400' : 'text-zinc-400'
                                }`}
                                title={msg.pinned ? 'Unpin message' : 'Pin to top'}
                              >
                                <Pin className="w-3 h-3" />
                              </button>
                              {(isMe || user?.role === 'admin') && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(msg)}
                                  className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Avatar for current user */}
                        {isMe && (
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                              user?.role === 'admin'
                                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                                : 'bg-blue-950/80 border-blue-500/80 text-blue-300'
                            }`}
                            title={`You (${user?.name})`}
                          >
                            {user?.name
                              ? user.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)
                              : 'ME'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom floating button */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-28 right-8 z-10 p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-lg transition-transform transform active:scale-95 flex items-center gap-1 text-xs font-bold"
            >
              <ArrowDown className="w-4 h-4" />
              <span>Latest</span>
            </button>
          )}

          {/* QUICK PRESET CHIPS */}
          <div className="px-4 py-2 bg-zinc-950/80 border-t border-zinc-850 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Quick:
            </span>
            {SHIFT_PRESET_MESSAGES.map((preset, idx) => (
              <button
                key={`preset-${idx}`}
                type="button"
                onClick={() => handleSendMessage(undefined, preset)}
                disabled={sending}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 hover:border-emerald-500/50 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* COMPOSER / INPUT FORM */}
          <form
            onSubmit={(e) => handleSendMessage(e)}
            className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800 space-y-2"
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>
                  Posting as <strong className="text-zinc-200">{user?.name}</strong>{' '}
                  ({user?.role})
                </span>
              </div>

              {/* Pin checkbox */}
              <label className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinOnSend}
                  onChange={(e) => setPinOnSend(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                />
                <span className="text-[11px]">Pin as shift note</span>
              </label>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Leave a message as ${user?.name}... (Enter to send, Shift+Enter for new line)`}
                rows={2}
                className="flex-1 bg-zinc-900 border border-zinc-750 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-all"
              />

              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="h-[46px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT SIDEBAR: ONLINE TEAM & ACCOUNT DIRECTORY (3-4 columns) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Active Members Card */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200">
                  Team Members Online
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-[10px] font-bold text-emerald-400">
                {onlineUsers.length > 0 ? onlineUsers.length : 1} Active
              </span>
            </div>

            {/* List of active / connected users */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {onlineUsers.length > 0 ? (
                onlineUsers.map((ou) => (
                  <div
                    key={`online-${ou.id}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                            ou.role === 'admin'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {ou.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-zinc-950" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <span>{ou.name}</span>
                          {ou.id === user?.id && (
                            <span className="text-[9px] text-emerald-400 font-bold">
                              (You)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500">@{ou.username}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        ou.role === 'admin'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {ou.role}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center text-[10px] font-bold">
                      {user?.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">
                        {user?.name} (You)
                      </div>
                      <span className="text-[10px] text-zinc-500">@{user?.username}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                    {user?.role}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Store Account Directory & Multi-User Testing Guide */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-zinc-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider">
                Store Staff Accounts
              </h3>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Anyone with an active store login can join the team chat and post shift messages.
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">FEELFST Admin</span>
                  <span className="text-[9px] font-bold uppercase text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] font-mono text-zinc-400">
                  User: <span className="text-zinc-200 font-semibold">admin</span> • Pass:{' '}
                  <span className="text-zinc-200 font-semibold">admin123</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">Cashier Staff</span>
                  <span className="text-[9px] font-bold uppercase text-blue-300 bg-blue-500/15 px-1.5 py-0.5 rounded">
                    Staff
                  </span>
                </div>
                <p className="text-[10px] font-mono text-zinc-400">
                  User: <span className="text-zinc-200 font-semibold">staff</span> • Pass:{' '}
                  <span className="text-zinc-200 font-semibold">staff123</span>
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex items-start gap-2 text-[11px] text-zinc-400">
              <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <span>
                Tip: Open another browser tab or incognito window to log in as Cashier Staff and test live 2-way team chat!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-750 w-full max-w-sm rounded-2xl shadow-2xl p-5 text-zinc-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/80">
                <Trash2 className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-100">Delete Message</h3>
                <p className="text-[11px] text-zinc-400">Remove from team history</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 italic">
              "{deleteTarget.message}"
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete this message? It will be removed for all users.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteMessage}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
