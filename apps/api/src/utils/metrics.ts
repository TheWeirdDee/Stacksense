// In-memory runtime metrics for the system diagnostics / status endpoint.
// The poller and other subsystems write here; routes/status.ts reads it.

const startedAt = Date.now();

interface PollerMetrics {
  lastPollAt: number | null;
  lastLatencyMs: number | null;
  totalCycles: number;
  totalErrors: number;
  lastError: string | null;
  // Dedup cache accounting — "new" are cache misses, "skipped" are hits.
  totalNew: number;
  totalSkipped: number;
  lastFetched: number;
}

const poller: PollerMetrics = {
  lastPollAt: null,
  lastLatencyMs: null,
  totalCycles: 0,
  totalErrors: 0,
  lastError: null,
  totalNew: 0,
  totalSkipped: 0,
  lastFetched: 0,
};

export function recordPollCycle(opts: {
  latencyMs: number;
  fetched: number;
  newCount: number;
  skippedCount: number;
}) {
  poller.lastPollAt = Date.now();
  poller.lastLatencyMs = Math.round(opts.latencyMs);
  poller.totalCycles += 1;
  poller.totalNew += opts.newCount;
  poller.totalSkipped += opts.skippedCount;
  poller.lastFetched = opts.fetched;
}

export function recordPollError(message: string) {
  poller.totalErrors += 1;
  poller.lastError = message;
  poller.lastPollAt = Date.now();
}

export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - startedAt) / 1000);
}

export function getPollerMetrics() {
  const totalSeen = poller.totalNew + poller.totalSkipped;
  const dedupHitRate = totalSeen > 0 ? poller.totalSkipped / totalSeen : 0;
  return {
    ...poller,
    dedupHitRate: parseFloat(dedupHitRate.toFixed(4)),
  };
}
