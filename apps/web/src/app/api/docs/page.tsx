'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { getApiUrl } from '@/lib/config';
import { Code2, Copy, Check, AlertCircle, ChevronDown, Play, Loader2 } from 'lucide-react';

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

  // Composer State
  const [composerEndpoint, setComposerEndpoint] = useState<'feed' | 'wallet' | 'stats'>('feed');
  const [composerLimit, setComposerLimit] = useState<number>(10);
  const [composerSignal, setComposerSignal] = useState<string>('all');
  const [composerProtocol, setComposerProtocol] = useState<string>('all');
  const [composerWalletAddress, setComposerWalletAddress] = useState<string>('SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV');
  const [composerTab, setComposerTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [composerResponse, setComposerResponse] = useState<any | null>(null);
  const [composerLoading, setComposerLoading] = useState<boolean>(false);
  const [composerError, setComposerError] = useState<string | null>(null);

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

  const handleSendComposerRequest = async () => {
    setComposerLoading(true);
    setComposerError(null);
    setComposerResponse(null);
    
    let url = '';
    if (composerEndpoint === 'feed') {
      const q = new URLSearchParams();
      q.set('limit', composerLimit.toString());
      if (composerSignal !== 'all') q.set('signal', composerSignal);
      if (composerProtocol !== 'all') q.set('protocol', composerProtocol);
      url = `${API}/api/v1/feed?${q.toString()}`;
    } else if (composerEndpoint === 'wallet') {
      url = `${API}/api/v1/wallet/${composerWalletAddress}`;
    } else if (composerEndpoint === 'stats') {
      url = `${API}/api/v1/stats`;
    }
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setComposerResponse(data);
    } catch (err: any) {
      setComposerError(err.message || 'Failed to fetch');
    } finally {
      setComposerLoading(false);
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

  const getCodeSnippet = () => {
    if (composerEndpoint === 'feed') {
      const q = [];
      q.push(`limit=${composerLimit}`);
      if (composerSignal !== 'all') q.push(`signal=${composerSignal}`);
      if (composerProtocol !== 'all') q.push(`protocol=${composerProtocol}`);
      const qs = q.join('&');
      
      if (composerTab === 'curl') {
        return `curl -X GET "${API}/api/v1/feed?${qs}" \\\n  -H "Content-Type: application/json"`;
      } else if (composerTab === 'js') {
        return `fetch("${API}/api/v1/feed?${qs}")\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
      } else {
        return `import requests\n\nurl = "${API}/api/v1/feed"\nparams = {\n    "limit": ${composerLimit},\n${composerSignal !== 'all' ? `    "signal": "${composerSignal}",\n` : ''}${composerProtocol !== 'all' ? `    "protocol": "${composerProtocol}",\n` : ''}}\nresponse = requests.get(url, params=params)\nprint(response.json())`;
      }
    } else if (composerEndpoint === 'wallet') {
      if (composerTab === 'curl') {
        return `curl -X GET "${API}/api/v1/wallet/${composerWalletAddress}" \\\n  -H "Content-Type: application/json"`;
      } else if (composerTab === 'js') {
        return `fetch("${API}/api/v1/wallet/${composerWalletAddress}")\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
      } else {
        return `import requests\n\nurl = "${API}/api/v1/wallet/${composerWalletAddress}"\nresponse = requests.get(url)\nprint(response.json())`;
      }
    } else { // stats
      if (composerTab === 'curl') {
        return `curl -X GET "${API}/api/v1/stats" \\\n  -H "Content-Type: application/json"`;
      } else if (composerTab === 'js') {
        return `fetch("${API}/api/v1/stats")\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
      } else {
        return `import requests\n\nurl = "${API}/api/v1/stats"\nresponse = requests.get(url)\nprint(response.json())`;
      }
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <p style={{ color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12, marginBottom: 8 }}>Documentation</p>
      <h1 style={{ fontSize: 32, margin: '0 0 16px', color: 'var(--text-primary)' }}>Developer API Documentation</h1>
      <p style={{ margin: '0 0 32px', color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.75 }}>
        Use the StackSense API to manage subscriptions, authenticate requests, and retrieve account information directly from your wallet.
      </p>

      {/* Interactive Request Composer */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 24, marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>Interactive Request Composer</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
          Configure query parameters to auto-generate code snippets, and fetch real-time Stacks blockchain intelligence directly from your browser.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Controls column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Endpoint</label>
              <select
                value={composerEndpoint}
                onChange={(e) => {
                  setComposerEndpoint(e.target.value as any);
                  setComposerResponse(null);
                  setComposerError(null);
                }}
                style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
              >
                <option value="feed">GET /api/v1/feed</option>
                <option value="wallet">GET /api/v1/wallet/:address</option>
                <option value="stats">GET /api/v1/stats</option>
              </select>
            </div>

            {composerEndpoint === 'feed' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limit</label>
                  <input
                    type="number"
                    value={composerLimit}
                    onChange={(e) => setComposerLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signal Type</label>
                  <select
                    value={composerSignal}
                    onChange={(e) => setComposerSignal(e.target.value)}
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                  >
                    <option value="all">all</option>
                    <option value="bullish">bullish</option>
                    <option value="neutral">neutral</option>
                    <option value="risk">risk</option>
                    <option value="anomaly">anomaly</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Protocol</label>
                  <select
                    value={composerProtocol}
                    onChange={(e) => setComposerProtocol(e.target.value)}
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                  >
                    <option value="all">all</option>
                    <option value="alex">ALEX</option>
                    <option value="arkadiko">Arkadiko</option>
                    <option value="velar">Velar</option>
                    <option value="sbtc">sBTC Bridge</option>
                    <option value="native">Native STX</option>
                    <option value="stacksense">StackSense</option>
                  </select>
                </div>
              </>
            )}

            {composerEndpoint === 'wallet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet Address</label>
                <input
                  type="text"
                  value={composerWalletAddress}
                  onChange={(e) => setComposerWalletAddress(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', outline: 'none', fontSize: 13, fontFamily: 'monospace' }}
                />
              </div>
            )}

            <button
              onClick={handleSendComposerRequest}
              disabled={composerLoading}
              style={{
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: composerLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                transition: 'opacity 0.2s',
                opacity: composerLoading ? 0.7 : 1,
              }}
            >
              {composerLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending Request...
                </>
              ) : (
                <>
                  <Play size={14} fill="#fff" />
                  Send Request
                </>
              )}
            </button>
          </div>

          {/* Snippets & response column */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Snippet Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-border)', marginBottom: 12 }}>
              {(['curl', 'js', 'python'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setComposerTab(tab)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: composerTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
                    color: composerTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: -1,
                  }}
                >
                  {tab === 'curl' ? 'cURL' : tab === 'js' ? 'JavaScript' : 'Python'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <CodeBlock
                code={getCodeSnippet()}
                language={composerTab === 'curl' ? 'bash' : composerTab === 'js' ? 'javascript' : 'python'}
                copyKey="composer-code"
              />
            </div>

            {/* Response Viewer */}
            {(composerResponse || composerError || composerLoading) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 180 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Response</span>
                <div style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 12,
                  padding: 16,
                  overflow: 'auto',
                  flex: 1,
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  maxHeight: 250,
                }}>
                  {composerLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
                      Loading live API response...
                    </div>
                  )}
                  {composerError && (
                    <div style={{ color: '#EF4444' }}>
                      Error: {composerError}
                    </div>
                  )}
                  {composerResponse && (
                    <pre style={{ margin: 0, color: '#22C55E' }}>
                      <code>{JSON.stringify(composerResponse, null, 2)}</code>
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
