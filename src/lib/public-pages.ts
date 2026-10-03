import { cache } from 'react';
import { headers } from 'next/headers';
import { db } from './db';
import { PageStatus } from './types';
import { cleanHost, isAppHost, resolveDomainByHost } from './domains';

const RESERVED_SLUGS = new Set(['login', 'signup', 'dashboard', 'super-admin', 'forgot-password', 'api', 'p', '_next']);

const publicPageSelect = {
  id: true,
  slug: true,
  name: true,
  companyName: true,
  logoUrl: true,
  mediaUrl: true,
  mediaType: true,
  mediaWidth: true,
  mediaHeight: true,
  borderRadius: true,
  shadow: true,
  objectFit: true,
  mediaPosition: true,
  whatsappNumber: true,
  prefilledMessage: true,
  buttonText: true,
  metaPixelId: true,
  status: true,
  workspace: { select: { defaultPixelId: true } },
} as const;

export async function getRequestHost(): Promise<string> {
  const h = await headers();
  return cleanHost(h.get('x-forwarded-host') || h.get('host'));
}

/**
 * Resolve the public landing page for (host, slug).
 *
 * - Host is a registered domain: only that domain's pages are served, so each
 *   domain's pages stay independent. If the registered domain is also the main
 *   app host, legacy pages are served there as a fallback.
 * - Host is not a registered domain (main app host, localhost, *.vercel.app):
 *   legacy pages (domainId = null) are served exactly as before.
 *
 * Wrapped in React cache() so generateMetadata + the page share one query per request.
 */
export const getPublicLandingPage = cache(async (rawSlug: string, rawHost?: string) => {
  try {
    const slug = (rawSlug || '').toLowerCase().trim();
    if (!slug || RESERVED_SLUGS.has(slug)) return null;

    const host = rawHost ?? (await getRequestHost());
    const domain = await resolveDomainByHost(host);

    if (domain) {
      const page = await db.landingPage.findFirst({
        where: { domainId: domain.id, slug, status: PageStatus.ACTIVE },
        select: publicPageSelect,
      });
      if (page || !isAppHost(host)) return page;
    }

    if (isAppHost(host)) {
      return db.landingPage.findFirst({
        where: { slug, status: PageStatus.ACTIVE },
        select: publicPageSelect,
      });
    }

    return db.landingPage.findFirst({
      where: { domainId: null, slug, status: PageStatus.ACTIVE },
      select: publicPageSelect,
    });
  } catch (error) {
    console.error('getPublicLandingPage error:', error);
    return null;
  }
});
