import React from 'react';
import Link from 'next/link';
import IngestionForm from './components/IngestionForm';

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-16 bg-gray-900/60 backdrop-blur-md rounded-lg">
        <h1 className="text-4xl font-bold text-gray-100 mb-4">Creator Lens AI</h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-6">
          Compare two social‑media videos side‑by‑side using AI‑powered analysis. Get instant engagement insights, transcript analysis, and creator benchmarking.
        </p>
        <Link href="/dashboard" className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition">
          Go to Dashboard
        </Link>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 max-w-7xl mx-auto">
        {[
          { title: 'Transcript Analysis', desc: 'Full‑text extraction with semantic search.', icon: '📝' },
          { title: 'Engagement Analytics', desc: 'Likes, comments, view‑rate breakdowns.', icon: '📈' },
          { title: 'Hook Comparison', desc: 'Identify the most effective video hooks.', icon: '🔀' },
          { title: 'AI Recommendations', desc: 'Data‑driven suggestions to boost performance.', icon: '🤖' },
        ].map((f) => (
          <div key={f.title} className="bg-gray-800 rounded-lg p-6 text-center hover:shadow-xl transition">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-400">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Ingestion Form */}
      <section className="px-4 max-w-2xl mx-auto">
        <IngestionForm />
      </section>
    </div>
  );
}
