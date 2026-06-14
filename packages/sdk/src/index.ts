/**
 * @stacksense/sdk — official Node.js / browser client for the StackSense API.
 *
 * Dependency-free: uses the global `fetch` (Node 18+ / modern browsers).
 * WebSocket streaming is optional and accepts an injected implementation so
 * the package stays runtime-agnostic (browser `WebSocket`, or the `ws` package
 * in Node).
 */

export interface StackSenseOptions {
  /** API base URL, e.g. https://stacksense-production-7a6f.up.railway.app */
  baseUrl?: string;
  /** API key sent as the `x-api-key` header. */
  apiKey?: string;
  /** WebSocket endpoint for live feed streaming. */
  wsUrl?: string;
  /** Per-request timeout in ms (default 10000). */
  timeoutMs?: number;
  /** Custom fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch;
}

export interface FeedQuery {
  limit?: number;
  offset?: number;
  signal?: string;
  protocol?: string;
  min_stx?: number;
  max_stx?: number;
}

export interface SignalEvent {
  id: string;
  rule_id?: string;
  title: string;
  description?: string;
  signal: string;
  protocol?: string;
  stx_amount: number;
  usd_amount?: number;
  wallet_address?: string;
  wallet_archetype?: string;
  is_anomaly?: boolean;
  multiplier?: number;
  timestamp: string;
}

export interface FeedResponse {
  events: SignalEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface AlertFilters {
  minStxAmount?: number;
  signals?: string[];
  protocols?: string[];
}

export interface CreateAlertInput {
  subscriberAddress: string;
  webhookUrl: string;
  filters?: AlertFilters;
}

export class StackSenseError extends Error {
  constructor(message: string, readonly status: number, readonly body?: unknown) {
    super(message);
    this.name = 'StackSenseError';
  }
}

const DEFAULT_BASE = 'https://stacksense-production-7a6f.up.railway.app';
const DEFAULT_WS = 'wss://stacksense-production-7a6f.up.railway.app/ws';

export class StackSense {
  private baseUrl: string;
  private wsUrl: string;
  private apiKey?: string;
  private timeoutMs: number;
  private fetchImpl: typeof fetch;

  constructor(options: StackSenseOptions = {}) {
    this.baseUrl = (options.baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
    this.wsUrl = options.wsUrl || DEFAULT_WS;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    const f = options.fetchImpl || (globalThis.fetch as typeof fetch | undefined);
    if (!f) {
      throw new Error('No fetch implementation found. Pass `fetchImpl` (e.g. node-fetch) on Node < 18.');
    }
    this.fetchImpl = f;
  }

  private async request<T>(path: string, init?: RequestInit & { query?: Record<string, unknown> }): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (init?.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url.toString(), {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
          ...(init?.headers || {}),
        },
      });

      const text = await res.text();
      const body = text ? safeJson(text) : undefined;
      if (!res.ok) {
        const message = (body as any)?.error || `Request failed with status ${res.status}`;
        throw new StackSenseError(message, res.status, body);
      }
      return body as T;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new StackSenseError(`Request to ${path} timed out after ${this.timeoutMs}ms`, 0);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Feed ────────────────────────────────────────────────────────────────
  /** Fetch recent interpreted signal events with optional filters. */
  getFeed(query: FeedQuery = {}): Promise<FeedResponse> {
    return this.request<FeedResponse>('/api/v1/feed', { query: query as Record<string, unknown> });
  }

  // ── Wallet ──────────────────────────────────────────────────────────────
  /** Behavioral history and archetype for a single Stacks address. */
  getWallet(address: string): Promise<unknown> {
    return this.request(`/api/v1/wallet/${encodeURIComponent(address)}`);
  }

  // ── Stats ───────────────────────────────────────────────────────────────
  /** Global dashboard stats (events/10m, STX moved today, trending signals). */
  getStats(): Promise<unknown> {
    return this.request('/api/v1/stats');
  }

  /** 24h activity buckets (count, volume, avg fee). */
  getPulse(): Promise<Array<{ label: string; count: number; volume: number; avgFee: number }>> {
    return this.request('/api/v1/stats/pulse');
  }

  /** Contract / gas-spender / whale leaderboards. */
  getLeaderboard(): Promise<unknown> {
    return this.request('/api/v1/stats/leaderboard');
  }

  // ── Network ─────────────────────────────────────────────────────────────
  /** Recent block metrics: block times and tx counts. */
  getNetworkBlocks(): Promise<unknown> {
    return this.request('/api/v1/network/blocks');
  }

  /** Pending mempool snapshot (sized/colored data for visualizations). */
  getMempool(): Promise<unknown> {
    return this.request('/api/v1/network/mempool');
  }

  // ── Diagnostics ─────────────────────────────────────────────────────────
  /** System diagnostics: poll latency, Redis health, WS client count. */
  getStatus(): Promise<unknown> {
    return this.request('/api/v1/status');
  }

  // ── Alerts ──────────────────────────────────────────────────────────────
  /** Register a filtered webhook alert. */
  createAlert(input: CreateAlertInput): Promise<unknown> {
    return this.request('/api/v1/alerts/create', { method: 'POST', body: JSON.stringify(input) });
  }

  /** List webhook alerts registered to a subscriber address. */
  listAlerts(subscriberAddress: string): Promise<unknown> {
    return this.request(`/api/v1/alerts/list/${encodeURIComponent(subscriberAddress)}`);
  }

  /** Disable a webhook alert by id. */
  disableAlert(webhookId: string): Promise<unknown> {
    return this.request(`/api/v1/alerts/disable/${encodeURIComponent(webhookId)}`, { method: 'POST' });
  }

  // ── Streaming ───────────────────────────────────────────────────────────
  /**
   * Subscribe to the live event stream over WebSocket.
   * In the browser the global `WebSocket` is used automatically; in Node pass
   * the `ws` package's constructor as `WebSocketImpl`.
   *
   * Returns an unsubscribe function.
   */
  streamFeed(
    onEvent: (event: SignalEvent) => void,
    opts: { onError?: (err: unknown) => void; WebSocketImpl?: any } = {}
  ): () => void {
    const WS = opts.WebSocketImpl || (globalThis as any).WebSocket;
    if (!WS) {
      throw new Error('No WebSocket implementation found. Pass `WebSocketImpl` (e.g. from the `ws` package) in Node.');
    }
    const socket = new WS(this.wsUrl);

    socket.onmessage = (msg: any) => {
      try {
        const payload = JSON.parse(typeof msg.data === 'string' ? msg.data : msg.data.toString());
        if (payload.type === 'event' && payload.data) {
          onEvent(payload.data as SignalEvent);
        } else if (payload.type === 'initial' && Array.isArray(payload.data)) {
          for (const e of payload.data) onEvent(e as SignalEvent);
        } else if (payload.type === 'ping') {
          try { socket.send(JSON.stringify({ type: 'pong' })); } catch { /* noop */ }
        }
      } catch (err) {
        opts.onError?.(err);
      }
    };
    socket.onerror = (err: any) => opts.onError?.(err);

    return () => {
      try { socket.close(); } catch { /* noop */ }
    };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default StackSense;
