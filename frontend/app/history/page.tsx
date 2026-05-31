'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, FileSearch, Plus } from 'lucide-react';

interface Session {
  session_id: string;
  created_at: string;
  video_a: { url: string; title: string; platform: 'youtube' | 'instagram'; thumbnail?: string };
  video_b: { url: string; title: string; platform: 'youtube' | 'instagram'; thumbnail?: string };
  message_count: number;
  status: 'ready' | 'partial';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cl_sessions');
    if (stored) {
      try {
        const rawSessions = JSON.parse(stored);
        if (Array.isArray(rawSessions)) {
          // Map to strict Session interface with safe fallbacks
          const mapped: Session[] = rawSessions.map((s: any) => {
            const video_a_raw = s.video_a || {};
            const video_b_raw = s.video_b || {};

            return {
              session_id: s.session_id || s.id || '',
              created_at: s.created_at || new Date().toISOString(),
              video_a: {
                url: video_a_raw.url || s.video_a_url || '',
                title: video_a_raw.title || 'Untitled Video A',
                platform: (video_a_raw.platform === 'instagram' ? 'instagram' : 'youtube') as 'youtube' | 'instagram',
                thumbnail: video_a_raw.thumbnail || '',
              },
              video_b: {
                url: video_b_raw.url || s.video_b_url || '',
                title: video_b_raw.title || 'Untitled Video B',
                platform: (video_b_raw.platform === 'instagram' ? 'instagram' : 'youtube') as 'youtube' | 'instagram',
                thumbnail: video_b_raw.thumbnail || '',
              },
              message_count: typeof s.message_count === 'number' ? s.message_count : 0,
              status: s.status === 'partial' ? 'partial' : 'ready',
            };
          });
          setSessions(mapped);
        }
      } catch (e) {
        console.error('Failed to parse cl_sessions from localStorage:', e);
      }
    }
    setHasLoaded(true);
  }, []);

  const handleDelete = (sessionId: string) => {
    const updated = sessions.filter((s) => s.session_id !== sessionId);
    setSessions(updated);
    
    // Write back to cl_sessions in localStorage
    const stored = localStorage.getItem('cl_sessions');
    if (stored) {
      try {
        const rawSessions = JSON.parse(stored);
        if (Array.isArray(rawSessions)) {
          const filteredRaw = rawSessions.filter((s: any) => {
            const id = s.session_id || s.id;
            return id !== sessionId;
          });
          localStorage.setItem('cl_sessions', JSON.stringify(filteredRaw));
        }
      } catch (e) {
        console.error('Failed to update cl_sessions in localStorage:', e);
      }
    }
  };

  const handleResume = (sessionId: string) => {
    router.push(`/analysis/${sessionId}`);
  };

  if (!hasLoaded) {
    return (
      <div className="w-full min-h-full flex items-center justify-center bg-[#0a0f1e]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-[#0a0f1e] text-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1e293b] pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Session History</h1>
            <p className="text-sm text-gray-400 mt-1">All your past video analyses</p>
          </div>
          <Link
            href="/analysis/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus size={16} />
            New Analysis
          </Link>
        </div>

        {sessions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/40 border border-gray-700/50 flex items-center justify-center text-gray-400 mb-4 shadow">
              <FileSearch size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-200">No sessions yet</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm leading-relaxed">
              You haven't analyzed any video comparisons yet. Paste some URLs to get started.
            </p>
            <Link
              href="/analysis/new"
              className="mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow active:scale-95 duration-100"
            >
              Start your first analysis
            </Link>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 hover:border-[#3b82f6] transition-all flex flex-col justify-between"
              >
                {/* Top Row */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-500">ID: {session.session_id.slice(0, 8)}...</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">{formatDate(session.created_at)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    session.status === 'ready'
                      ? 'bg-green-950/50 text-green-400 border border-green-800/30'
                      : 'bg-yellow-950/50 text-yellow-400 border border-yellow-800/30'
                  }`}>
                    {session.status === 'ready' ? 'Ready' : 'Partial'}
                  </span>
                </div>

                {/* Middle: Side-by-side (50/50) */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 border-y border-[#1e293b]/50 mb-3">
                  {/* Video A */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {session.video_a.platform === 'youtube' ? (
                        <svg className="w-4 h-4 text-[#ff0000] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="url(#igGradHistoryA)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <defs>
                            <linearGradient id="igGradHistoryA" x1="0%" y1="100%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#f09433" />
                              <stop offset="50%" stopColor="#dc2743" />
                              <stop offset="100%" stopColor="#bc1888" />
                            </linearGradient>
                          </defs>
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                      )}
                      <span className="text-xs font-semibold text-white truncate flex-1" title={session.video_a.title}>
                        {session.video_a.title}
                      </span>
                    </div>
                    <a
                      href={session.video_a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-gray-500 hover:text-blue-400 truncate font-mono"
                    >
                      {session.video_a.url}
                    </a>
                  </div>

                  {/* VS */}
                  <span className="text-[10px] font-bold text-gray-600 px-1 uppercase tracking-widest select-none">
                    vs
                  </span>

                  {/* Video B */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {session.video_b.platform === 'youtube' ? (
                        <svg className="w-4 h-4 text-[#ff0000] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="url(#igGradHistoryB)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <defs>
                            <linearGradient id="igGradHistoryB" x1="0%" y1="100%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#f09433" />
                              <stop offset="50%" stopColor="#dc2743" />
                              <stop offset="100%" stopColor="#bc1888" />
                            </linearGradient>
                          </defs>
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                      )}
                      <span className="text-xs font-semibold text-white truncate flex-1" title={session.video_b.title}>
                        {session.video_b.title}
                      </span>
                    </div>
                    <a
                      href={session.video_b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-gray-500 hover:text-blue-400 truncate font-mono"
                    >
                      {session.video_b.url}
                    </a>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between text-xs mt-1">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <MessageSquare size={14} className="text-gray-500" />
                    <span>{session.message_count} messages</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(session.session_id)}
                      className="px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors font-medium cursor-pointer active:scale-95 duration-100"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleResume(session.session_id)}
                      className="px-4 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-semibold shadow transition-colors cursor-pointer active:scale-95 duration-100"
                    >
                      Resume
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
