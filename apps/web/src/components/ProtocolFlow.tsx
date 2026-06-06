'use client'

import { useState } from 'react'

interface ProtocolFlowProps {
  events: any[]
  selectedProtocol: string | null
  onSelectProtocol: (protocol: string | null) => void
}

const NODES: Record<string, { x: number; y: number; color: string; label: string; fullName: string }> = {
  'Native STX': { x: 100, y: 150, color: '#3B82F6', label: 'STX', fullName: 'Native STX' },
  'ALEX': { x: 220, y: 60, color: '#7C3AED', label: 'ALEX', fullName: 'ALEX' },
  'Velar': { x: 380, y: 60, color: '#EC4899', label: 'Velar', fullName: 'Velar' },
  'Arkadiko': { x: 220, y: 240, color: '#F59E0B', label: 'Arkadiko', fullName: 'Arkadiko' },
  'sBTC Bridge': { x: 380, y: 240, color: '#10B981', label: 'sBTC', fullName: 'sBTC Bridge' },
  'StackSense': { x: 500, y: 150, color: '#E85D04', label: 'StackSense', fullName: 'StackSense' },
}

const LINKS = [
  { source: 'Native STX', target: 'ALEX' },
  { source: 'Native STX', target: 'Velar' },
  { source: 'Native STX', target: 'Arkadiko' },
  { source: 'Native STX', target: 'sBTC Bridge' },
  { source: 'ALEX', target: 'Velar' },
  { source: 'Arkadiko', target: 'ALEX' },
  { source: 'StackSense', target: 'ALEX' },
  { source: 'StackSense', target: 'Velar' },
  { source: 'StackSense', target: 'Arkadiko' },
  { source: 'StackSense', target: 'sBTC Bridge' },
]

export default function ProtocolFlow({ events, selectedProtocol, onSelectProtocol }: ProtocolFlowProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Count event frequencies in the last 50 events for each protocol
  const counts: Record<string, number> = {
    'Native STX': 0,
    'ALEX': 0,
    'Velar': 0,
    'Arkadiko': 0,
    'sBTC Bridge': 0,
    'StackSense': 0,
  }

  if (Array.isArray(events)) {
    events.slice(0, 50).forEach(e => {
      const p = e.protocol
      if (p) {
        // Find exact or fuzzy matching key
        const key = Object.keys(counts).find(k => k.toLowerCase() === p.toLowerCase())
        if (key) {
          counts[key]++
        }
      }
    })
  }

  // Get curved path command for quadratic bezier curve
  const getCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
    const cx = (x1 + x2) / 2 + (y2 - y1) * 0.15
    const cy = (y1 + y2) / 2 - (x2 - x1) * 0.15
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--bg-border)',
      borderRadius: 12,
      padding: '24px 20px',
      marginBottom: 24,
      position: 'relative',
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flowDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .flow-line {
          stroke-dasharray: 6, 4;
          animation: flowDash linear infinite;
        }
        .svg-node {
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .svg-node:hover {
          transform: scale(1.1);
        }
      `}} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Capital Migration Graph</h3>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Capital flow paths. Thickness and flow speed represents recent event density. Click a protocol node to filter.
          </span>
        </div>
        {selectedProtocol && (
          <button
            onClick={() => onSelectProtocol(null)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear Filter (Active: {selectedProtocol})
          </button>
        )}
      </div>

      <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
        <svg
          viewBox="0 0 600 300"
          width="100%"
          style={{ maxWidth: 600, height: 'auto', overflow: 'visible' }}
        >
          {/* Definitions for arrow markers and glow effects */}
          <defs>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {LINKS.map((link, idx) => {
              const linkWeight = (counts[link.source] || 0) + (counts[link.target] || 0)
              const isConnected = hoveredNode === link.source || hoveredNode === link.target
              const markerColor = isConnected ? 'var(--brand)' : '#272727'
              return (
                <marker
                  key={idx}
                  id={`arrow-${idx}`}
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 2 L 10 5 L 0 8 z" fill={markerColor} />
                </marker>
              )
            })}
          </defs>

          {/* Links / Directed Paths */}
          {LINKS.map((link, idx) => {
            const src = NODES[link.source]
            const dst = NODES[link.target]
            if (!src || !dst) return null

            // Compute dynamics based on transaction frequency
            const linkWeight = (counts[link.source] || 0) + (counts[link.target] || 0)
            const strokeWidth = Math.min(5, 1.5 + linkWeight * 0.5)
            // Faster animation (lower duration value) for higher weights
            const animDuration = Math.max(0.6, 6 - linkWeight * 0.75)

            // Hover state logic
            const isConnected = hoveredNode === link.source || hoveredNode === link.target
            const isAnyNodeHovered = hoveredNode !== null
            const isSelected = selectedProtocol === link.source || selectedProtocol === link.target
            const isAnyNodeSelected = selectedProtocol !== null

            let pathColor = 'rgba(39, 39, 39, 0.4)'
            let opacity = 0.5

            if (isAnyNodeHovered) {
              if (isConnected) {
                pathColor = 'var(--brand)'
                opacity = 0.95
              } else {
                opacity = 0.1
              }
            } else if (isAnyNodeSelected) {
              if (isSelected) {
                pathColor = 'var(--brand-text)'
                opacity = 0.85
              } else {
                opacity = 0.2
              }
            } else {
              if (linkWeight > 0) {
                pathColor = 'rgba(232, 93, 4, 0.3)' // Subtle brand orange for active paths
                opacity = 0.6
              }
            }

            const pathD = getCurvePath(src.x, src.y, dst.x, dst.y)

            return (
              <g key={idx}>
                {/* Background thicker line for click hit-box and depth */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={pathColor}
                  strokeWidth={strokeWidth + 2}
                  opacity={opacity * 0.3}
                />
                
                {/* Flowing dashed path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={pathColor}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  markerEnd={`url(#arrow-${idx})`}
                  className="flow-line"
                  style={{
                    animationDuration: `${animDuration}s`,
                  }}
                />
              </g>
            )
          })}

          {/* Nodes */}
          {Object.entries(NODES).map(([key, node]) => {
            const isHovered = hoveredNode === key
            const isSelected = selectedProtocol === node.fullName
            const weight = counts[key] || 0
            
            // Highlight node if selected or hovered
            const strokeColor = isSelected ? '#FFFFFF' : isHovered ? 'var(--brand)' : 'var(--bg-border)'
            const strokeWidth = isSelected ? 3 : isHovered ? 2.5 : 1.5

            return (
              <g
                key={key}
                transform={`translate(0, 0)`}
                className="svg-node"
                style={{
                  transformOrigin: `${node.x}px ${node.y}px`
                }}
                onMouseEnter={() => setHoveredNode(key)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectProtocol(isSelected ? null : node.fullName)}
              >
                {/* Glowing Outer Ring for active nodes */}
                {(isHovered || isSelected || weight > 0) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={20}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={4}
                    opacity={isHovered || isSelected ? 0.7 : 0.25}
                    filter="url(#nodeGlow)"
                  />
                )}

                {/* Node Center */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={14}
                  fill="var(--bg-surface)"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />

                {/* Inner Icon Dot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={6}
                  fill={node.color}
                />

                {/* Text Label */}
                <text
                  x={node.x}
                  y={node.y + 32}
                  textAnchor="middle"
                  fill={isHovered || isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'}
                  fontSize={10}
                  fontWeight={isHovered || isSelected ? '700' : '500'}
                  fontFamily="Inter, sans-serif"
                >
                  {node.label}
                </text>

                {/* Activity Badge (Txs count in active set) */}
                {weight > 0 && (
                  <g transform={`translate(${node.x + 10}, ${node.y - 12})`}>
                    <circle
                      r={7}
                      fill="var(--brand)"
                    />
                    <text
                      textAnchor="middle"
                      y={2.5}
                      fill="#FFFFFF"
                      fontSize={8}
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {weight}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: 10, color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }} /> STX
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED' }} /> ALEX
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EC4899' }} /> Velar
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} /> Arkadiko
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} /> sBTC
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E85D04' }} /> StackSense
        </div>
      </div>
    </div>
  )
}
