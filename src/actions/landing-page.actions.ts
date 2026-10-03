'use server';

import { db } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/auth';
import { UserRole, PageStatus, MediaType, DomainStatus } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/utils';
import { getAppHost } from '@/lib/domains';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ARCHIVAL_THROTTLE_MS = 6 * 60 * 60 * 1000; // run the archival sweep at most every 6h per instance
const USABLE_DOMAIN_STATUSES = [DomainStatus.ACTIVE, DomainStatus.VERIFIED] as string[];

const domainSelect = { select: { id: true, domainName: true } } as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function ensureWorkspace(userId: string, email?: string | null, sessionWorkspaceId?: string | null): Promise<string> {
  // 1. Try session workspace first
  if (sessionWorkspaceId) {
    const ws = await db.workspace.findUnique({ where: { id: sessionWorkspaceId }, select: { id: true } });
    if (ws) return ws.id;
  }

  // 2. Try find by userId
  const ws = await db.workspace.findUnique({ where: { userId }, select: { id: true } });
  if (ws) return ws.id;

  // 3. Create a new workspace for this user
  const newWs = await db.workspace.create({
    data: {
      userId,
      name: 'My Workspace',
      supportEmail: email || null,
      subscription: {
        create: {
          planName: 'Unlimited SaaS License',
          price: 500.0,
          currency: 'USD',
          billingType: 'One Time',
          status: 'ACTIVE',
        },
      },
    },
    select: { id: true },
  });

  return newWs.id;
}

/** Super admin can access everything; admins only pages in their workspace or created by their email. */
function canAccessPage(session: SessionUser, page: { workspaceId: string; userEmail: string | null }) {
  if (session.role === UserRole.SUPER_ADMIN) return true;
  if (session.workspaceId && page.workspaceId === session.workspaceId) return true;
  const email = session.email?.toLowerCase().trim();
  return !!email && !!page.userEmail && page.userEmail.toLowerCase() === email;
}

/**
 * Validate the domain a page should be published under.
 * Returns the domain row, or an error string.
 */
async function resolveTargetDomain(
  session: SessionUser,
  domainId: string | null | undefined
): Promise<{ domain: { id: string; domainName: string; workspaceId: string } } | { error: string }> {
  if (!domainId) {
    return { error: 'Please select a domain for this landing page.' };
  }

  const domain = await db.domain.findUnique({
    where: { id: domainId },
    select: { id: true, domainName: true, workspaceId: true, status: true },
  });

  if (!domain) return { error: 'Selected domain no longer exists. Please choose another domain.' };
  if (!USABLE_DOMAIN_STATUSES.includes(domain.status)) {
    return { error: `Domain "${domain.domainName}" is disabled. Ask your Super Admin to enable it.` };
  }

  if (session.role !== UserRole.SUPER_ADMIN) {
    const ownWorkspaceId = await ensureWorkspace(session.id, session.email, session.workspaceId);
    if (domain.workspaceId !== ownWorkspaceId) {
      return { error: 'You are not allowed to publish on this domain.' };
    }
  }

  return { domain: { id: domain.id, domainName: domain.domainName, workspaceId: domain.workspaceId } };
}

async function isSlugTaken(domainId: string | null, slug: string, excludeId?: string) {
  const found = await db.landingPage.findFirst({
    where: { domainId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return !!found;
}

let lastArchivalRun = 0;

async function apply90DayArchivalPolicy(): Promise<void> {
  if (Date.now() - lastArchivalRun < ARCHIVAL_THROTTLE_MS) return;
  lastArchivalRun = Date.now();
  try {
    const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);
    await db.landingPage.updateMany({
      where: {
        status: PageStatus.INACTIVE,
        updatedAt: { lt: ninetyDaysAgo },
      },
      data: {
        status: PageStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('apply90DayArchivalPolicy error:', error);
  }
}

async function listPagesForSession(session: SessionUser) {
  // Fire-and-forget: never block the dashboard on the archival sweep
  void apply90DayArchivalPolicy();

  if (session.role === UserRole.SUPER_ADMIN) {
    return db.landingPage.findMany({
      where: { status: { not: PageStatus.ARCHIVED } },
      include: { domain: domainSelect },
      orderBy: { createdAt: 'desc' },
    });
  }

  const email = session.email?.toLowerCase().trim();
  const workspaceId = session.workspaceId;

  const orConditions: any[] = [];
  if (workspaceId) orConditions.push({ workspaceId });
  if (email) orConditions.push({ userEmail: email });
  if (orConditions.length === 0) return [];

  return db.landingPage.findMany({
    where: {
      status: { not: PageStatus.ARCHIVED },
      OR: orConditions,
    },
    include: { domain: domainSelect },
    orderBy: { createdAt: 'desc' },
  });
}

async function getPrimaryDomainName(session: SessionUser): Promise<string> {
  try {
    if (session.workspaceId) {
      const primary = await db.domain.findFirst({
        where: { workspaceId: session.workspaceId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        select: { domainName: true },
      });
      if (primary) return primary.domainName;
    }
  } catch {
    // fall through
  }
  return getAppHost() || 'Not configured';
}

function buildStats(pages: { status: string; viewsCount: number | null; clicksCount: number | null }[], primaryDomain: string) {
  return {
    totalPages: pages.length,
    activePages: pages.filter((p) => p.status === PageStatus.ACTIVE).length,
    inactivePages: pages.filter((p) => p.status === PageStatus.INACTIVE).length,
    totalViews: pages.reduce((acc, p) => acc + (p.viewsCount || 0), 0),
    totalClicks: pages.reduce((acc, p) => acc + (p.clicksCount || 0), 0),
    subscription: {
      planName: 'Unlimited SaaS License',
      price: 500.0,
      currency: 'USD',
      billingType: 'One Time',
      status: 'ACTIVE',
    },
    primaryDomain,
  };
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

/** Stats + page list in one round trip (used by /dashboard to avoid querying pages twice). */
export async function getAdminDashboardDataAction() {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const [pages, primaryDomain] = await Promise.all([listPagesForSession(session), getPrimaryDomainName(session)]);
    return { stats: buildStats(pages, primaryDomain), pages };
  } catch (error) {
    console.error('getAdminDashboardDataAction error:', error);
    return { stats: buildStats([], getAppHost() || 'Not configured'), pages: [] };
  }
}

export async function getAdminDashboardStatsAction() {
  const { stats } = await getAdminDashboardDataAction();
  return stats;
}

// ---------------------------------------------------------------------------
// List (Admin sees own workspace; Super Admin sees all)
// ---------------------------------------------------------------------------

export async function getLandingPagesAction() {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    return await listPagesForSession(session);
  } catch (error: any) {
    console.error('getLandingPagesAction error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Domains available in the landing-page form
// ---------------------------------------------------------------------------

export async function getAssignableDomainsAction() {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

    if (session.role === UserRole.SUPER_ADMIN) {
      return db.domain.findMany({
        where: { status: { in: USABLE_DOMAIN_STATUSES } },
        select: { id: true, domainName: true, isPrimary: true, workspace: { select: { id: true, name: true } } },
        orderBy: { domainName: 'asc' },
      });
    }

    const workspaceId = await ensureWorkspace(session.id, session.email, session.workspaceId);
    return db.domain.findMany({
      where: { workspaceId, status: { in: USABLE_DOMAIN_STATUSES } },
      select: { id: true, domainName: true, isPrimary: true, workspace: { select: { id: true, name: true } } },
      orderBy: [{ isPrimary: 'desc' }, { domainName: 'asc' }],
    });
  } catch (error) {
    console.error('getAssignableDomainsAction error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Get Single Page by ID
// ---------------------------------------------------------------------------

export async function getLandingPageByIdAction(id: string) {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const page = await db.landingPage.findUnique({ where: { id }, include: { domain: domainSelect } });

    if (!page) return null;
    if (!canAccessPage(session, page)) return null;

    return page;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createLandingPageAction(data: any) {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const userEmail = session.email?.toLowerCase().trim();

    const target = await resolveTargetDomain(session, data?.domainId);
    if ('error' in target) return { success: false, error: target.error };
    const { domain } = target;

    // The page belongs to the workspace that owns the domain
    const workspaceId =
      session.role === UserRole.SUPER_ADMIN
        ? domain.workspaceId
        : await ensureWorkspace(session.id, userEmail, session.workspaceId);

    const formattedSlug = slugify(data.slug || data.name || '');
    if (!formattedSlug) {
      return { success: false, error: 'Page name is required to generate a URL slug.' };
    }

    if (await isSlugTaken(domain.id, formattedSlug)) {
      return { success: false, error: `Slug "${formattedSlug}" is already used on ${domain.domainName}. Please choose another.` };
    }

    const newPage = await db.landingPage.create({
      data: {
        workspaceId,
        domainId: domain.id,
        userEmail,
        name: data.name,
        slug: formattedSlug,
        companyName: data.companyName || 'Company Name',
        logoUrl: data.logoUrl || null,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType || MediaType.IMAGE,
        mediaWidth: data.mediaWidth || '100%',
        mediaHeight: data.mediaHeight || '260px',
        borderRadius: data.borderRadius || '16px',
        shadow: data.shadow || 'lg',
        objectFit: data.objectFit || 'cover',
        mediaPosition: data.mediaPosition || 'center',
        whatsappNumber: data.whatsappNumber || '',
        prefilledMessage: data.prefilledMessage || null,
        buttonText: data.buttonText || 'Continue to WhatsApp',
        metaPixelId: data.metaPixelId || null,
        status: data.status || PageStatus.ACTIVE,
        viewsCount: 0,
        clicksCount: 0,
      },
      include: { domain: domainSelect },
    });

    revalidatePath('/dashboard/landing-pages');
    revalidatePath('/dashboard');

    return { success: true, page: newPage };
  } catch (error: any) {
    console.error('createLandingPageAction error:', error);
    if (error?.code === 'P2002') {
      return { success: false, error: 'This slug is already used on the selected domain.' };
    }
    return { success: false, error: error.message || 'Failed to create landing page. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateLandingPageAction(id: string, data: any) {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const existing = await db.landingPage.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: 'Landing page not found' };
    }

    if (!canAccessPage(session, existing)) {
      return { success: false, error: 'Unauthorized access to this landing page' };
    }

    // Domain: legacy pages (domainId = null) may stay unassigned; assigned pages must keep a valid domain.
    let targetDomainId: string | null = existing.domainId;
    let targetWorkspaceId = existing.workspaceId;
    let domainLabel = 'the default app domain';
    const requestedDomainId: string | null = data?.domainId || null;

    if (requestedDomainId) {
      if (requestedDomainId !== existing.domainId) {
        const target = await resolveTargetDomain(session, requestedDomainId);
        if ('error' in target) return { success: false, error: target.error };
        targetDomainId = target.domain.id;
        if (session.role === UserRole.SUPER_ADMIN) targetWorkspaceId = target.domain.workspaceId;
        domainLabel = target.domain.domainName;
      } else {
        domainLabel = 'this domain';
      }
    } else if (existing.domainId) {
      return { success: false, error: 'Please select a domain for this landing page.' };
    }

    const formattedSlug = slugify(data.slug || data.name || '');
    if (!formattedSlug) {
      return { success: false, error: 'URL slug is required.' };
    }

    if (
      (formattedSlug !== existing.slug || targetDomainId !== existing.domainId) &&
      (await isSlugTaken(targetDomainId, formattedSlug, id))
    ) {
      return { success: false, error: `Slug "${formattedSlug}" is already used on ${domainLabel}.` };
    }

    const updatedPage = await db.landingPage.update({
      where: { id },
      data: {
        domainId: targetDomainId,
        workspaceId: targetWorkspaceId,
        name: data.name,
        slug: formattedSlug,
        companyName: data.companyName,
        logoUrl: data.logoUrl || null,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType || MediaType.IMAGE,
        mediaWidth: data.mediaWidth || '100%',
        mediaHeight: data.mediaHeight || '260px',
        borderRadius: data.borderRadius || '16px',
        shadow: data.shadow || 'lg',
        objectFit: data.objectFit || 'cover',
        mediaPosition: data.mediaPosition || 'center',
        whatsappNumber: data.whatsappNumber,
        prefilledMessage: data.prefilledMessage || null,
        buttonText: data.buttonText,
        metaPixelId: data.metaPixelId || null,
        status: data.status || PageStatus.ACTIVE,
        updatedAt: new Date(),
      },
      include: { domain: domainSelect },
    });

    revalidatePath('/dashboard/landing-pages');
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/landing-pages/${id}/edit`);

    return { success: true, page: updatedPage };
  } catch (error: any) {
    console.error('updateLandingPageAction error:', error);
    if (error?.code === 'P2002') {
      return { success: false, error: 'This slug is already used on the selected domain.' };
    }
    return { success: false, error: error.message || 'Failed to update landing page.' };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteLandingPageAction(id: string) {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const page = await db.landingPage.findUnique({ where: { id } });

    if (!page) return { success: false, error: 'Landing page not found' };
    if (!canAccessPage(session, page)) return { success: false, error: 'Unauthorized' };

    await db.landingPage.delete({ where: { id } });

    revalidatePath('/dashboard/landing-pages');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete landing page.' };
  }
}

// ---------------------------------------------------------------------------
// Duplicate
// ---------------------------------------------------------------------------

export async function duplicateLandingPageAction(id: string) {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const original = await db.landingPage.findUnique({ where: { id } });

    if (!original) return { success: false, error: 'Original landing page not found' };
    if (!canAccessPage(session, original)) return { success: false, error: 'Unauthorized' };

    // Find a free slug on the same domain
    let newSlug = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = slugify(`${original.slug}-copy-${Math.floor(Math.random() * 9000) + 1000}`);
      if (!(await isSlugTaken(original.domainId, candidate))) {
        newSlug = candidate;
        break;
      }
    }
    if (!newSlug) return { success: false, error: 'Could not generate a unique slug. Please try again.' };

    const copyPage = await db.landingPage.create({
      data: {
        workspaceId: original.workspaceId,
        domainId: original.domainId,
        userEmail: session.email?.toLowerCase().trim() || original.userEmail,
        name: `${original.name} (Copy)`,
        slug: newSlug,
        companyName: original.companyName,
        logoUrl: original.logoUrl,
        mediaUrl: original.mediaUrl,
        mediaType: original.mediaType,
        mediaWidth: original.mediaWidth,
        mediaHeight: original.mediaHeight,
        borderRadius: original.borderRadius,
        shadow: original.shadow,
        objectFit: original.objectFit,
        mediaPosition: original.mediaPosition,
        whatsappNumber: original.whatsappNumber,
        prefilledMessage: original.prefilledMessage,
        buttonText: original.buttonText,
        metaPixelId: original.metaPixelId,
        status: PageStatus.INACTIVE,
        viewsCount: 0,
        clicksCount: 0,
      },
      include: { domain: domainSelect },
    });

    revalidatePath('/dashboard/landing-pages');
    revalidatePath('/dashboard');

    return { success: true, page: copyPage };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to duplicate page.' };
  }
}

// ---------------------------------------------------------------------------
// Toggle Status
// ---------------------------------------------------------------------------

export async function toggleLandingPageStatusAction(id: string) {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const existing = await db.landingPage.findUnique({ where: { id } });

    if (!existing) return { success: false, error: 'Landing page not found' };
    if (!canAccessPage(session, existing)) return { success: false, error: 'Unauthorized' };

    const newStatus = existing.status === PageStatus.ACTIVE ? PageStatus.INACTIVE : PageStatus.ACTIVE;

    await db.landingPage.update({
      where: { id },
      data: { status: newStatus, updatedAt: new Date(), archivedAt: null },
    });

    revalidatePath('/dashboard/landing-pages');
    revalidatePath('/dashboard');

    return { success: true, status: newStatus };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to toggle status.' };
  }
}

// ---------------------------------------------------------------------------
// Public: Track Views & Clicks (by page id: slugs are only unique per domain)
// ---------------------------------------------------------------------------

export async function trackPageViewAction(pageId: string) {
  try {
    if (!pageId || typeof pageId !== 'string') return;
    await db.landingPage.updateMany({
      where: { id: pageId, status: PageStatus.ACTIVE },
      data: { viewsCount: { increment: 1 } },
    });
  } catch {
    // Non-blocking — never fail a public page load due to analytics
  }
}

export async function trackWhatsAppClickAction(pageId: string) {
  try {
    if (!pageId || typeof pageId !== 'string') return;
    await db.landingPage.updateMany({
      where: { id: pageId, status: PageStatus.ACTIVE },
      data: { clicksCount: { increment: 1 } },
    });
  } catch {
    // Non-blocking
  }
}
