"use client";

import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [autoSummary, setAutoSummary] = useState(true);

  useEffect(() => {
    // Load setting states from localStorage
    setApiKey(localStorage.getItem('setting_api_key') || '');
    setSupabaseUrl(localStorage.getItem('setting_supabase_url') || '');
    setTheme(localStorage.getItem('setting_theme') || 'dark');
    setAutoSummary(localStorage.getItem('setting_auto_summary') !== 'false');
  }, []);

  const handleSave = () => {
    localStorage.setItem('setting_api_key', apiKey);
    localStorage.setItem('setting_supabase_url', supabaseUrl);
    localStorage.setItem('setting_theme', theme);
    localStorage.setItem('setting_auto_summary', String(autoSummary));
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure API keys, model preferences, and UI appearance.
        </p>
      </div>

      <div className="space-y-6">
        {/* API Credentials */}
        <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-200">API Credentials</h2>
          <p className="text-xs text-gray-500">
            Securely configure custom keys for backend operations. Keys are saved in local settings.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="block w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="••••••••••••••••••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Supabase URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="block w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="https://your-supabase-id.supabase.co"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-800 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-200">System Preferences</h2>

          <div className="space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Theme Mode</h3>
                <p className="text-xs text-gray-500">Choose between light, dark, and default system visual modes.</p>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="dark">SaaS Dark</option>
                <option value="light">SaaS Light</option>
                <option value="system">System Default</option>
              </select>
            </div>

            {/* Ingestion Preference */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Auto Summarization</h3>
                <p className="text-xs text-gray-500">Automatically trigger transcript summarization after metadata ingestion completes.</p>
              </div>
              <button
                onClick={() => setAutoSummary(!autoSummary)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSummary ? 'bg-blue-600' : 'bg-gray-850'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoSummary ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save button and alerts */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium text-sm transition-all shadow-md active:scale-95"
          >
            Save Settings
          </button>
          
          {isSaved && (
            <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl py-1 px-3 animate-pulse">
              ✓ Settings saved successfully!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
