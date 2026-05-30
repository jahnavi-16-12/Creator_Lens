'use client';

import { useParams, useRouter } from 'next/navigation';
import ChatPanel from '../../components/ChatPanel';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-100 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2 ml-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-100">Creator Lens Chat</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-600 hidden sm:block truncate max-w-[200px]">
              session: {sessionId}
            </span>
          </div>
        </div>
      </div>

      {/* ── Chat panel fills the rest ── */}
      <ChatPanel sessionId={sessionId} />
    </div>
  );
}
