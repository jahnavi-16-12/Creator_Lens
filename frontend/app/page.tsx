// src: frontend/app/page.tsx
'use client';

import { useState, useCallback } from 'react';
import IngestionForm from './components/IngestionForm';
import VideoCard from './components/VideoCard';
import ChatPanel from './components/ChatPanel';
import type { VideoMetadata } from '../lib/api';

interface RootState {
  sessionId: string;
  videoA: VideoMetadata | null;
  videoB: VideoMetadata | null;
  isReady: boolean;
}

export default function HomePage() {
  const [state, setState] = useState<RootState>({
    sessionId: '',
    videoA: null,
    videoB: null,
    isReady: false,
  });

  const handleIngestionSuccess = useCallback(
    (sessionId: string, videoA: VideoMetadata, videoB: VideoMetadata) => {
      setState({ sessionId, videoA, videoB, isReady: true });
    },
    []
  );

  const reset = useCallback(() => {
    setState({ sessionId: '', videoA: null, videoB: null, isReady: false });
  }, []);

  return (
    <div className="bg-gray-950 min-h-screen flex flex-col overflow-hidden">
      {state.isReady && (
        <header className="flex items-center justify-between bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-4 py-2">
          <span className="text-sm text-gray-300">Session: {state.sessionId}</span>
          <button
            onClick={reset}
            className="px-3 py-1 text-xs font-medium text-gray-200 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition"
          >
            New Session
          </button>
        </header>
      )}

      <main className="flex-1 overflow-auto">
        {!state.isReady ? (
          <div className="flex h-full items-center justify-center">
            <IngestionForm onSuccess={handleIngestionSuccess} />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Video A */}
            <section className="md:w-28 flex-shrink-0 p-4">
              <VideoCard video={state.videoA} label="A" isLoading={false} />
            </section>

            {/* Center Chat */}
            <section className="md:w-44 flex-1 p-4 overflow-y-auto">
              <ChatPanel sessionId={state.sessionId} />
            </section>

            {/* Right Video B */}
            <section className="md:w-28 flex-shrink-0 p-4">
              <VideoCard video={state.videoB} label="B" isLoading={false} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
