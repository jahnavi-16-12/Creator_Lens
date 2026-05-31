'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, MessageSquare, Trash2, ExternalLink } from 'lucide-react';

import { SavedChat } from '../../lib/api';

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
}

export default function SavedChatsPage() {
  const router = useRouter();
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cl_saved_chats');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedChats(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cl_saved_chats from localStorage:', e);
      }
    }
    setHasLoaded(true);
  }, []);

  const handleDelete = (threadId: string) => {
    const updated = savedChats.filter((c) => c.thread_id !== threadId);
    setSavedChats(updated);
    localStorage.setItem('cl_saved_chats', JSON.stringify(updated));
  };

  const handleOpen = (chat: SavedChat) => {
    // Save to cl_thread_{sessionId} so the analysis page can pick up the correct thread history
    localStorage.setItem(`cl_thread_${chat.session_id}`, chat.thread_id);
    router.push(`/analysis/${chat.session_id}?thread=${chat.thread_id}&restore=true`);
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
            <h1 className="text-2xl font-bold tracking-tight text-white">Saved Chats</h1>
            <p className="text-sm text-gray-400 mt-1">Bookmarked conversations you want to revisit</p>
          </div>
        </div>

        {savedChats.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/40 border border-gray-700/50 flex items-center justify-center text-gray-400 mb-4 shadow">
              <Bookmark size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-200">No saved chats</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm leading-relaxed">
              Click the bookmark icon in any chat to save it here.
            </p>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {savedChats.map((chat) => (
              <div
                key={chat.thread_id}
                className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 hover:border-[#3b82f6] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* User Message Title */}
                  <h3 className="text-sm font-medium text-white line-clamp-1 mb-2" title={chat.title}>
                    "{chat.title}"
                  </h3>
                  
                  {/* AI Response Preview */}
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                    {chat.preview || 'No preview available.'}
                  </p>
                </div>

                {/* Footer section */}
                <div className="flex items-center justify-between text-xs border-t border-[#1e293b]/50 pt-3 mt-1">
                  <div className="flex items-center gap-3 text-gray-500">
                    <span>{formatDate(chat.saved_at)}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      <span>{chat.message_count} msgs</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(chat.thread_id)}
                      className="px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors font-medium flex items-center gap-1 cursor-pointer active:scale-95 duration-100"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                    <button
                      onClick={() => handleOpen(chat)}
                      className="px-4 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-semibold shadow transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 duration-100"
                    >
                      <ExternalLink size={13} />
                      Open
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
