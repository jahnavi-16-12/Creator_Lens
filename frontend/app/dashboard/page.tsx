"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '../context/SessionContext';
import {
  FileText,
  BarChart2,
  Zap,
  Lightbulb,
  Plus,
  Loader2
} from 'lucide-react';

// Platform badges component
function PlatformBadges() {
  return (
    <div className="flex gap-2 shrink-0">
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-red-500/20 bg-red-500/5 text-red-500">
        YouTube
      </span>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/5 text-purple-500">
        Instagram
      </span>
    </div>
  );
}

// Session message count fetcher component
function SessionMessageCount({ sessionId }: { sessionId: string }) {
  const [msgCount, setMsgCount] = useState<number | null>(null);

  useEffect(() => {
    const threadId = localStorage.getItem(`cl_chat_thread_${sessionId}`);
    if (!threadId) {
      setMsgCount(0);
      return;
    }
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${API_BASE_URL}/api/chat/history/${threadId}`)
      .then(res => res.json())
      .then(data => {
        setMsgCount(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => {
        setMsgCount(0);
      });
  }, [sessionId]);

  if (msgCount === null) {
    return <span className="text-gray-500 font-medium">loading messages...</span>;
  }

  return <span>{msgCount} messages</span>;
}

export default function DashboardPage() {
  const { sessions, loadSession, refreshSessions, createNewSession, isLoading } = useSession();
  const router = useRouter();

  // Local storage sessions state
  const [localSessions, setLocalSessions] = useState<any[]>([]);

  // Ingestion states for Quick Start
  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [ingestStep, setIngestStep] = useState<'idle' | 'ingesting' | 'error'>('idle');
  const [ingestError, setIngestError] = useState<string | null>(null);

  const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]{11,}/i;
  const INSTAGRAM_REGEX = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p)\/[^/]+\/?.*$/i;

  useEffect(() => {
    refreshSessions();
  }, []);

  // Sync sessions with cl_sessions in localStorage
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      localStorage.setItem('cl_sessions', JSON.stringify(sessions));
      setLocalSessions(sessions);
    } else {
      const stored = localStorage.getItem('cl_sessions');
      if (stored) {
        try {
          setLocalSessions(JSON.parse(stored));
        } catch (e) {
          setLocalSessions([]);
        }
      }
    }
  }, [sessions]);

  const handleQuickIngest = async () => {
    setIngestError(null);
    const isAValid = YOUTUBE_REGEX.test(urlA.trim());
    const isBValid = INSTAGRAM_REGEX.test(urlB.trim());

    if (!isAValid || !isBValid) {
      setIngestError('Please enter valid YouTube and Instagram URLs.');
      setIngestStep('error');
      return;
    }

    setIngestStep('ingesting');
    try {
      const newId = await createNewSession(urlA.trim(), urlB.trim());
      router.push(`/analysis/${newId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setIngestError(msg);
      setIngestStep('error');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await loadSession(id);
      router.push(`/analysis/${id}`);
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  const isUrlAValid = YOUTUBE_REGEX.test(urlA.trim());
  const isUrlBValid = INSTAGRAM_REGEX.test(urlB.trim());
  const isFormValid = isUrlAValid && isUrlBValid;

  const recentSessions = localSessions.slice(0, 3);

  return (
    <div className="p-8 overflow-y-auto h-full w-full text-[#f9fafb]">
      <div className="flex flex-col gap-8">
        
        {/* ── Section 1 — Hero (mb-8) ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold text-white mb-3">
            Video Intelligence Platform
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mb-6 leading-relaxed">
            Compare any two social videos side-by-side. AI extracts transcripts,
            benchmarks engagement, and tells you exactly what to improve.
          </p>
          <div className="flex flex-row gap-3">
            <Link
              href="/analysis/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer select-none"
            >
              Start New Analysis
            </Link>
            <Link
              href="/history"
              className="border border-gray-600 hover:border-gray-400 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer select-none"
            >
              View Past Sessions
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-[#111827] border border-[#1e293b] text-sm text-gray-400 px-4 py-2 rounded-full flex items-center">
              <span className="text-blue-400 mr-2">✦</span> 3 metrics analyzed
            </div>
            <div className="bg-[#111827] border border-[#1e293b] text-sm text-gray-400 px-4 py-2 rounded-full flex items-center">
              <span className="text-blue-400 mr-2">✦</span> 2 platforms supported
            </div>
            <div className="bg-[#111827] border border-[#1e293b] text-sm text-gray-400 px-4 py-2 rounded-full flex items-center">
              <span className="text-blue-400 mr-2">✦</span> Real-time AI chat
            </div>
          </div>
        </div>

        {/* ── Section 2 — Capabilities (mb-8) ──────────────────────────────── */}
        <div>
          <div className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-4">
            Capabilities
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* Transcript Analysis */}
            <div className="bg-[#111827] border border-[#1e293b] hover:border-blue-500 transition-colors rounded-xl p-5 cursor-pointer flex flex-col gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[#1f2937] flex items-center justify-center">
                <FileText size={20} className="text-[#3b82f6]" />
              </div>
              <h3 className="text-base font-semibold text-white">Transcript Analysis</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Full-text extraction with semantic search across both videos
              </p>
            </div>

            {/* Engagement Analytics */}
            <div className="bg-[#111827] border border-[#1e293b] hover:border-blue-500 transition-colors rounded-xl p-5 cursor-pointer flex flex-col gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[#1f2937] flex items-center justify-center">
                <BarChart2 size={20} className="text-[#10b981]" />
              </div>
              <h3 className="text-base font-semibold text-white">Engagement Analytics</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Views, likes, comments, and engagement rate benchmarking
              </p>
            </div>

            {/* Hook Comparison */}
            <div className="bg-[#111827] border border-[#1e293b] hover:border-blue-500 transition-colors rounded-xl p-5 cursor-pointer flex flex-col gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[#1f2937] flex items-center justify-center">
                <Zap size={20} className="text-[#8b5cf6]" />
              </div>
              <h3 className="text-base font-semibold text-white">Hook Comparison</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                AI identifies the most effective opening 5 seconds
              </p>
            </div>

            {/* AI Recommendations */}
            <div className="bg-[#111827] border border-[#1e293b] hover:border-blue-500 transition-colors rounded-xl p-5 cursor-pointer flex flex-col gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[#1f2937] flex items-center justify-center">
                <Lightbulb size={20} className="text-[#f59e0b]" />
              </div>
              <h3 className="text-base font-semibold text-white">AI Recommendations</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Data-driven action items to improve your next video
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 3 — Recent Sessions (mb-8) ───────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Sessions</h2>
            <Link
              href="/history"
              className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer flex items-center"
            >
              View All &rarr;
            </Link>
          </div>

          {recentSessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 w-full">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: badges */}
                  <PlatformBadges />

                  {/* Middle: details */}
                  <div className="flex-1 min-w-0 text-sm text-gray-400 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-gray-500 select-all">
                      ID: {session.id.slice(0, 8)}...
                    </span>
                    <span>{formatDate(session.created_at)}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-blue-400 font-semibold">
                      <SessionMessageCount sessionId={session.id} />
                    </span>
                  </div>

                  {/* Right: action */}
                  <div className="shrink-0">
                    <button
                      onClick={() => handleResume(session.id)}
                      className="bg-[#1f2937] hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded-lg border border-[#1e293b] transition cursor-pointer select-none"
                    >
                      Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="border border-dashed border-[#1e293b] rounded-xl p-8 text-center bg-[#111827]/10 flex flex-col items-center justify-center w-full">
              <p className="text-gray-500 text-sm">No sessions yet — start your first analysis</p>
              <button
                onClick={() => router.push('/analysis/new')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer select-none"
              >
                New Analysis
              </button>
            </div>
          )}
        </div>

        {/* ── Section 4 — Quick Start (only show if no sessions) ───────────── */}
        {recentSessions.length === 0 && (
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 flex flex-col gap-4 w-full">
            <div className="flex items-center gap-2 mb-1">
              <Plus size={16} className="text-[#3b82f6]" />
              <h2 className="text-base font-semibold text-white">Quick Start</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {/* YouTube Ingest */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-[#ff0000] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span className="text-sm font-medium text-white border-b-2 border-[#ff0000] pb-0.5">YouTube</span>
                </div>
                <input
                  type="url"
                  value={urlA}
                  onChange={(e) => setUrlA(e.target.value)}
                  disabled={ingestStep === 'ingesting'}
                  className="w-full bg-[#0a0f1e] border border-[#1e293b] focus:border-blue-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                  placeholder="https://youtube.com/watch?v=..."
                />
                <span className="text-xs text-gray-600 mt-1">Enter a valid YouTube video or short URL</span>
              </div>

              {/* Instagram Ingest */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-[#8b5cf6] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                  <span className="text-sm font-medium text-white border-b-2 border-[#8b5cf6] pb-0.5">Instagram</span>
                </div>
                <input
                  type="url"
                  value={urlB}
                  onChange={(e) => setUrlB(e.target.value)}
                  disabled={ingestStep === 'ingesting'}
                  className="w-full bg-[#0a0f1e] border border-[#1e293b] focus:border-blue-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                  placeholder="https://instagram.com/reel/..."
                />
                <span className="text-xs text-gray-600 mt-1">Enter a valid Instagram Reel or Post URL</span>
              </div>
            </div>

            {ingestError && (
              <p className="text-xs text-red-400 font-medium mt-2">{ingestError}</p>
            )}

            {ingestStep === 'ingesting' && (
              <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mt-2">
                <Loader2 size={12} className="animate-spin text-blue-500" />
                Processing video ingestion and analysis...
              </p>
            )}

            <button
              onClick={handleQuickIngest}
              disabled={!isFormValid || ingestStep === 'ingesting'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 rounded-lg transition-colors mt-4 cursor-pointer disabled:cursor-not-allowed select-none"
            >
              Start Analysis
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}
