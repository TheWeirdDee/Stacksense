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
export declare class StackSenseError extends Error {
    readonly status: number;
    readonly body?: unknown | undefined;
    constructor(message: string, status: number, body?: unknown | undefined);
}
export declare class StackSense {
    private baseUrl;
    private wsUrl;
    private apiKey?;
    private timeoutMs;
    private fetchImpl;
    constructor(options?: StackSenseOptions);
    private request;
    /** Fetch recent interpreted signal events with optional filters. */
    getFeed(query?: FeedQuery): Promise<FeedResponse>;
    /** Behavioral history and archetype for a single Stacks address. */
    getWallet(address: string): Promise<unknown>;
    /** Global dashboard stats (events/10m, STX moved today, trending signals). */
    getStats(): Promise<unknown>;
    /** 24h activity buckets (count, volume, avg fee). */
    getPulse(): Promise<Array<{
        label: string;
        count: number;
        volume: number;
        avgFee: number;
    }>>;
    /** Contract / gas-spender / whale leaderboards. */
    getLeaderboard(): Promise<unknown>;
    /** Recent block metrics: block times and tx counts. */
    getNetworkBlocks(): Promise<unknown>;
    /** Pending mempool snapshot (sized/colored data for visualizations). */
    getMempool(): Promise<unknown>;
    /** System diagnostics: poll latency, Redis health, WS client count. */
    getStatus(): Promise<unknown>;
    /** Register a filtered webhook alert. */
    createAlert(input: CreateAlertInput): Promise<unknown>;
    /** List webhook alerts registered to a subscriber address. */
    listAlerts(subscriberAddress: string): Promise<unknown>;
    /** Disable a webhook alert by id. */
    disableAlert(webhookId: string): Promise<unknown>;
    /**
     * Subscribe to the live event stream over WebSocket.
     * In the browser the global `WebSocket` is used automatically; in Node pass
     * the `ws` package's constructor as `WebSocketImpl`.
     *
     * Returns an unsubscribe function.
     */
    streamFeed(onEvent: (event: SignalEvent) => void, opts?: {
        onError?: (err: unknown) => void;
        WebSocketImpl?: any;
    }): () => void;
}
export default StackSense;
