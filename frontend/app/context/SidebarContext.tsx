"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Load from localStorage only on client side after component mounts
  useEffect(() => {
    const storedValue = localStorage.getItem('cl_sidebar_collapsed');
    if (storedValue !== null) {
      try {
        setCollapsedState(JSON.parse(storedValue));
      } catch (e) {
        console.error("Failed to parse cl_sidebar_collapsed from localStorage:", e);
      }
    }
    setIsMounted(true);
  }, []);

  const setCollapsed = (val: boolean) => {
    setCollapsedState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cl_sidebar_collapsed', JSON.stringify(val));
    }
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
