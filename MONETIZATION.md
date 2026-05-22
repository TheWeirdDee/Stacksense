# StackSense Monetization & Growth Strategy

## Overview

StackSense v1 now includes multiple revenue-generating features designed to increase mainnet transaction volume and boost ranking in the Stacks Builder Rewards program.

## Features Implemented

### 1. **API Subscription Tiers** (`/api/v1/subscriptions`)

Three-tier subscription model with different capabilities:

- **Free**: 1,000 requests/month (no webhooks)
- **Pro**: 100,000 requests/month + Webhooks (1 STX/month)
- **Enterprise**: 1M requests/month + Webhooks + Priority Support + Custom Rules (10 STX/month)

**Generate Revenue**: Each subscription payment goes to the StackSense contract, generating STX fees tracked by Talent App.

**Frontend**: `/subscriptions` page for users to upgrade tiers.

### 2. **Webhook Alerts System** (`/api/v1/alerts`)

Real-time event notifications delivered to user-defined webhooks.

**Features**:
- Create custom webhooks with filters (signal type, protocol, min STX amount)
- Pro+ tier gets full webhook support
- Webhook delivery tracked for audit/analytics

**Usage Example**:
```bash
POST /api/v1/alerts/create
{
  "subscriberAddress": "SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV",
  "webhookUrl": "https://myapp.com/webhook",
  "filters": {
    "signals": ["anomaly"],
    "minStxAmount": 10000
  }
}
```

### 3. **GitHub Developer Tracking** (`/api/v1/developers`)

Tracks GitHub commits to Stacks ecosystem and measures developer impact.

**Metrics Tracked**:
- Total commits to Stacks core repos
- Commits to ecosystem (ALEX, Arkadiko, Velar, etc.)
- Ecosystem contribution ratio

**Ecosystem Repos Monitored**:
- stacks-network/stacks-blockchain
- clarity-lang/clarity-lang
- hirosystems/clarinet
- alexgo/alexgo
- arkadiko-dao/arkadiko
- stacksswap/stacksswap
- velarprotocol/velar-protocol

**Frontend**: `/developers` page for registration and stat tracking.

### 4. **Clarity Smart Contracts**

#### `signal-tips.clar` (Existing)
- Users tip 1 STX to boost signals
- Voting mechanism (bullish/bearish)
- Generates onchain transaction volume

#### `stacksense-subscriptions.clar` (New)
- Manages subscription tier state
- Processes subscription payments
- Records API key access patterns
- Enables tiered access control

### 5. **Rule Engine Expansion**

Enhanced rules.json now covers:
- ALEX swaps/LP additions
- Arkadiko vaults/liquidations
- Velar DEX activity
- sBTC bridge operations
- Native STX whale movements
- StackSense signal tips & voting

**Result**: More mainnet events detected = more broadcast activity = more engagement

---

## Revenue Model

### Direct Revenue
1. **Subscription fees** → STX paid to contract (tracked as fees)
2. **Webhook notifications** → Usage-based tracking (future monetization)
3. **API usage fees** → Premium endpoints (future)

### Indirect Revenue (Ranking Boost)
1. **Mainnet Fees Generated** ← Subscription payments + tips
2. **Mainnet Unique Callers** ← Subscription users + developers + API clients
3. **Mainnet Transactions** ← Each subscription payment = 1 transaction
4. **GitHub Commits** ← Developer ecosystem contributions tracked

---

## How to Use

### For Users (Getting on Leaderboard)

1. **Deploy StackSense to Mainnet**
   ```bash
   # Deploy signal-tips.clar
   clarinet contract deploy signal-tips --network mainnet
   
   # Deploy stacksense-subscriptions.clar
   clarinet contract deploy stacksense-subscriptions --network mainnet
   ```

2. **Market Subscriptions**
   - Direct users to `/subscriptions`
   - Emphasize webhook benefits for traders
   - Show GitHub stats at `/developers`

3. **Drive Tips**
   - Integrate tip button in all signal cards
   - Show top-tipped signals dashboard
   - Reward frequent tippers (future)

### For API Developers

1. **Get API Key**
   ```bash
   curl -X POST http://localhost:3001/api/v1/subscriptions/api-keys/generate \
     -H "Content-Type: application/json" \
     -d '{"tier":"pro","subscriberAddress":"SP..."}'
   ```

2. **Use Webhooks**
   ```bash
   curl -X POST http://localhost:3001/api/v1/alerts/create \
     -H "Content-Type: application/json" \
     -d '{
       "subscriberAddress":"SP...",
       "webhookUrl":"https://myapp.com/webhook",
       "filters":{"signals":["anomaly"]}
     }'
   ```

3. **Track GitHub Stats**
   ```bash
   curl -X POST http://localhost:3001/api/v1/developers/register \
     -H "Content-Type: application/json" \
     -d '{"username":"torvalds","stacksAddress":"SP..."}'
   ```

---

## Ranking Impact

| Metric | How We Generate It |
|--------|-------------------|
| **Mainnet Fees** | Subscription payments (5-25 STX each) |
| **Unique Callers** | Each subscription user = 1 caller |
| **Transactions** | Each subscription = 1 TX; each tip = 1 TX |
| **Ecosystem Commits** | Track GitHub via `/developers` endpoint |
| **Contract Deployments** | Signal-tips & subscriptions contracts deployed |

**Target**: 100+ subscription users × 5 STX minimum = $500+ fees/month visible on leaderboard.

---

## Deployment Checklist

- [ ] Deploy `stacksense-subscriptions.clar` to mainnet
- [ ] Update `.env` with contract addresses
- [ ] Test subscription flows on testnet
- [ ] Enable GitHub token in `.env` for ecosystem tracking
- [ ] Update landing page with subscription CTA
- [ ] Create marketing copy for tiers
- [ ] Monitor webhook delivery for reliability
- [ ] Set up monitoring dashboard for metrics

---

## Future Enhancements

1. **Tiered Discord Roles** - Pro subscribers get access channel
2. **Custom Rules** - Enterprise users create private rules
3. **Mobile Notifications** - Push alerts for anomalies
4. **Analytics Dashboard** - Subscription usage analytics
5. **Referral Program** - 10% commission for subscription referrals
6. **Premium Signals** - Exclusive anomaly detection for Pro+
7. **Governance Token** - STX holders vote on new features

---

## Monitoring

Track these metrics on leaderboard:

```
Daily Active Users: /api/v1/subscriptions/pricing
Webhook Deliveries: /api/v1/alerts/list/:address
Developer Registrations: /api/v1/developers/stats/:address
Tip Transactions: Clarity contract events
```

---

## Support

- GitHub Issues: https://github.com/your-org/stacksense
- Docs: `/about` page with methodology
- API Docs: OpenAPI spec (TODO)
