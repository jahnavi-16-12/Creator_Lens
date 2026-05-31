'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import VideoCard from '../../components/VideoCard';
import ChatPanel from '../../components/ChatPanel';
import { VideoMetadata } from '../../../lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AnalysisSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { loadSession } = useSession();

  const [videoA, setVideoA] = useState<VideoMetadata | null>(null);
  const [videoB, setVideoB] = useState<VideoMetadata | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isSearching, setIsSearching] = useState(true);

  const loading = isSearching;

  useEffect(() => {
    if (!sessionId) return;

    const performSessionLoad = async () => {
      setIsSearching(true);
      let sessionFound = false;

      // 1. First attempt: read from cl_sessions cache in localStorage
      const stored = localStorage.getItem('cl_sessions');
      if (stored) {
        try {
          const sessions = JSON.parse(stored);
          const matched = sessions.find((s: any) => s.id === sessionId);
          if (matched) {
            setVideoA(matched.video_a || null);
            setVideoB(matched.video_b || null);
            setHasError(false);
            sessionFound = true;
          }
        } catch (e) {
          console.error('Failed to parse cl_sessions from localstorage:', e);
        }
      }

      // 2. Second attempt: fetch directly from backend API (Supabase Cloud DB fallback)
      if (!sessionFound) {
        try {
          // Pre-fetch/load using core SessionContext
          await loadSession(sessionId);

          // Get fresh metadata payload directly from the database route
          const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            setVideoA(data.video_a || null);
            setVideoB(data.video_b || null);
            setHasError(false);
            sessionFound = true;

            // Securely cache it to cl_sessions in localStorage
            const storedSessions = localStorage.getItem('cl_sessions');
            let currentSessions = [];
            if (storedSessions) {
              try {
                currentSessions = JSON.parse(storedSessions);
              } catch (e) {}
            }
            const exists = currentSessions.some((s: any) => s.id === data.id);
            if (!exists) {
              currentSessions.push(data);
              localStorage.setItem('cl_sessions', JSON.stringify(currentSessions));
            }
          } else {
            setHasError(true);
          }
        } catch (err) {
          console.error('API backup session sync failed:', err);
          setHasError(true);
        }
      }

      setIsSearching(false);
    };

    performSessionLoad();
  }, [sessionId, loadSession]);

  // Centered error state if not found
  if (!isSearching && hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-[#0a0f1e] p-6 text-center animate-fade-in">
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-8 max-w-sm flex flex-col items-center gap-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Session not found</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              We couldn't locate this analysis session in your storage or database.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg active:scale-95 duration-150 cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 48px)', width: '100%', gap: '8px', padding: '8px', overflow: 'hidden', backgroundColor: '#0a0f1e' }}>

      {/* Left — Video A */}
      <div style={{ width: '260px', minWidth: '260px', maxWidth: '260px', height: '100%', overflowY: 'auto', flexShrink: 0 }}>
        <VideoCard video={videoA} label='A' isLoading={loading} />
      </div>

      {/* Center — Chat */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', minWidth: 0 }}>
        <ChatPanel sessionId={sessionId} />
      </div>

      {/* Right — Video B */}
      <div style={{ width: '260px', minWidth: '260px', maxWidth: '260px', height: '100%', overflowY: 'auto', flexShrink: 0 }}>
        <VideoCard video={videoB} label='B' isLoading={loading} />
      </div>

    </div>
  );
}
