'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { getApiUrl } from '@/lib/config';
import { Code2, Copy, Check, AlertCircle, ChevronDown } from 'lucide-react';

const API = getApiUrl();

export default function ApiDocsPage() {
  const { address, connected } = useWallet();
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [exampleResponses, setExampleResponses] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    auth: true,
    pricing: false,
    subscription: false,
    apiKey: false,
  });

  useEffect(() => {
    checkApiStatus();
  }, []);

  useEffect(() => {
    if (address && connected) {
      fetchExamples();
    }
  }, [address, connected]);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) {
        setApiStatus('ok');
      } else {
        setApiStatus('error');
      }
    } catch {
      setApiStatus('error');
    }
  };

  const fetchExamples = async () => {
    if (!address) return;

    try {
      const pricingRes = await fetch(`${API}/api/v1/subscriptions/pricing`);
      const pricingData = await pricingRes.json();
      setExampleResponses((prev) => ({ ...prev, pricing: pricingData }));

      const subRes = await fetch(`${API}/api/v1/subscriptions/subscription/${address}`);
      const subData = await subRes.json();
      setExampleResponses((prev) => ({ ...prev, subscription: subData }));
    } catch {
      // Silently handle if user not subscribed yet
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const CodeBlock = ({ code, language = 'bash', copyKey }: { code: string; language?: string; copyKey: string }) => (
    <div style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'monospace' }}>{language}</p>
        <button
          onClick={() => copyToClipboard(code, copyKey)}
          style={{
            background: 'transparent',
            border: '1px solid var(--bg-border)',
            borderRadius: 4,
            padding: '6px 8px',
            cursor: 'pointer',
            color: copied[copyKey] ? '#22C55E' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            transition: 'color 0.2s',
          }}
        >
          {copied[copyKey] ? <Check size={14} /> : <Copy size={14} />}
          {copied[copyKey] ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '16px',
          overflowX: 'auto',
          fontSize: 13,
          color: 'var(--text-primary)',
          fontFamily: 'JetBrains Mono, monospace',
          lineHeight: 1.5,
          background: 'var(--bg-base)',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );

  const Section = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 32 }}>
      <button
        onClick={() => toggleSection(id)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {title}
        <ChevronDown size={20} style={{ transform: expandedSections[id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>
      {expandedSections[id] && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <p style={{ color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12, marginBottom: 8 }}>Documentation</p>
      <h1 style={{ fontSize: 32, margin: '0 0 16px', color: 'var(--text-primary)' }}>Developer API Documentation</h1>
      <p style={{ margin: '0 0 32px', color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.75 }}>
        Use the StackSense API to manage subscriptions, authenticate requests, and retrieve account information directly from your wallet.
      </p>

      {apiStatus !== 'ok' && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 18, marginBottom: 32, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, color: '#EF4444', fontWeight: 600 }}>API Offline</p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
              The backend is not currently running. Make sure to start the server with `npm run dev` in `apps/api/`.
            </p>
          </div>
        </div>
      )}

      <Section id="auth" title="Authentication">
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>
          All protected endpoints require the `x-api-key` header. Generate a key by subscribing to a paid plan or selecting the free tier.
        </p>
        <CodeBlock
          code={`curl -X GET \\
  "https://api.stacksense.io/api/v1/subscriptions/subscription/SP3DBM...123" \\
  -H "x-api-key: YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json"`}
          language="bash"
          copyKey="auth-curl"
        />
        <p style={{ margin: '16px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          Replace `YOUR_API_KEY_HERE` with your key from the <strong>API Keys</strong> section.
        </p>
      </Section>

      <Section id="pricing" title="Plans & Pricing">
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>
          Retrieve current pricing and tier information without authentication.
        </p>
        <CodeBlock
          code={`curl -X GET \\
  "${API}/api/v1/subscriptions/pricing" \\
  -H "Content-Type: application/json"`}
          language="bash"
          copyKey="pricing-curl"
        />
        {exampleResponses.pricing && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Response:</p>
            <pre
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--bg-border)',
                borderRadius: 8,
                padding: 16,
                overflowX: 'auto',
                fontSize: 13,
                color: '#22C55E',
                fontFamily: 'JetBrains Mono, monospace',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {JSON.stringify(exampleResponses.pricing, null, 2)}
            </pre>
          </div>
        )}
      </Section>

      <Section id="subscription" title="Subscription Status">
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>
          Check your active subscription tier, request limits, and usage.
        </p>
        <CodeBlock
          code={`curl -X GET \\
  "${API}/api/v1/subscriptions/subscription/YOUR_WALLET_ADDRESS" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
          language="bash"
          copyKey="subscription-curl"
        />
        {exampleResponses.subscription && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Example Response:</p>
            <pre
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--bg-border)',
                borderRadius: 8,
                padding: 16,
                overflowX: 'auto',
                fontSize: 13,
                color: '#22C55E',
                fontFamily: 'JetBrains Mono, monospace',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {JSON.stringify(exampleResponses.subscription, null, 2)}
            </pre>
          </div>
        )}
      </Section>

      <Section id="apiKey" title="Manage API Keys">
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>
          Retrieve key metadata and usage statistics for your current API key.
        </p>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Get Key Metadata</p>
          <CodeBlock
            code={`curl -X GET \\
  "${API}/api/v1/subscriptions/api-key/YOUR_WALLET_ADDRESS" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
            language="bash"
            copyKey="apikey-get"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Get Usage Statistics</p>
          <CodeBlock
            code={`curl -X GET \\
  "${API}/api/v1/subscriptions/usage/YOUR_WALLET_ADDRESS" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
            language="bash"
            copyKey="apikey-usage"
          />
        </div>

        <div>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Regenerate Key</p>
          <CodeBlock
            code={`curl -X POST \\
  "${API}/api/v1/subscriptions/api-key/regenerate" \\
  -H "x-api-key: YOUR_CURRENT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "subscriberAddress": "YOUR_WALLET_ADDRESS"
  }'`}
            language="bash"
            copyKey="apikey-regenerate"
          />
        </div>
      </Section>

      <div style={{ marginTop: 60, padding: 24, background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 12 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--text-primary)' }}>API Base URL</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{API}</p>
      </div>
    </div>
  );
}
