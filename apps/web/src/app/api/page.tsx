import Link from 'next/link';

export default function ApiHubPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12, marginBottom: 8 }}>API Hub</p>
        <h1 style={{ fontSize: 36, margin: 0, lineHeight: 1.1, color: 'var(--text-primary)' }}>
          Everything API in one place
        </h1>
        <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.75 }}>
          Manage your StackSense API keys, choose the right subscription plan, and consult the developer docs from a single hub.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        <Link href="/api/keys" style={{ display: 'block', borderRadius: 18, border: '1px solid var(--bg-border)', background: 'var(--bg-surface)', padding: 24, textDecoration: 'none', color: 'inherit' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--text-primary)' }}>API Keys</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Securely store and rotate your credentials, then monitor usage and requests for your active API key.
          </p>
        </Link>

        <Link href="/api/plans" style={{ display: 'block', borderRadius: 18, border: '1px solid var(--bg-border)', background: 'var(--bg-surface)', padding: 24, textDecoration: 'none', color: 'inherit' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--text-primary)' }}>Plans</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Compare tiers, upgrade your account, and subscribe with a validated on-chain payment flow.
          </p>
        </Link>

        <Link href="/api/docs" style={{ display: 'block', borderRadius: 18, border: '1px solid var(--bg-border)', background: 'var(--bg-surface)', padding: 24, textDecoration: 'none', color: 'inherit' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--text-primary)' }}>Documentation</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Browse endpoint references, authentication instructions, and example requests for StackSense APIs.
          </p>
        </Link>
      </div>
    </div>
  );
}
