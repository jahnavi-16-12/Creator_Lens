'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Bookmark, Send, Loader2, CheckCircle } from 'lucide-react';
import { streamChat, getChatHistory, Citation, Message as ApiMessage, SavedChat } from '../../lib/api';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

// ─── Local Types ────────────────────────────────────────────────────────────

interface Message extends ApiMessage {
  isStreaming?: boolean;
}

interface ChatPanelProps {
  sessionId: string;
}

// ─── Suggested Questions ──────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Why did Video A get more engagement than Video B?',
  'Compare the hooks in the first 5 seconds',
  'What is the engagement rate of each video?',
  'Suggest improvements for Video B',
  'Who created Video B and what are their stats?',
  'What topics does Video A cover?',
];

export default function ChatPanel({ sessionId }: ChatPanelProps) {
  const searchParams = useSearchParams();
  const restore = searchParams.get('restore');
  const threadFromUrl = searchParams.get('thread');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showCheckCircle, setShowCheckCircle] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);

  // ─── Load Session Data / Restore Saved Chat ───
  useEffect(() => {
    if (restore === 'true' && threadFromUrl) {
      // 1. First try: load from saved chats in localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('cl_saved_chats') || '[]');
        const match = saved.find((c: SavedChat) => c.thread_id === threadFromUrl);
        if (match?.messages && match.messages.length > 0) {
          setMessages(match.messages);
          setThreadId(threadFromUrl);
          return;
        }
      } catch (e) {
        console.error('Failed to load saved chat from localStorage:', e);
      }

      // 2. Fallback: fetch from API
      getChatHistory(threadFromUrl)
        .then((history) => {
          setMessages(history);
          setThreadId(threadFromUrl);
        })
        .catch((err) => {
          console.error('Failed to load chat history from API:', err);
        });
    } else {
      // Normal load — check localStorage for existing thread
      const storedThreadId = localStorage.getItem(`cl_thread_${sessionId}`);
      if (storedThreadId) {
        setThreadId(storedThreadId);
        getChatHistory(storedThreadId)
          .then((history) => {
            setMessages(history);
          })
          .catch((err) => {
            console.error('Failed to load chat history:', err);
          });
      } else {
        setMessages([]);
        setThreadId(null);
      }
    }

    // Cleanup active streams on unmount or session/restore change
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
    };
  }, [sessionId, restore, threadFromUrl]);

  // ─── Sync Bookmark State when Thread ID Changes ───
  useEffect(() => {
    if (!threadId) {
      setIsBookmarked(false);
      return;
    }
    const savedChatsStr = localStorage.getItem('cl_saved_chats');
    if (savedChatsStr) {
      try {
        const savedChats = JSON.parse(savedChatsStr);
        if (Array.isArray(savedChats)) {
          const exists = savedChats.some((c: SavedChat) => c.thread_id === threadId);
          setIsBookmarked(exists);
        }
      } catch (e) {
        setIsBookmarked(false);
      }
    } else {
      setIsBookmarked(false);
    }
  }, [threadId, messages]);

  // ─── Auto-Scroll to Bottom ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // ─── Toggle Bookmark / Save to cl_saved_chats ───
  const handleBookmarkToggle = () => {
    if (messages.length === 0 || !threadId) return;

    const savedChatsStr = localStorage.getItem('cl_saved_chats');
    let savedChats: SavedChat[] = [];
    if (savedChatsStr) {
      try {
        const parsed = JSON.parse(savedChatsStr);
        if (Array.isArray(parsed)) {
          savedChats = parsed;
        }
      } catch (e) {}
    }

    const exists = savedChats.some((c) => c.thread_id === threadId);
    let updatedChats: SavedChat[] = [];

    if (exists) {
      // Unsave/delete it
      updatedChats = savedChats.filter((c) => c.thread_id !== threadId);
      setIsBookmarked(false);
    } else {
      // Save it
      const newSaved: SavedChat = {
        thread_id: threadId,
        session_id: sessionId,
        saved_at: new Date().toISOString(),
        title: messages.find(m => m.role === 'user')?.content?.slice(0, 60) ?? 'Untitled chat',
        preview: messages.find(m => m.role === 'assistant')?.content?.slice(0, 100) ?? '',
        message_count: messages.length,
        messages: messages,
      };

      updatedChats = [newSaved, ...savedChats];
      setIsBookmarked(true);
      
      // Show check circle briefly
      setShowCheckCircle(true);
      setTimeout(() => {
        setShowCheckCircle(false);
      }, 2000);
    }

    localStorage.setItem('cl_saved_chats', JSON.stringify(updatedChats));
  };

  // ─── Chat submission ───
  const submitMessage = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isStreaming) return;

    // Add user message
    const userMsg: Message = {
      role: 'user',
      content: trimmed,
    };

    // Add empty AI message with isStreaming: true
    const aiMsg: Message = {
      role: 'assistant',
      content: '',
      citations: [],
      isStreaming: true,
    };

    // Compute synchronously from the current messages closure so it's always
    // defined by the time onCitations fires (setState updaters run async).
    // messages.length = N → userMsg lands at N, aiMsg lands at N + 1.
    const currentMsgIndex = messages.length + 1;
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setIsStreaming(true);

    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let accumulatedContent = '';
    let accumulatedCitations: Citation[] = [];

    // Cancel prior streams if any are running
    if (streamCleanupRef.current) {
      streamCleanupRef.current();
    }

    // Call streamChat API
    streamCleanupRef.current = streamChat(
      trimmed,
      sessionId,
      threadId,
      // onToken
      (token: string) => {
        accumulatedContent += token;
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const lastIdx = next.length - 1;
          next[lastIdx] = {
            ...next[lastIdx],
            content: accumulatedContent,
          };
          return next;
        });
      },
      // onCitations
      (citations: Citation[]) => {
        accumulatedCitations = citations;
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const idx = currentMsgIndex ?? next.length - 1;
          if (next[idx]) {
            next[idx] = {
              ...next[idx],
              citations: accumulatedCitations,
            };
          }
          return next;
        });
      },
      // onDone
      (newThreadId: string) => {
        localStorage.setItem(`cl_thread_${sessionId}`, newThreadId);
        setThreadId(newThreadId);
        setIsStreaming(false);
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const lastIdx = next.length - 1;
          next[lastIdx] = {
            ...next[lastIdx],
            content: accumulatedContent,
            citations: accumulatedCitations,
            isStreaming: false,
          };
          return next;
        });
        streamCleanupRef.current = null;
      },
      // onError
      (err: string) => {
        setIsStreaming(false);
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const lastIdx = next.length - 1;
          next[lastIdx] = {
            ...next[lastIdx],
            content: accumulatedContent
              ? `${accumulatedContent}\n\n⚠️ Error: ${err}`
              : `⚠️ Error: ${err}`,
            isStreaming: false,
          };
          return next;
        });
        streamCleanupRef.current = null;
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #1e293b', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left Side */}
        <div className="flex items-center">
          <MessageSquare size={16} className="text-blue-500" />
          <span className="text-sm font-semibold text-white ml-2">AI Analysis Chat</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#1f2937] text-purple-400 px-2 py-1 rounded-full">
            Gemini 2.5 Flash
          </span>
          <button
            onClick={handleBookmarkToggle}
            disabled={messages.length === 0 || !threadId}
            className="p-1 hover:bg-[#1f2937] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={messages.length === 0 || !threadId ? 'Send a message first to bookmark' : (isBookmarked ? 'Unsave chat' : 'Save chat')}
          >
            {showCheckCircle ? (
              <CheckCircle size={14} className="text-green-400" />
            ) : (
              <Bookmark
                size={14}
                className={isBookmarked ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}
              />
            )}
          </button>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="space-y-4">
        {messages.length === 0 ? (
          /* Suggested questions grid */
          <div className="flex flex-col justify-center h-full max-w-2xl mx-auto py-6">
            <div className="text-center mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg mx-auto mb-2">
                💬
              </div>
              <h3 className="text-sm font-bold text-gray-200">Start a Conversation</h3>
              <p className="text-xs text-gray-400 mt-1">
                Ask about the video performance, content strategies, hooks, or metrics.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {SUGGESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => submitMessage(question)}
                  className="bg-[#0d1424] border border-[#1e293b] hover:border-blue-500/50 rounded-lg p-3 text-xs text-gray-400 hover:text-gray-200 cursor-pointer transition-all text-left"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';

              if (isUser) {
                return (
                  <div key={index} className="flex justify-end">
                    <div className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[80%] break-words whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // AI Message layout
              return (
                <div key={index} className="flex flex-col">
                  <div className="flex justify-start gap-2">
                    {/* Avatar */}
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                      AI
                    </div>
                    {/* Bubble */}
                    <div className="bg-[#1f2937] text-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[85%] break-words">
                      <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        {msg.content ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                              strong: ({ children }) => <strong style={{ color: '#f9fafb', fontWeight: 600 }}>{children}</strong>,
                              ul: ({ children }) => <ul style={{ paddingLeft: '16px', margin: '4px 0' }}>{children}</ul>,
                              li: ({ children }) => <li style={{ marginBottom: '2px', color: '#d1d5db' }}>{children}</li>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.isStreaming && '\u00A0'
                        )}
                        {msg.isStreaming && (
                          <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Citations below AI bubble — expandable block */}
                  {!msg.isStreaming && msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: '8px', marginLeft: '32px' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.05em' }}>
                        SOURCES
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {msg.citations.map((c, i) => (
                          <div key={i} style={{
                            backgroundColor: '#0d1424',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: c.snippet ? '4px' : '0' }}>
                              <span style={{
                                backgroundColor: c.video_label === 'A' ? '#1e3a5f' : '#2d1b4e',
                                color: c.video_label === 'A' ? '#60a5fa' : '#c084fc',
                                padding: '1px 8px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 700
                              }}>
                                Video {c.video_label}
                              </span>
                              <span style={{ color: '#4b5563', fontSize: '10px' }}>
                                {c.chunk_index === 'metadata' ? 'Metadata' : `Chunk ${c.chunk_index}`}
                              </span>
                            </div>
                            {c.snippet && (
                              <div style={{ color: '#9ca3af', fontSize: '11px', lineHeight: '1.5', marginTop: '4px', fontStyle: 'italic' }}>
                                &quot;{c.snippet}&quot;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid #1e293b',
          padding: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
          backgroundColor: '#111827',
        }}
      >
        <div className="flex-grow flex flex-col">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about engagement, content, strategy..."
            className="flex-grow bg-[#0d1424] border border-[#1e293b] focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none resize-none min-h-[44px] max-h-[120px]"
            rows={1}
          />
          <div className="text-[10px] text-gray-700 mt-1">
            Shift+Enter for new line · Enter to send
          </div>
        </div>

        <button
          onClick={() => submitMessage(input)}
          disabled={!input.trim() || isStreaming}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-xl p-2.5 flex-shrink-0 transition-colors flex items-center justify-center w-11 h-11 shadow"
        >
          {isStreaming ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Send size={16} className="text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
