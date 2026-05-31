'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../context/SessionContext';

export default function IngestionForm() {
  // ── Session context ──
  const { createNewSession } = useSession();
  const router = useRouter();

  // ── Form state ──
  const [urlA, setUrlA] = useState(''); // YouTube URL
  const [urlB, setUrlB] = useState(''); // Instagram URL

  // ── Process state ──
  type Step =
    | 'idle'
    | 'validating'
    | 'metadata'
    | 'transcripts'
    | 'embedding'
    | 'done'
    | 'error';
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  // ── Validation regexes ──
  const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]{11,}/i;
  const INSTAGRAM_REGEX = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p)\/[^/]+\/?.*$/i;

  // ── Submit handler ──
  const handleSubmit = useCallback(async () => {
    setError(null);
    setStep('validating');

    // ---- Client‑side validation ----
    const isAValid = YOUTUBE_REGEX.test(urlA.trim());
    const isBValid = INSTAGRAM_REGEX.test(urlB.trim());
    if (!isAValid || !isBValid) {
      setError('Please correct the highlighted URLs.');
      setStep('error');
      return;
    }

    // Optimistic UI – show next steps with small delays for visual flow
    setStep('metadata');
    await new Promise((r) => setTimeout(r, 300)); // give UI a moment
    setStep('transcripts');
    await new Promise((r) => setTimeout(r, 300));
    setStep('embedding');
    await new Promise((r) => setTimeout(r, 300));

    try {
      await createNewSession(urlA.trim(), urlB.trim());
      setStep('done');
      router.push('/dashboard');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStep('error');
    }
  }, [urlA, urlB, createNewSession, router]);

  // ── UI helpers ──
  const isIdle = step === 'idle';
  const showProgress = !isIdle && step !== 'error';

  // Render ------------------------------------------------------------------
  return (
    <div className="w-full max-w-lg mx-auto bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-800 p-6 md:p-8 shadow-xl transition-all duration-300 hover:shadow-2xl">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-100 mb-1">Start Side-by-Side Analysis</h2>
        <p className="text-xs text-gray-400">Enter a YouTube video and an Instagram reel to begin.</p>
      </div>

      {/* URL inputs */}
      <div className="space-y-5">
        {/* YouTube */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            YouTube Video URL
          </label>
          <input
            type="url"
            value={urlA}
            onChange={(e) => setUrlA(e.target.value)}
            disabled={!isIdle && step !== 'error'}
            className={`block w-full rounded-xl border bg-gray-950/80 px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
              step === 'error' && !YOUTUBE_REGEX.test(urlA) ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-blue-500'
            }`}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {step === 'error' && !YOUTUBE_REGEX.test(urlA) && (
            <p className="mt-1.5 text-xs text-red-400">Please enter a valid YouTube video or short URL.</p>
          )}
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Instagram Reel URL
          </label>
          <input
            type="url"
            value={urlB}
            onChange={(e) => setUrlB(e.target.value)}
            disabled={!isIdle && step !== 'error'}
            className={`block w-full rounded-xl border bg-gray-950/80 px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all ${
              step === 'error' && !INSTAGRAM_REGEX.test(urlB) ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-pink-500'
            }`}
            placeholder="https://www.instagram.com/reel/..."
          />
          {step === 'error' && !INSTAGRAM_REGEX.test(urlB) && (
            <p className="mt-1.5 text-xs text-red-400">Please enter a valid Instagram reel or post URL.</p>
          )}
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-center pt-5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={step === 'validating' || step === 'metadata' || step === 'transcripts' || step === 'embedding'}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-5 py-3 text-sm font-semibold text-white transition-all shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 'idle' ? 'Start Analysis' : 'Ingesting Videos…'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <p className="mt-4 text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">{error}</p>
      )}

      {/* Progress steps */}
      {showProgress && (
        <div className="mt-6 space-y-3 bg-gray-950/50 rounded-xl p-4 border border-gray-850">
          <StepItem
            title="Validating URLs"
            completed={step !== 'validating'}
            active={step === 'validating'}
          />
          <StepItem
            title="Fetching metadata & transcripts"
            completed={step !== 'validating' && step !== 'metadata' && step !== 'transcripts'}
            active={step === 'metadata' || step === 'transcripts'}
          />
          <StepItem
            title="Generating embeddings"
            completed={step === 'done'}
            active={step === 'embedding'}
          />
          <StepItem
            title="Ready to compare!"
            completed={step === 'done'}
            active={step === 'done'}
          />
        </div>
      )}
    </div>
  );
}

// ─── Step item component ────────────────────────────────────────────────

type StepItemProps = {
  title: string;
  completed: boolean;
  active: boolean;
};

function StepItem({ title, completed, active }: StepItemProps) {
  return (
    <div
      className={`flex items-center space-x-2.5 transition-all duration-300 ${
        completed ? 'opacity-100' : 'opacity-65'
      }`}
    >
      {completed ? (
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
          ✓
        </div>
      ) : active ? (
        <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs animate-spin">
          🔄
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 text-[10px]">
          ●
        </div>
      )}
      <span
        className={`text-xs font-medium ${active ? 'text-gray-100 font-semibold' : 'text-gray-400'}`}
      >
        {title}
      </span>
    </div>
  );
}
