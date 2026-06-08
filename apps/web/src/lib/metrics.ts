/**
 * Monitoring & Metrics Utilities
 * Tracks application performance and usage
 */

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private maxHistorySize = 100;

  recordMetric(name: string, value: number, unit: string = ''): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const history = this.metrics.get(name)!;
    history.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
    });

    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  getMetric(name: string): Metric | null {
    const history = this.metrics.get(name);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  getMetricHistory(name: string): Metric[] {
    return this.metrics.get(name) ?? [];
  }

  getAverage(name: string): number {
    const history = this.getMetricHistory(name);
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, m) => acc + m.value, 0);
    return sum / history.length;
  }

  recordApiCall(endpoint: string, duration: number): void {
    this.recordMetric(`api_call:${endpoint}`, duration, 'ms');
  }

  recordComponentRender(componentName: string, duration: number): void {
    this.recordMetric(`render:${componentName}`, duration, 'ms');
  }

  recordUserAction(action: string): void {
    this.recordMetric(`action:${action}`, 1, 'count');
  }

  clear(): void {
    this.metrics.clear();
  }

  export(): Record<string, Metric[]> {
    const result: Record<string, Metric[]> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

export const metricsCollector = new MetricsCollector();
