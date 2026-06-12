/**
 * @stacksense/sdk — official Node.js / browser client for the StackSense API.
 *
 * Dependency-free: uses the global `fetch` (Node 18+ / modern browsers).
 * WebSocket streaming is optional and accepts an injected implementation so
 * the package stays runtime-agnostic (browser `WebSocket`, or the `ws` package
 * in Node).
 */
export class StackSenseError extends Error {
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'StackSenseError';
    }
}
const DEFAULT_BASE = 'https://stacksense-production-7a6f.up.railway.app';
const DEFAULT_WS = 'wss://stacksense-production-7a6f.up.railway.app/ws';
export class StackSense {
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
        this.wsUrl = options.wsUrl || DEFAULT_WS;
        this.apiKey = options.apiKey;
        this.timeoutMs = options.timeoutMs ?? 10000;
        const f = options.fetchImpl || globalThis.fetch;
        if (!f) {
            throw new Error('No fetch implementation found. Pass `fetchImpl` (e.g. node-fetch) on Node < 18.');
        }
        this.fetchImpl = f;
    }
    async request(path, init) {
        const url = new URL(this.baseUrl + path);
        if (init?.query) {
            for (const [k, v] of Object.entries(init.query)) {
                if (v !== undefined && v !== null)
                    url.searchParams.set(k, String(v));
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
                const message = body?.error || `Request failed with status ${res.status}`;
                throw new StackSenseError(message, res.status, body);
            }
            return body;
        }
        catch (err) {
            if (err?.name === 'AbortError') {
                throw new StackSenseError(`Request to ${path} timed out after ${this.timeoutMs}ms`, 0);
            }
            throw err;
        }
        finally {
            clearTimeout(timer);
        }
    }
    // ── Feed ────────────────────────────────────────────────────────────────
    /** Fetch recent interpreted signal events with optional filters. */
    getFeed(query = {}) {
        return this.request('/api/v1/feed', { query: query });
    }
    // ── Wallet ──────────────────────────────────────────────────────────────
    /** Behavioral history and archetype for a single Stacks address. */
    getWallet(address) {
        return this.request(`/api/v1/wallet/${encodeURIComponent(address)}`);
    }
    // ── Stats ───────────────────────────────────────────────────────────────
    /** Global dashboard stats (events/10m, STX moved today, trending signals). */
    getStats() {
        return this.request('/api/v1/stats');
    }
    /** 24h activity buckets (count, volume, avg fee). */
    getPulse() {
        return this.request('/api/v1/stats/pulse');
    }
    /** Contract / gas-spender / whale leaderboards. */
    getLeaderboard() {
        return this.request('/api/v1/stats/leaderboard');
    }
    // ── Network ─────────────────────────────────────────────────────────────
    /** Recent block metrics: block times and tx counts. */
    getNetworkBlocks() {
        return this.request('/api/v1/network/blocks');
    }
    /** Pending mempool snapshot (sized/colored data for visualizations). */
    getMempool() {
        return this.request('/api/v1/network/mempool');
    }
    // ── Diagnostics ─────────────────────────────────────────────────────────
    /** System diagnostics: poll latency, Redis health, WS client count. */
    getStatus() {
        return this.request('/api/v1/status');
    }
    // ── Alerts ──────────────────────────────────────────────────────────────
    /** Register a filtered webhook alert. */
    createAlert(input) {
        return this.request('/api/v1/alerts/create', { method: 'POST', body: JSON.stringify(input) });
    }
    /** List webhook alerts registered to a subscriber address. */
    listAlerts(subscriberAddress) {
        return this.request(`/api/v1/alerts/list/${encodeURIComponent(subscriberAddress)}`);
    }
    /** Disable a webhook alert by id. */
    disableAlert(webhookId) {
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
    streamFeed(onEvent, opts = {}) {
        const WS = opts.WebSocketImpl || globalThis.WebSocket;
        if (!WS) {
            throw new Error('No WebSocket implementation found. Pass `WebSocketImpl` (e.g. from the `ws` package) in Node.');
        }
        const socket = new WS(this.wsUrl);
        socket.onmessage = (msg) => {
            try {
                const payload = JSON.parse(typeof msg.data === 'string' ? msg.data : msg.data.toString());
                if (payload.type === 'event' && payload.data) {
                    onEvent(payload.data);
                }
                else if (payload.type === 'initial' && Array.isArray(payload.data)) {
                    for (const e of payload.data)
                        onEvent(e);
                }
                else if (payload.type === 'ping') {
                    try {
                        socket.send(JSON.stringify({ type: 'pong' }));
                    }
                    catch { /* noop */ }
                }
            }
            catch (err) {
                opts.onError?.(err);
            }
        };
        socket.onerror = (err) => opts.onError?.(err);
        return () => {
            try {
                socket.close();
            }
            catch { /* noop */ }
        };
    }
}
function safeJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
export default StackSense;
