'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import ChatPanel from '../../components/ChatPanel';
import VideoCard from '../../components/VideoCard';

export default function ChatPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { videoA, videoB, loadSession, isLoading } = useSession();

  // Load session metadata on mount / sessionId change
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId).catch((err) => {
        console.error('Failed to load session details:', err);
      });
    }
  }, [sessionId]);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden" style={{ background: '#0a0f1e' }}>
      {/* Left Column: Side-by-side comparison Video Cards */}
      <div className="w-full lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#1e293b] flex flex-col gap-4 p-5 overflow-y-auto bg-[#0d1324] h-[45vh] lg:h-full">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video Intelligence</h2>
            <p className="text-[10px] text-gray-500">Side-by-side performance</p>
          </div>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
            Active Session
          </span>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <VideoCard video={videoA} label="A" isLoading={isLoading} />
          <VideoCard video={videoB} label="B" isLoading={isLoading} />
        </div>
      </div>

      {/* Right Column: Interactive AI Chat Panel */}
      <div className="flex-1 min-w-0 h-[55vh] lg:h-full overflow-hidden">
        <ChatPanel sessionId={sessionId} />
      </div>
    </div>
  );
}
