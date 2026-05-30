'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { streamChat, getChatHistory } from '../../lib/api';
import type { Citation, Message as ApiMessage } from '../../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

interface ChatPanelProps {
  sessionId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function threadKey(sessionId: string): string {
  return `thread_id_${sessionId}`;
}

// ─── Suggested questions ────────────────────────────────────────────────────

const SUGGESTIONS: string[] = [
  'Why did Video A get more engagement than Video B?',
  'Compare the hooks in the first 5 seconds',
  "What's the engagement rate of each video?",
  'Suggest improvements for Video B based on Video A',
  "Who is the creator of Video B and what's their follower count?",
];

// ─── Citation chip with tooltip ─────────────────────────────────────────────

function CitationChip({ citation }: { citation: Citation }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const color =
    citation.video_label === 'A'
      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
      : 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20';

  return (
    <span
      className={`relative inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-default transition-colors ${color}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      Video {citation.video_label} · Chunk {citation.chunk_index}

      {/* Tooltip */}
      {showTooltip && citation.snippet && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-xs z-50 pointer-events-none">
          <span className="block rounded-lg bg-gray-800 border border-gray-600 shadow-xl px-3 py-2 text-xs text-gray-200 leading-relaxed font-normal">
            {citation.snippet}
          </span>
          {/* Arrow */}
          <span className="block w-0 h-0 mx-auto border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-800" />
        </span>
      )}
    </span>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} transition-all duration-200`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
            : 'bg-gray-800 border border-gray-700 text-gray-300'
        }`}
      >
        {isUser ? 'U' : '🔭'}
      </div>

      {/* Content column */}
      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
              : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm'
          }`}
        >
          {message.content || '\u00A0'}
          {/* Blinking cursor while streaming */}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-gray-400 animate-pulse" />
          )}
        </div>

        {/* Citations — only show after streaming is done */}
        {!isUser && !message.isStreaming && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1 mt-0.5">
            {message.citations.map((c, i) => (
              <CitationChip key={`${message.id}-cit-${i}`} citation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator (before first token) ──────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs bg-gray-800 border border-gray-700 text-gray-300">
        🔭
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ─── ChatPanel ──────────────────────────────────────────────────────────────

export default function ChatPanel({ sessionId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Refs to avoid stale closures in streamChat callbacks
  const streamingContentRef = useRef('');
  const streamingCitationsRef = useRef<Citation[]>([]);
  const streamingMsgIdRef = useRef('');

  // ── Mount: load threadId from localStorage & fetch history ──

  useEffect(() => {
    const stored = localStorage.getItem(threadKey(sessionId));
    if (stored) {
      setThreadId(stored);
      setIsLoadingHistory(true);
      getChatHistory(stored)
        .then((history: ApiMessage[]) => {
          const loaded: ChatMessage[] = history.map((m, i) => ({
            id: `hist-${i}-${Date.now()}`,
            role: m.role,
            content: m.content,
            citations: m.citations,
          }));
          setMessages(loaded);
        })
        .catch((err: Error) => {
          console.error('Failed to load chat history:', err);
        })
        .finally(() => setIsLoadingHistory(false));
    }
  }, [sessionId]);

  // ── Auto-scroll on every token ──

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // ── Auto-resize textarea ──

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [inputValue]);

  // ── Submit handler ──

  const submitMessage = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || isStreaming) return;

      // 1. Add user message
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
      };

      // 2. Add empty streaming assistant message
      const assistantMsgId = generateId();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        citations: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInputValue('');
      setIsStreaming(true);
      streamingContentRef.current = '';
      streamingCitationsRef.current = [];
      streamingMsgIdRef.current = assistantMsgId;

      // 3. Start SSE stream
      cleanupRef.current = streamChat(
        trimmed,
        sessionId,
        threadId,
        // onToken — append to the streaming message
        (text: string) => {
          streamingContentRef.current += text;
          const updatedContent = streamingContentRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: updatedContent }
                : m
            )
          );
        },
        // onCitations
        (citations: Citation[]) => {
          streamingCitationsRef.current = citations;
        },
        // onDone — finalise message, persist threadId
        (newThreadId: string) => {
          setThreadId(newThreadId);
          localStorage.setItem(threadKey(sessionId), newThreadId);
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: streamingContentRef.current,
                    citations: streamingCitationsRef.current,
                    isStreaming: false,
                  }
                : m
            )
          );
        },
        // onError
        (err: string) => {
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: `⚠️ Error: ${err}`,
                    isStreaming: false,
                  }
                : m
            )
          );
        }
      );
    },
    [sessionId, threadId, isStreaming]
  );

  // ── Keyboard ──

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage(inputValue);
    }
  }

  // ── Stop streaming ──

  function handleStop() {
    cleanupRef.current?.();
    setIsStreaming(false);
    const id = streamingMsgIdRef.current;
    if (id) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                content: streamingContentRef.current,
                citations: streamingCitationsRef.current,
                isStreaming: false,
              }
            : m
        )
      );
    }
  }

  // ── Derived state ──

  const showSuggestions = messages.length === 0 && !isStreaming && !isLoadingHistory;
  const isWaitingFirstToken = isStreaming && messages.at(-1)?.content === '';

  // ── Render ──

  return (
    <div className="flex flex-col h-full">
      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
          {/* Loading history spinner */}
          {isLoadingHistory && (
            <div className="flex items-center justify-center py-12">
              <svg className="w-6 h-6 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="ml-3 text-sm text-gray-500">Loading conversation…</span>
            </div>
          )}

          {/* Suggested questions */}
          {showSuggestions && (
            <div className="flex flex-col items-center gap-6 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center text-3xl">
                🔭
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-gray-100">
                  Ask me anything about the videos
                </h2>
                <p className="text-gray-400 text-sm max-w-sm">
                  I&apos;ve analysed both videos — their transcripts, engagement, and metadata. What would you like to know?
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInputValue(q);
                      submitMessage(q);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:border-blue-500/50 hover:text-blue-300 hover:bg-blue-500/5 transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rendered messages */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Typing dots before first token arrives */}
          {isWaitingFirstToken && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/60 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Ask about engagement, content, strategy… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
            style={{ minHeight: '42px', maxHeight: '160px' }}
          />

          {isStreaming ? (
            <button
              id="btn-stop"
              onClick={handleStop}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
              title="Stop generating"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              id="btn-send"
              onClick={() => submitMessage(inputValue)}
              disabled={!inputValue.trim()}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
              title="Send message"
            >
              {isStreaming ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              )}
            </button>
          )}
        </div>
        <p className="text-center text-[10px] text-gray-600 pb-2">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}
