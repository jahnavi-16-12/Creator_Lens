"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Copy, Check, Menu } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';

export default function TopBar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const [copied, setCopied] = useState(false);

  // Extract page name for breadcrumb
  const getPageName = (path: string) => {
    if (path === '/' || path === '/analysis/new') return 'New Analysis';
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/history') return 'Sessions';
    if (path === '/saved-chats') return 'Saved Chats';
    if (path.startsWith('/chat/') || path.startsWith('/analysis/')) return 'Analysis';
    
    // Fallback parsing
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'New Analysis';
    return segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
  };

  const pageName = getPageName(pathname);

  // Parse session ID from path if on analysis page
  const isAnalysisPage = pathname.startsWith('/chat/') || pathname.startsWith('/analysis/');
  const sessionId = isAnalysisPage ? pathname.split('/')[2] : null;
  const truncatedSessionId = sessionId 
    ? `${sessionId.slice(0, 8)}...` 
    : '';

  const handleCopy = async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy session ID:', err);
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 z-10 h-12 bg-[#0d1424] border-b border-[#1e293b] flex items-center justify-between px-4 transition-all duration-200 left-0
        ${collapsed ? 'md:left-16' : 'md:left-[240px]'}
      `}
    >
      {/* Left: Hamburger & Breadcrumb */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger Menu on Mobile */}
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 rounded text-[#6b7280] hover:text-[#f9fafb] hover:bg-[#1f2937] md:hidden transition-colors cursor-pointer"
          title="Open menu"
        >
          <Menu size={16} />
        </button>

        {/* Breadcrumb */}
        <div className="text-xs font-semibold text-[#6b7280] flex items-center gap-1.5 select-none">
          <span>Creator Lens</span>
          <span className="text-[#1e293b]">/</span>
          <span className="text-[#f9fafb] font-bold">{pageName}</span>
        </div>
      </div>

      {/* Center: Session Pill (Analysis Page Only) */}
      <div className="flex-1 flex justify-center">
        {isAnalysisPage && sessionId && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#111827] hover:bg-[#1f2937] border border-[#1e293b] rounded-full text-[10px] font-bold font-mono text-[#f9fafb] cursor-pointer select-none transition-colors max-w-[150px] sm:max-w-none truncate"
            title="Click to copy Session ID"
          >
            <span className="truncate">Session: <span className="text-[#3b82f6]">{truncatedSessionId}</span></span>
            {copied ? (
              <Check size={11} className="text-[#10b981] flex-shrink-0" />
            ) : (
              <Copy size={11} className="text-[#6b7280] flex-shrink-0" />
            )}
          </button>
        )}
      </div>

      {/* Right: New Analysis Button & Avatar */}
      <div className="flex items-center gap-3">
        <Link
          href="/analysis/new"
          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors whitespace-nowrap"
        >
          New Analysis
        </Link>

        {/* User Avatar Circle */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-xs font-bold text-[#f9fafb] border border-[#1e293b] shadow select-none flex-shrink-0">
          U
        </div>
      </div>
    </header>
  );
}
