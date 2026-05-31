"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { VideoMetadata, ingestVideos } from '../../lib/api';

export interface Session {
  id: string;
  title: string;
  created_at: string;
  video_a: VideoMetadata | null;
  video_b: VideoMetadata | null;
  video_a_url: string;
  video_b_url: string;
}

interface SessionContextType {
  sessionId: string | null;
  videoA: VideoMetadata | null;
  videoB: VideoMetadata | null;
  sessions: Session[];
  isLoading: boolean;
  createNewSession: (urlA: string, urlB: string) => Promise<string>;
  loadSession: (id: string) => Promise<void>;
  resetSession: () => void;
  refreshSessions: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [videoA, setVideoA] = useState<VideoMetadata | null>(null);
  const [videoB, setVideoB] = useState<VideoMetadata | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load initial session from localStorage if present
  useEffect(() => {
    const savedSessionId = localStorage.getItem('current_session_id');
    if (savedSessionId) {
      loadSession(savedSessionId).catch((err) => {
        console.error("Failed to load saved session:", err);
        localStorage.removeItem('current_session_id');
      });
    }
    refreshSessions();
  }, []);

  // Keep localStorage cl_sessions in sync with context sessions
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      localStorage.setItem('cl_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const refreshSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const createNewSession = async (urlA: string, urlB: string): Promise<string> => {
    setIsLoading(true);
    try {
      const response = await ingestVideos(urlA, urlB);
      if (!response.session_id) {
        throw new Error("No session ID returned from ingestion.");
      }

      setSessionId(response.session_id);
      setVideoA(response.video_a);
      setVideoB(response.video_b);
      localStorage.setItem('current_session_id', response.session_id);

      // Register session explicitly in the sessions list on the backend
      try {
        await fetch(`${API_BASE_URL}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: response.session_id,
            title: `Analysis of ${response.video_a?.creator || 'YouTube'} vs ${response.video_b?.creator || 'Instagram'}`,
            video_a_url: urlA,
            video_b_url: urlB,
            chat_history: [],
            citations: []
          })
        });
      } catch (err) {
        console.error("Failed to register session on backend:", err);
      }

      await refreshSessions();
      return response.session_id;
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`);
      if (!res.ok) {
        throw new Error(`Session not found: ${res.statusText}`);
      }
      const data = await res.json();
      setSessionId(id);
      setVideoA(data.video_a || null);
      setVideoB(data.video_b || null);
      localStorage.setItem('current_session_id', id);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSession = () => {
    setSessionId(null);
    setVideoA(null);
    setVideoB(null);
    localStorage.removeItem('current_session_id');
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        videoA,
        videoB,
        sessions,
        isLoading,
        createNewSession,
        loadSession,
        resetSession,
        refreshSessions,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
