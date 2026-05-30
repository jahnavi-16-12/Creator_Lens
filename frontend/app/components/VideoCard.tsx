'use client';

import { VideoMetadata } from '../../lib/api';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatCount(n: number | null): string {
  if (n === null || n === undefined) return 'N/A';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(raw: string | null): string {
  if (!raw) return 'Unknown date';
  // Backend returns YYYYMMDD strings for YouTube
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return new Date(`${y}-${m}-${d}`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return new Date(raw).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function engagementColor(rate: number | null): string {
  if (rate === null || rate === undefined) return 'text-gray-400';
  if (rate > 5) return 'text-emerald-400';
  if (rate >= 2) return 'text-yellow-400';
  return 'text-red-400';
}

function engagementLabel(rate: number | null): string {
  if (rate === null || rate === undefined) return 'N/A';
  if (rate > 5) return `${rate.toFixed(2)}%`;
  if (rate >= 2) return `${rate.toFixed(2)}%`;
  return `${rate.toFixed(2)}%`;
}

// ─── skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-700 ${className}`}
    />
  );
}

function VideoCardSkeleton({ label }: { label: 'A' | 'B' }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col gap-0">
      {/* header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* embed placeholder */}
      <Skeleton className="w-full aspect-video mx-0 rounded-none" />

      <div className="p-4 flex flex-col gap-4">
        {/* creator row */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* engagement rate */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>

        {/* stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1 items-center">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>

        {/* hashtags */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-16 rounded-full" />
          ))}
        </div>

        {/* footer */}
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

interface VideoCardProps {
  video: VideoMetadata | null;
  label: 'A' | 'B';
  isLoading: boolean;
}

export default function VideoCard({ video, label, isLoading }: VideoCardProps) {
  if (isLoading) return <VideoCardSkeleton label={label} />;

  if (!video) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-center min-h-64 text-gray-500 text-sm">
        No video loaded
      </div>
    );
  }

  const isYouTube = video.platform === 'youtube';
  const ytId = isYouTube ? extractYouTubeId(video.url) : null;

  const platformBadge = isYouTube ? (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-600 text-white">
      {/* YouTube icon */}
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
      </svg>
      YouTube
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{
        background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
      }}
    >
      {/* Instagram icon */}
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
      Instagram
    </span>
  );

  const labelBadge = (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
        label === 'A'
          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      }`}
    >
      Video {label}
    </span>
  );

  const erColor = engagementColor(video.engagement_rate);
  const erValue = video.engagement_rate !== null ? engagementLabel(video.engagement_rate) : 'N/A';

  const hashtags = (video.hashtags ?? []).slice(0, 5);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        {labelBadge}
        {platformBadge}
      </div>

      {/* ── Embed / Link ── */}
      {isYouTube && ytId ? (
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${ytId}`}
            title={video.title ?? 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="mx-4 rounded-lg border border-gray-700 bg-gray-800 flex flex-col items-center justify-center gap-2 py-8 px-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
            }}
          >
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
            </svg>
          </div>
          <p className="text-xs text-gray-400 text-center">Instagram embeds are blocked by browsers.</p>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors break-all text-center"
          >
            Open Reel ↗
          </a>
        </div>
      )}

      {/* ── Body ── */}
      <div className="p-4 flex flex-col gap-4 flex-1">

        {/* Creator row */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
              isYouTube ? 'bg-red-600' : ''
            }`}
            style={!isYouTube ? { background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)' } : {}}
          >
            {(video.creator ?? 'U')[0].toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-100 truncate">
              {video.creator ?? 'Unknown creator'}
            </span>
            <span className="text-xs text-gray-400">
              {formatCount(video.follower_count)} followers
            </span>
          </div>
          {video.title && (
            <p className="ml-auto text-xs text-gray-400 text-right line-clamp-2 max-w-[40%]">
              {video.title}
            </p>
          )}
        </div>

        {/* Engagement rate */}
        <div className="flex flex-col">
          <span className={`text-4xl font-black leading-none ${erColor}`}>
            {erValue}
          </span>
          <span className="text-xs text-gray-500 mt-1 font-medium tracking-wide uppercase">
            Engagement Rate
            {video.engagement_rate !== null && (
              <span className={`ml-2 text-xs font-semibold ${erColor}`}>
                {video.engagement_rate > 5
                  ? '● Great'
                  : video.engagement_rate >= 2
                  ? '● Average'
                  : '● Low'}
              </span>
            )}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-800/60 p-3">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base">👁</span>
            <span className="text-sm font-bold text-gray-100">{formatCount(video.views)}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Views</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 border-x border-gray-700">
            <span className="text-base">❤️</span>
            <span className="text-sm font-bold text-gray-100">{formatCount(video.likes)}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Likes</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base">💬</span>
            <span className="text-sm font-bold text-gray-100">{formatCount(video.comments)}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Comments</span>
          </div>
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-800 mt-auto">
          <span className="text-xs text-gray-500">{formatDate(video.upload_date)}</span>
          <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
            {formatDuration(video.duration_seconds)}
          </span>
        </div>
      </div>
    </div>
  );
}
