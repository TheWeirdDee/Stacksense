<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Log: StackSense v1 Implementation

## Backend Implementation (`apps/api`)
- **Core Environment**: Node.js 20 LTS with ESM (`type: module`).
- **Data Pipeline**:
  - Implemented Hiro Stacks API poller (`ingestion/poller.ts`) with 10s cycle.
  - Redis-based de-duplication with 48h TTL for processed TXIDs.
- **Rule Engine**:
  - Rule-based interpretation engine (`engine/matcher.ts`) using `rules/rules.json`.
  - Supports template variables: `{archetype}`, `{stx_amount}`, `{usd_amount}`, `{protocol}`, `{multiplier}`.
  - MicroSTX to STX conversion utility (`engine/utils.ts`).
- **Analytics & Intelligence**:
  - Statistical Anomaly Detection (`engine/anomaly.ts`) using rolling mean + 2*stddev.
  - Wallet Archetype classification (`engine/archetype.ts`) based on behavioral heuristics.
- **Real-time & APIs**:
  - WebSocket server (`ws/server.ts`) with heartbeats and initial state broadcast.
  - RESTful routes (`routes/feed.ts`, `routes/wallet.ts`, `routes/stats.ts`).
  - Periodic STX Price Feed from CoinGecko (5min cache).
- **Validation**: Zod schemas (`engine/schemas.ts`) for interpreted event validation.

## Frontend Implementation (`apps/web`)
- **Framework**: Next.js 16 (App Router) + Tailwind CSS 4.
- **Design System**: 
  - Custom dark-mode color palette and JetBrains Mono integration in `globals.css`.
  - Tailwind 4 `@import` syntax used to resolve IDE warnings.
- **Components**:
  - `FeedCard.tsx`: Real-time event card with signal-coded borders and framer-motion animations.
  - `SignalTag.tsx`, `WalletAddress.tsx`, `StatBlock.tsx`, `FilterBar.tsx`.
- **Logic & State**:
  - `useFeed.ts`: WebSocket + Initial fetch management.
  - `useStats.ts`: TanStack Query for global dashboard stats.
- **Pages**:
  - `/`: High-fidelity landing page.
  - `/feed`: Core real-time dashboard with sidebar filters.
  - `/wallet`: Searchable wallet behavioral history.
  - `/about`: signal definitions and mission statement.

## Dependencies Installed
- **Backend**: `express`, `ws`, `redis`, `axios`, `zod`, `dotenv`, `uuid`, `tsx`, `typescript`.
- **Frontend**: `next`, `react`, `framer-motion`, `lucide-react`, `@tanstack/react-query`, `clsx`, `tailwind-merge`, `zod`, `axios`.

## Infrastructure
- **Redis**: Docker Compose setup for ephemeral event store and baseline analytics.
- **Monorepo**: Root `package.json` configured with npm workspaces.
