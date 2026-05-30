'use client';

import { useState, useCallback } from 'react';
import { ingestVideos, type VideoMetadata } from '../../lib/api';

// ─── Props ─────────────────────────────────────────────────────────────────────

type IngestionFormProps = {
  /**
   * Called when ingestion succeeds.
   * @param sessionId The generated session id.
   * @param videoA    Metadata of the YouTube video.
   * @param videoB    Metadata of the Instagram video.
   */
  onSuccess: (sessionId: string, videoA: VideoMetadata, videoB: VideoMetadata) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function IngestionForm({ onSuccess }: IngestionFormProps) {
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
      const response = await ingestVideos(urlA.trim(), urlB.trim());
      // Backend returns null for a video that failed – treat that as an error
      if (!response.video_a || !response.video_b) {
        throw new Error('One or both videos could not be processed.');
      }
      setStep('done');
      onSuccess(response.session_id, response.video_a, response.video_b);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStep('error');
    }
  }, [urlA, urlB, onSuccess]);

  // ── UI helpers ──
  const isIdle = step === 'idle';
  const showProgress = !isIdle && step !== 'error';

  // Render ------------------------------------------------------------------
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-gray-800/80 backdrop-blur-md p-6 shadow-lg">
        {/* Title */}
        <h2 className="text-center text-2xl font-bold text-gray-100">Ingest Videos</h2>

        {/* URL inputs */}
        <div className="space-y-4">
          {/* YouTube */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              YouTube URL
            </label>
            <input
              type="url"
              value={urlA}
              onChange={(e) => setUrlA(e.target.value)}
              className={`block w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                step === 'error' && !YOUTUBE_REGEX.test(urlA) ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-blue-500'
              }`}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {step === 'error' && !YOUTUBE_REGEX.test(urlA) && (
              <p className="mt-1 text-xs text-red-400">Invalid YouTube URL.</p>
            )}
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Instagram URL
            </label>
            <input
              type="url"
              value={urlB}
              onChange={(e) => setUrlB(e.target.value)}
              className={`block w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                step === 'error' && !INSTAGRAM_REGEX.test(urlB) ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-pink-500'
              }`}
              placeholder="https://www.instagram.com/reel/..."
            />
            {step === 'error' && !INSTAGRAM_REGEX.test(urlB) && (
              <p className="mt-1 text-xs text-red-400">Invalid Instagram URL.</p>
            )}
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isIdle || step === 'validating' || step === 'metadata' || step === 'transcripts' || step === 'embedding'}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'idle' ? 'Start Ingestion' : 'Processing…'}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <p className="mt-2 text-center text-sm text-red-400">{error}</p>
        )}

        {/* Progress steps */}
        {showProgress && (
          <div className="mt-4 space-y-2">
            {/* Validating URLs */}
            <StepItem
              title="Validating URLs"
              completed={step !== 'validating' && step !== 'error'}
              active={step === 'validating'}
            />
            {/* Fetching metadata & transcripts */}
            <StepItem
              title="Fetching metadata & transcripts"
              completed={step !== 'metadata' && step !== 'error'}
              active={step === 'metadata'}
            />
            {/* Generating embeddings */}
            <StepItem
              title="Generating embeddings"
              completed={step !== 'embedding' && step !== 'error'}
              active={step === 'embedding'}
            />
            {/* Ready to chat */}
            <StepItem
              title="Ready to chat!"
              completed={step === 'done'}
              active={step === 'done'}
            />
          </div>
        )}
      </div>
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
      className={`flex items-center space-x-2 transition-opacity duration-300 ${
        completed ? 'opacity-100' : 'opacity-70'
      }`}
    >
      {completed ? (
        <span className="text-green-400">✓</span>
      ) : (
        <span className="animate-pulse text-gray-400">⏳</span>
      )}
      <span
        className={`text-sm ${active ? 'font-semibold text-gray-100' : 'text-gray-300'}`}
      >
        {title}
      </span>
    </div>
  );
}
