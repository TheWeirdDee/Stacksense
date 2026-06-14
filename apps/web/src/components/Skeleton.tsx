'use client'

import type { CSSProperties } from 'react'

/** Shimmering placeholder block. */
export function Skeleton({ width = '100%', height = 14, radius = 6, style }: {
  width?: number | string
  height?: number | string
  radius?: number
  style?: CSSProperties
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-border) 37%, var(--bg-surface) 63%)',
        backgroundSize: '400% 100%',
        animation: 'stacksense-shimmer 1.4s ease infinite',
        ...style,
      }}
    />
  )
}

/** Placeholder mimicking a feed event card while data loads. */
export function SkeletonFeedCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        borderLeft: '3px solid var(--bg-border)',
        borderBottom: '1px solid var(--bg-border)',
        padding: '18px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Skeleton width={70} height={18} radius={4} />
        <Skeleton width={90} height={12} />
        <Skeleton width={50} height={12} />
      </div>
      <Skeleton width="60%" height={15} />
      <Skeleton width="90%" height={12} />
      <Skeleton width={140} height={12} />
      <style>{`@keyframes stacksense-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }`}</style>
    </div>
  )
}

/** A stack of skeleton feed cards. */
export function SkeletonFeed({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading feed">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonFeedCard key={i} />
      ))}
    </div>
  )
}
