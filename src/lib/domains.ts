import { db } from './db';
import { DomainStatus } from './types';

// Domain validation and host resolution. All domain logic is driven by the
// Domain table and NEXT_PUBLIC_APP_URL; no hostnames are hardcoded.

const DOMAIN_REGEX = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Normalize user input like "https://Go.Client.com/path:443" to "go.client.com".
 * Returns null if the result is not a valid hostname.
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.toString().trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, ''); // protocol
  d = d.split('/')[0].split('?')[0].split('#')[0]; // path / query
  d = d.split(':')[0]; // port
  d = d.replace(/\.$/, ''); // trailing dot
  return DOMAIN_REGEX.test(d) ? d : null;
}

/** Clean a raw Host header: lowercase, strip port and trailing dot. */
export function cleanHost(host: string | null | undefined): string {
  return (host || '').toLowerCase().split(',')[0].trim().split(':')[0].replace(/\.$/, '');
}

/** "www.a.com" -> ["www.a.com", "a.com"], "a.com" -> ["a.com", "www.a.com"] */
function hostVariants(host: string): string[] {
  if (!host) return [];
  return host.startsWith('www.') ? [host, host.slice(4)] : [host, `www.${host}`];
}

/** Host of the main app (from NEXT_PUBLIC_APP_URL), without www/port. */
export function getAppHost(): string {
  try {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    if (!url) return '';
    return cleanHost(new URL(url).host).replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isAppHost(host: string): boolean {
  const h = cleanHost(host).replace(/^www\./, '');
  if (!h) return true;
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.vercel.app')) return true;
  const app = getAppHost();
  return !!app && h === app;
}

// ---------------------------------------------------------------------------
// Host -> Domain resolution with a short in-memory TTL cache (per serverless
// instance). Keeps public landing pages fast without a lookup on every hit.
// ---------------------------------------------------------------------------

type CachedDomain = { id: string; domainName: string; workspaceId: string } | null;
const DOMAIN_CACHE_TTL_MS = 30_000;
const domainCache = new Map<string, { value: CachedDomain; expires: number }>();

export function invalidateDomainCache() {
  domainCache.clear();
}

export async function resolveDomainByHost(rawHost: string | null | undefined): Promise<CachedDomain> {
  const host = cleanHost(rawHost);
  if (!host) return null;

  const cached = domainCache.get(host);
  if (cached && cached.expires > Date.now()) return cached.value;

  let value: CachedDomain = null;
  try {
    const found = await db.domain.findFirst({
      where: {
        domainName: { in: hostVariants(host) },
        status: { in: [DomainStatus.ACTIVE, DomainStatus.VERIFIED] },
      },
      select: { id: true, domainName: true, workspaceId: true },
    });
    value = found ?? null;
  } catch (error) {
    console.error('resolveDomainByHost error:', error);
    return null; // don't cache failures
  }

  domainCache.set(host, { value, expires: Date.now() + DOMAIN_CACHE_TTL_MS });
  return value;
}
