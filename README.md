# StackSense

Real-time blockchain intelligence layer for the Stacks blockchain.

## Tech Stack
- **Backend**: Node.js, Express, WS, Redis, Zod, Axios
- **Frontend**: Next.js 14 (App Router), TailwindCSS, React Query

## Getting Started

### Prerequisites
- Node.js 20 LTS
- Docker (for Redis)

### Setup
1. Clone the repo
2. Create `.env` from template
3. Start Redis: `docker-compose up -d`
4. Install dependencies: `npm install`
5. Run API: `npm run dev:api`
6. Run Web: `npm run dev:web`

## Architecture
StackSense polls the Hiro API for recent Stacks transactions, runs them through a rule-based interpretation engine, and pushes human-readable signals to a live feed via WebSockets.

## Signals
- **Bullish**: Large liquidity additions or swaps.
- **Neutral**: Standard large transfers or protocol interactions.
- **Risk**: Significant deleveraging or burns.
- **Anomaly**: Statistical outliers in transaction value.
