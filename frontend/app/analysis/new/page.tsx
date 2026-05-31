'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

// ─── Regexes ─────────────────────────────────────────────────────────────────

const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]{11,}/i;
const INSTAGRAM_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p)\/[^/]+\/?.*$/i;

// ─── YouTube oEmbed preview ───────────────────────────────────────────────────

function extractYtId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function YtPreview({ url }: { url: string }) {
  const id = extractYtId(url);
  if (!id) return null;
  return (
    <div className="flex items-center gap-3 mt-3 p-2 rounded-lg bg-[#0a0f1e] border border-[#1e293b]">
      <img
        src={`https://img.youtube.com/vi/${id}/default.jpg`}
        alt="Thumbnail"
        className="w-12 h-9 object-cover rounded"
      />
      <div className="min-w-0">
        <p className="text-xs text-gray-300 font-medium truncate">Video ID: {id}</p>
        <p className="text-[10px] text-gray-500">youtube.com</p>
      </div>
    </div>
  );
}

// ─── Progress step types ──────────────────────────────────────────────────────

type StepStatus = 'waiting' | 'active' | 'done';

interface ProgressStep {
  label: string;
  status: StepStatus;
}

// Maps our internal ingestion step key to which steps should be done/active
type IngestStage = 'validating' | 'metadata' | 'transcripts' | 'embedding' | 'done' | 'error';

function buildSteps(stage: IngestStage): ProgressStep[] {
  const steps = [
    'Validating URLs',
    'Fetching video metadata',
    'Extracting transcripts',
    'Generating AI embeddings',
    'Initializing chat',
  ];

  const stageIndex: Record<IngestStage, number> = {
    validating: 0,
    metadata: 1,
    transcripts: 2,
    embedding: 3,
    done: 5,
    error: -1,
  };

  const activeIdx = stageIndex[stage];

  return steps.map((label, i) => {
    let status: StepStatus = 'waiting';
    if (activeIdx === 5) {
      status = 'done';
    } else if (i < activeIdx) {
      status = 'done';
    } else if (i === activeIdx) {
      status = 'active';
    }
    return { label, status };
  });
}

// ─── Step indicator component ─────────────────────────────────────────────────

function StepRow({ step }: { step: ProgressStep }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
        {step.status === 'done' ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Check size={12} className="text-emerald-400" />
          </div>
        ) : step.status === 'active' ? (
          <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Loader2 size={12} className="text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#1f2937] border border-[#1e293b] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          </div>
        )}
      </div>
      <span
        className={`text-sm font-medium ${
          step.status === 'done'
            ? 'text-emerald-400'
            : step.status === 'active'
            ? 'text-white'
            : 'text-gray-500'
        }`}
      >
        {step.label}
      </span>
      <span className="ml-auto text-xs text-gray-500 font-mono">
        {step.status === 'done' ? '✓ Done' : step.status === 'active' ? (
          <span className="text-blue-400 animate-pulse">In progress…</span>
        ) : '— Waiting'}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewAnalysisPage() {
  const { createNewSession } = useSession();
  const router = useRouter();

  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [stage, setStage] = useState<IngestStage | 'idle'>('idle');
  const [error, setError] = useState<string | null>(null);

  const isAValid = YOUTUBE_REGEX.test(urlA.trim());
  const isBValid = INSTAGRAM_REGEX.test(urlB.trim());
  const formValid = isAValid && isBValid;
  const isProcessing = stage !== 'idle' && stage !== 'error';

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!isAValid || !isBValid) {
      setError('Please enter valid URLs for both fields.');
      return;
    }

    // Walk through visual stages with small delays for UX
    setStage('validating');
    await new Promise((r) => setTimeout(r, 400));
    setStage('metadata');
    await new Promise((r) => setTimeout(r, 400));
    setStage('transcripts');

    try {
      const sessionId = await createNewSession(urlA.trim(), urlB.trim());
      setStage('embedding');
      await new Promise((r) => setTimeout(r, 500));
      setStage('done');
      // Auto-redirect — State 3
      router.push(`/analysis/${sessionId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStage('error');
    }
  }, [urlA, urlB, isAValid, isBValid, createNewSession, router]);

  // ── State 2: Processing timeline ──────────────────────────────────────────
  if (isProcessing) {
    const steps = buildSteps(stage as IngestStage);
    return (
      <div className="p-8 w-full h-full flex items-start justify-center">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Analyzing Videos</h1>
            <p className="text-sm text-gray-400">
              Please wait while we process your videos&hellip;
            </p>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 flex flex-col gap-5">
            {steps.map((step, i) => (
              <StepRow key={i} step={step} />
            ))}
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center">
            This usually takes 30–90 seconds depending on video length
          </p>
        </div>
      </div>
    );
  }

  // ── State 1: Input Form ───────────────────────────────────────────────────
  return (
    <div className="p-8 w-full h-full overflow-y-auto">
      <div className="max-w-4xl flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">New Analysis</h1>
          <p className="text-base text-gray-400">
            Compare a YouTube video against an Instagram Reel
          </p>
        </div>

        {/* Input cards — 50/50 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Left: YouTube ────────────────────────────────────────── */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col gap-4">
            {/* Platform label */}
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#ff0000] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-white">Video A</p>
                <p className="text-xs text-gray-500">YouTube Video</p>
              </div>
            </div>

            {/* Input with red left border accent */}
            <div>
              <div className="flex rounded-lg overflow-hidden border border-[#1e293b] focus-within:border-red-500/50 transition-colors">
                <div className="w-1 shrink-0 bg-red-500" />
                <input
                  type="url"
                  value={urlA}
                  onChange={(e) => setUrlA(e.target.value)}
                  className="flex-1 bg-[#0a0f1e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none"
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isProcessing}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-600">
                Paste any youtube.com or youtu.be link
              </p>
              {/* Preview when valid */}
              {isAValid && <YtPreview url={urlA} />}
            </div>
          </div>

          {/* ── Right: Instagram ─────────────────────────────────────── */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col gap-4">
            {/* Platform label */}
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="url(#igGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-white">Video B</p>
                <p className="text-xs text-gray-500">Instagram Reel</p>
              </div>
            </div>

            {/* Input with purple left border accent */}
            <div>
              <div className="flex rounded-lg overflow-hidden border border-[#1e293b] focus-within:border-purple-500/50 transition-colors">
                <div className="w-1 shrink-0 bg-purple-500" />
                <input
                  type="url"
                  value={urlB}
                  onChange={(e) => setUrlB(e.target.value)}
                  className="flex-1 bg-[#0a0f1e] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none"
                  placeholder="https://instagram.com/reel/..."
                  disabled={isProcessing}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-600">
                Paste any instagram.com/reel or /p/ link
              </p>
              {/* Valid indicator */}
              {isBValid && (
                <div className="flex items-center gap-1.5 mt-3 p-2 rounded-lg bg-[#0a0f1e] border border-[#1e293b]">
                  <Check size={12} className="text-emerald-400 shrink-0" />
                  <p className="text-xs text-gray-400 truncate">
                    {urlB.split('/').filter(Boolean).slice(-2).join('/')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {/* CTA Button */}
        <button
          onClick={handleSubmit}
          disabled={!formValid || isProcessing}
          className="w-full h-12 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          style={{
            background: formValid ? '#2563eb' : '#1f2937',
            color: formValid ? '#ffffff' : '#6b7280',
          }}
          onMouseEnter={(e) => { if (formValid) (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'; }}
          onMouseLeave={(e) => { if (formValid) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
        >
          {formValid ? 'Start Analysis' : 'Enter both URLs to continue'}
        </button>
      </div>
    </div>
  );
}
