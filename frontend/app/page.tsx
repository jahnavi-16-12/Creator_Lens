'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ingestVideos } from '../lib/api';
import VideoCard from './components/VideoCard';
import type { VideoMetadata } from '../lib/api';

// ─── tiny helpers ────────────────────────────────────────────────────────────

function isValidUrl(s: string) {
  try { new URL(s); return true; } catch { return false; }
}

// ─── URL input component ─────────────────────────────────────────────────────

function UrlInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  accent,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  accent: 'blue' | 'purple';
}) {
  const ring = accent === 'blue'
    ? 'focus:ring-blue-500 focus:border-blue-500'
    : 'focus:ring-purple-500 focus:border-purple-500';
  const badge = accent === 'blue'
    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30';

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-gray-300">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge}`}>
          {label}
        </span>
        Video URL
      </label>
      <input
        id={id}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none ring-2 ring-transparent transition-all ${ring} disabled:opacity-40 disabled:cursor-not-allowed`}
      />
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'loading' | 'done' | 'error';

export default function HomePage() {
  const router = useRouter();

  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [videoA, setVideoA] = useState<VideoMetadata | null>(null);
  const [videoB, setVideoB] = useState<VideoMetadata | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const canSubmit =
    isValidUrl(urlA.trim()) &&
    isValidUrl(urlB.trim()) &&
    phase !== 'loading';

  async function handleAnalyse() {
    if (!canSubmit) return;
    setPhase('loading');
    setErrorMsg('');
    setVideoA(null);
    setVideoB(null);

    try {
      const res = await ingestVideos(urlA.trim(), urlB.trim());
      setVideoA(res.video_a);
      setVideoB(res.video_b);
      setSessionId(res.session_id);
      setPhase('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPhase('error');
    }
  }

  function handleChat() {
    if (sessionId) router.push(`/chat/${sessionId}`);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-100 tracking-tight">Creator Lens</span>
          </div>
          <div className="ml-auto text-xs text-gray-500">AI Video Analytics</div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex flex-col gap-10">

        {/* ── Hero ── */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Powered by RAG + Gemini
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-50 tracking-tight leading-tight">
            Compare Any Two Videos<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              with AI-Powered Insights
            </span>
          </h1>
          <p className="text-gray-400 text-base max-w-lg leading-relaxed">
            Paste a YouTube and Instagram URL. Get instant engagement analysis, transcript comparison, and a live AI chat about both videos.
          </p>
        </div>

        {/* ── Input card ── */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5 max-w-3xl mx-auto w-full shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UrlInput
              id="url-a"
              label="A"
              placeholder="https://www.youtube.com/watch?v=..."
              value={urlA}
              onChange={setUrlA}
              disabled={phase === 'loading'}
              accent="blue"
            />
            <UrlInput
              id="url-b"
              label="B"
              placeholder="https://www.instagram.com/reel/..."
              value={urlB}
              onChange={setUrlB}
              disabled={phase === 'loading'}
              accent="purple"
            />
          </div>

          {phase === 'error' && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1z" clipRule="evenodd" />
              </svg>
              {errorMsg}
            </div>
          )}

          <button
            id="btn-analyse"
            onClick={handleAnalyse}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
          >
            {phase === 'loading' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analysing videos…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347A3.977 3.977 0 0112 16a3.977 3.977 0 01-2.828-1.172l-.347-.347z" />
                </svg>
                Analyse Videos
              </>
            )}
          </button>
        </div>

        {/* ── Video cards ── */}
        {(phase === 'loading' || phase === 'done') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VideoCard video={videoA} label="A" isLoading={phase === 'loading'} />
            <VideoCard video={videoB} label="B" isLoading={phase === 'loading'} />
          </div>
        )}

        {/* ── Chat CTA ── */}
        {phase === 'done' && sessionId && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-gray-400 text-sm">
              Videos loaded! Ask the AI anything about them.
            </p>
            <button
              id="btn-chat"
              onClick={handleChat}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm px-6 py-3 transition-all duration-200 shadow-lg hover:shadow-emerald-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat with AI about these videos →
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
        Creator Lens — AI Video Analytics &nbsp;·&nbsp; Built with Next.js + FastAPI
      </footer>
    </div>
  );
}
