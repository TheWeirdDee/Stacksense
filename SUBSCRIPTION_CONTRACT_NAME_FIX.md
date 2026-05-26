# Environment Variable Fix: Subscription Contract Name

## Issue
The subscription contract name had a typo in the environment configuration:
- **Incorrect**: `subcription-tips` (missing 's')
- **Correct**: `subscription-tips`

## Solution
Update your `.env.local` and deployment configurations:

```bash
# BEFORE (incorrect)
NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_NAME=subcription-tips

# AFTER (correct)
NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_NAME=subscription-tips
```

## Impact
- ✅ Subscription purchase flow now calls the correct on-chain contract
- ✅ API key generation properly stores transaction references
- ⚠️ Existing deployments using the typo name will fail to execute contract calls

## Action Required
1. Update `.env.local` in `apps/web/` 
2. Redeploy frontend and backend
3. Test subscription purchase flow with corrected contract name

See `.env.local.example` for the complete configuration template.
