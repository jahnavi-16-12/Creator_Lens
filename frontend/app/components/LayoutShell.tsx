"use client";

import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useSidebar } from '../context/SidebarContext';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0f1e' }}>
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Right column: TopBar + scrollable main */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${
          collapsed ? 'md:ml-16' : 'md:ml-[240px]'
        }`}
      >
        {/* Fixed TopBar */}
        <TopBar />

        {/* Scrollable page content — sits below the 48px TopBar */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingTop: '48px' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
