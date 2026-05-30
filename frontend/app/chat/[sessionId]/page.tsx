'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { streamChat, getChatHistory } from '../../../lib/api';
import type { Message, Citation } from '../../../lib/api';

// ─── Citation pill ────────────────────────────────────────────────────────────

function CitationPill({ c }: { c: Citation }) {
  const color =
    c.video_label === 'A'
      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
      : 'bg-purple-500/10 border-purple-500/30 text-purple-300';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color}`}
      title={c.snippet}
    >
      Video {c.video_label} · Chunk {c.chunk_index}
    </span>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isStreaming,
}: {
  msg: Message;
  isStreaming?: boolean;
}) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
            : 'bg-gray-800 border border-gray-700 text-gray-300'
        }`}
      >
        {isUser ? 'U' : '🔭'}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm'
              : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm'
          } ${isStreaming ? 'cursor-blink' : ''}`}
        >
          {msg.content || (isStreaming ? '' : '…')}
        </div>

        {/* Citations */}
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {msg.citations.map((c, i) => (
              <CitationPill key={i} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs bg-gray-800 border border-gray-700 text-gray-300">
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

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Which video has better engagement?',
  'Compare the content style of both videos',
  'Which creator has a larger following?',
  'Summarise what each video is about',
  'Which video would perform better on YouTube?',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Refs to avoid stale closures in streamChat callbacks
  const streamingContentRef = useRef('');
  const streamingCitationsRef = useRef<Citation[]>([]);

  // Load history on mount
  useEffect(() => {
    // No threadId yet — start fresh
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const sendMessage = useCallback(
    (query: string) => {
      if (!query.trim() || isStreaming) return;

      const userMsg: Message = { role: 'user', content: query };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsStreaming(true);
      setStreamingContent('');
      setStreamingCitations([]);
      streamingContentRef.current = '';
      streamingCitationsRef.current = [];

      cleanupRef.current = streamChat(
        query,
        sessionId,
        threadId,
        (text) => {
          streamingContentRef.current += text;
          setStreamingContent((prev) => prev + text);
        },
        (citations) => {
          streamingCitationsRef.current = citations;
          setStreamingCitations(citations);
        },
        (newThreadId) => {
          setThreadId(newThreadId);
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: streamingContentRef.current,
              citations: streamingCitationsRef.current,
            },
          ]);
          setStreamingContent('');
          setStreamingCitations([]);
        },
        (err) => {
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `⚠️ Error: ${err}` },
          ]);
          setStreamingContent('');
        }
      );
    },
    [sessionId, threadId, isStreaming]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleStop() {
    cleanupRef.current?.();
    setIsStreaming(false);
    if (streamingContentRef.current) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: streamingContentRef.current, citations: streamingCitationsRef.current },
      ]);
    }
    setStreamingContent('');
  }

  const showWelcome = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-100 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2 ml-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-100">Creator Lens Chat</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-600 hidden sm:block truncate max-w-[200px]">
              session: {sessionId}
            </span>
            {threadId && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                ● Conversation active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">

          {showWelcome && (
            <div className="flex flex-col items-center gap-6 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center text-3xl">
                🔭
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-gray-100">Ask me anything about the videos</h2>
                <p className="text-gray-400 text-sm max-w-sm">
                  I've analysed both videos — their transcripts, engagement, and metadata. What would you like to know?
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:border-blue-500/50 hover:text-blue-300 hover:bg-blue-500/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rendered messages */}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {/* Streaming bubble */}
          {isStreaming && streamingContent && (
            <MessageBubble
              msg={{ role: 'assistant', content: streamingContent, citations: streamingCitations }}
              isStreaming
            />
          )}

          {/* Typing indicator before first token */}
          {isStreaming && !streamingContent && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
              title="Send message"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
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
