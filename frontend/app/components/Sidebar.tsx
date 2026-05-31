"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  History,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';

const navItems = [
  { name: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { name: 'New Analysis', href: '/analysis/new', icon: Plus },
  { name: 'Sessions',     href: '/history',      icon: History },
  { name: 'Saved Chats',  href: '/saved-chats',  icon: Bookmark },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <>
      {/* ── Mobile backdrop overlay ───────────────────────────────────────── */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        style={{ background: '#111827', borderRight: '1px solid #1e293b' }}
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          transition-all duration-200
          ${collapsed
            ? '-translate-x-full md:translate-x-0 md:w-16 w-[240px]'
            : 'translate-x-0 w-[240px]'}
        `}
      >
        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div
          className={`h-12 flex items-center shrink-0 border-b px-4 gap-3`}
          style={{ borderColor: '#1e293b' }}
        >
          {/* Lens / eye icon */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shrink-0 shadow">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f9fafb"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>

          {/* Text — hide on desktop when collapsed, always show on mobile drawer */}
          <span
            className={`font-bold text-sm tracking-widest uppercase whitespace-nowrap transition-all duration-200 overflow-hidden
              ${collapsed ? 'md:w-0 md:opacity-0' : 'opacity-100'}
            `}
            style={{ color: '#f9fafb' }}
          >
            Creator Lens
          </span>
        </div>

        {/* ── Nav items ────────────────────────────────────────────────── */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ name, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={name}
                href={href}
                title={name}
                onClick={() => {
                  // Close drawer on mobile after navigation
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setCollapsed(true);
                  }
                }}
                className={`
                  relative group flex items-center gap-3 py-2.5 px-4
                  border-l-2 transition-all duration-150
                  ${isActive
                    ? 'border-[#3b82f6] bg-[#1f2937] text-[#f9fafb]'
                    : 'border-transparent text-[#6b7280] hover:bg-[#1a2035] hover:text-[#f9fafb]'}
                  ${collapsed ? 'md:justify-center md:px-0' : ''}
                `}
              >
                <Icon size={18} className="shrink-0" />

                <span
                  className={`text-xs font-semibold tracking-wide transition-all duration-200 overflow-hidden whitespace-nowrap
                    ${collapsed ? 'md:w-0 md:opacity-0' : 'opacity-100'}
                  `}
                >
                  {name}
                </span>

                {/* Tooltip when collapsed on desktop */}
                {collapsed && (
                  <span
                    className="pointer-events-none absolute left-full ml-2 z-50 hidden md:block
                      px-2 py-1 rounded text-[11px] font-semibold whitespace-nowrap
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{
                      background: '#111827',
                      border: '1px solid #1e293b',
                      color: '#f9fafb',
                    }}
                  >
                    {name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom: version + collapse toggle ────────────────────────── */}
        <div
          className={`shrink-0 flex items-center border-t px-3 py-2.5 gap-2
            ${collapsed ? 'md:justify-center' : 'justify-between'}
          `}
          style={{ borderColor: '#1e293b', background: '#0e1422' }}
        >
          {/* v1.0 — hide on desktop when collapsed */}
          <span
            className={`text-[10px] font-mono font-bold transition-all duration-200 overflow-hidden
              ${collapsed ? 'md:w-0 md:opacity-0' : 'opacity-100'}
            `}
            style={{ color: '#6b7280' }}
          >
            v1.0
          </span>

          {/* Collapse / expand button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded cursor-pointer transition-colors"
            style={{
              background: '#1f2937',
              border: '1px solid #1e293b',
              color: '#f9fafb',
            }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </aside>
    </>
  );
}
