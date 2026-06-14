import dns from 'dns/promises';

/**
 * SSRF guard for user-supplied webhook URLs.
 *
 * Webhook targets are fetched server-side, so an attacker could otherwise point
 * them at cloud metadata (169.254.169.254), localhost services, or private LAN
 * hosts. We reject non-http(s) schemes and any hostname that resolves to a
 * private / loopback / link-local / reserved address. Resolution is re-checked
 * immediately before each send to mitigate DNS-rebinding (TOCTOU).
 */

export interface SsrfCheck {
  ok: boolean;
  reason?: string;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // treat unparseable as unsafe
  const inRange = (cidrBase: string, bits: number) => {
    const base = ipv4ToInt(cidrBase)!;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (base & mask);
  };
  return (
    inRange('0.0.0.0', 8) ||       // "this" network
    inRange('10.0.0.0', 8) ||      // private
    inRange('100.64.0.0', 10) ||   // CGNAT
    inRange('127.0.0.0', 8) ||     // loopback
    inRange('169.254.0.0', 16) ||  // link-local (incl. cloud metadata)
    inRange('172.16.0.0', 12) ||   // private
    inRange('192.0.0.0', 24) ||    // IETF protocol assignments
    inRange('192.168.0.0', 16) ||  // private
    inRange('198.18.0.0', 15) ||   // benchmarking
    inRange('224.0.0.0', 4) ||     // multicast
    inRange('240.0.0.0', 4)        // reserved
  );
}

function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === '::1' || addr === '::') return true;
  // IPv4-mapped IPv6 (::ffff:1.2.3.4) — check the embedded v4.
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (addr.startsWith('fe80') || addr.startsWith('fc') || addr.startsWith('fd')) return true; // link-local + ULA
  return false;
}

function isPrivateAddress(ip: string): boolean {
  return ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal']);

export async function checkWebhookUrl(rawUrl: string): Promise<SsrfCheck> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs are allowed' };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, reason: 'Host is not allowed' };
  }

  // If the host is a literal IP, check it directly; otherwise resolve all records.
  const literalIp = host.replace(/^\[|\]$/g, '');
  const looksLikeIp = /^[0-9.]+$/.test(literalIp) || literalIp.includes(':');
  try {
    const addresses = looksLikeIp ? [literalIp] : (await dns.lookup(host, { all: true })).map((a) => a.address);
    if (addresses.length === 0) return { ok: false, reason: 'Host did not resolve' };
    for (const addr of addresses) {
      if (isPrivateAddress(addr)) {
        return { ok: false, reason: 'URL resolves to a private or reserved address' };
      }
    }
  } catch {
    return { ok: false, reason: 'Host could not be resolved' };
  }

  return { ok: true };
}
