'use client';

import { Eye, Heart, MessageSquare, Lock } from 'lucide-react';
import { VideoMetadata } from '../../lib/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNum(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return 'Unknown';
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const mo = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    try {
      return new Date(`${y}-${mo}-${d}`).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return raw; }
  }
  try {
    return new Date(raw).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return raw; }
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function engagementColor(rate: number | null | undefined): string {
  if (rate == null) return 'text-gray-600';
  if (rate >= 5) return 'text-green-400';
  if (rate >= 2) return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

export function VideoCardSkeleton({ label }: { label: 'A' | 'B' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', gap: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, height: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="h-5 w-14 bg-[#1f2937] animate-pulse rounded" />
        <div className="h-5 w-16 bg-[#1f2937] animate-pulse rounded" />
        <div className="h-3 flex-1 bg-[#1f2937] animate-pulse rounded" />
      </div>

      {/* Embed */}
      <div style={{ flexShrink: 0, height: '160px', borderRadius: '8px', backgroundColor: '#1f2937' }} className="animate-pulse" />

      {/* Stats */}
      <div style={{ flexShrink: 0, height: '48px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', backgroundColor: '#0d1424', borderRadius: '8px' }} className="divide-x divide-[#1e293b]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center py-2 gap-1">
            <div className="h-3 w-3 bg-[#1f2937] animate-pulse rounded" />
            <div className="h-3 w-8 bg-[#1f2937] animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Engagement */}
      <div style={{ flexShrink: 0, height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '4px' }}>
        <div className="h-3 w-24 bg-[#1f2937] animate-pulse rounded" />
        <div className="h-4 w-12 bg-[#1f2937] animate-pulse rounded" />
      </div>

      {/* Creator */}
      <div style={{ flexShrink: 0, height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '4px' }}>
        <div className="h-3 w-28 bg-[#1f2937] animate-pulse rounded" />
        <div className="h-3 w-16 bg-[#1f2937] animate-pulse rounded" />
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '4px', marginTop: 'auto' }}>
        <div className="h-3 w-20 bg-[#1f2937] animate-pulse rounded" />
        <div className="h-3 w-10 bg-[#1f2937] animate-pulse rounded" />
      </div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface VideoCardProps {
  video: VideoMetadata | null;
  label: 'A' | 'B';
  isLoading: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VideoCard({ video, label, isLoading }: VideoCardProps) {
  if (isLoading) return <VideoCardSkeleton label={label} />;

  if (!video) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', gap: '8px', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: '12px' }}>
        No video loaded
      </div>
    );
  }

  const isYouTube = video.platform === 'youtube';
  const ytId = isYouTube ? extractYouTubeId(video.url) : null;
  const erColor = engagementColor(video.engagement_rate);

  // Label badge styles
  const labelBadge = label === 'A'
    ? 'bg-blue-900 text-blue-300'
    : 'bg-purple-900 text-purple-300';

  // Platform badge styles
  const platformBadge = isYouTube
    ? 'bg-red-900 text-red-300'
    : 'bg-pink-900 text-pink-300';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#111827', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', gap: '8px', overflow: 'hidden' }}>

      {/* ── 1. Header (32px) ── */}
      <div style={{ flexShrink: 0, height: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Label badge */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${labelBadge}`}>
          Video {label}
        </span>

        {/* Platform badge */}
        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${platformBadge}`}>
          {isYouTube ? 'YouTube' : 'Instagram'}
        </span>

        {/* Title */}
        {video.title && (
          <span className="text-xs text-gray-400 truncate flex-1 min-w-0">
            {video.title}
          </span>
        )}
      </div>

      {/* ── 2. Embed (fixed 160px) ── */}
      <div style={{ flexShrink: 0, height: '160px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0a0f1e' }}>
        {isYouTube && ytId ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${ytId}`}
            title={video.title ?? 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isYouTube && !ytId ? (
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-xs text-gray-500">Could not embed video</span>
          </div>
        ) : (
          /* Instagram */
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-900/30 to-pink-900/30 gap-2 px-3">
            <Lock size={20} className="text-purple-400 shrink-0" />
            <p className="text-xs text-gray-400 text-center">Instagram embeds are restricted</p>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Open in Instagram ↗
            </a>
          </div>
        )}
      </div>

      {/* ── 3. Stats row (48px) ── */}
      <div style={{ flexShrink: 0, height: '48px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', backgroundColor: '#0d1424', borderRadius: '8px' }} className="divide-x divide-[#1e293b]">
        <div className="flex flex-col items-center justify-center py-2">
          <Eye size={12} className="text-gray-500 shrink-0" />
          <span className="text-xs font-bold text-white leading-none mt-0.5">{formatNum(video.views)}</span>
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">VIEWS</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2">
          <Heart size={12} className="text-gray-500 shrink-0" />
          <span className="text-xs font-bold text-white leading-none mt-0.5">{formatNum(video.likes)}</span>
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">LIKES</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2">
          <MessageSquare size={12} className="text-gray-500 shrink-0" />
          <span className="text-xs font-bold text-white leading-none mt-0.5">{formatNum(video.comments)}</span>
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">COMMENTS</span>
        </div>
      </div>

      {/* ── 4. Engagement Rate (28px) ── */}
      <div style={{ flexShrink: 0, height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '4px' }}>
        <span className="text-xs text-gray-500">Engagement Rate</span>
        <span className={`text-xs font-bold ${erColor}`}>
          {video.engagement_rate != null
            ? `${video.engagement_rate.toFixed(2)}%`
            : 'N/A'}
        </span>
      </div>

      {/* ── 5. Creator row (24px) ── */}
      <div style={{ flexShrink: 0, height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '4px' }}>
        <span className="text-xs font-medium text-gray-300 truncate max-w-[60%]">
          {video.creator ?? 'Unknown creator'}
        </span>
        <span className="text-xs text-gray-500 shrink-0">
          {formatNum(video.follower_count)} followers
        </span>
      </div>

      {/* ── 6. Footer (20px) ── */}
      <div style={{ flexShrink: 0, height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '4px', marginTop: 'auto' }}>
        <span className="text-xs text-gray-600">{formatDate(video.upload_date)}</span>
        <span className="text-xs text-gray-600">{formatDuration(video.duration_seconds)}</span>
      </div>

    </div>
  );
}
