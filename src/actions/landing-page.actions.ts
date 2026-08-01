'use server';

import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { UserRole, PageStatus, MediaType } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/utils';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal: ensure admin has a workspace in the database
// ---------------------------------------------------------------------------

async function ensureWorkspace(userId: string, email?: string | null, sessionWorkspaceId?: string | null): Promise<string> {
  // 1. Try session workspace first
  if (sessionWorkspaceId) {
    const ws = await db.workspace.findUnique({ where: { id: sessionWorkspaceId } });
    if (ws) return ws.id;
  }

  // 2. Try find by userId
  const ws = await db.workspace.findUnique({ where: { userId } });
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
  });

  return newWs.id;
}

// ---------------------------------------------------------------------------
// Internal: 90-day archival policy (inactive pages only)
// ---------------------------------------------------------------------------

async function apply90DayArchivalPolicy(): Promise<void> {
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

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export async function getAdminDashboardStatsAction() {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const pages = await getLandingPagesAction();

    const activePages = pages.filter((p) => p.status === PageStatus.ACTIVE).length;
    const inactivePages = pages.filter((p) => p.status === PageStatus.INACTIVE).length;
    const totalViews = pages.reduce((acc, p) => acc + (p.viewsCount || 0), 0);
    const totalClicks = pages.reduce((acc, p) => acc + (p.clicksCount || 0), 0);

    return {
      totalPages: pages.length,
      activePages,
      inactivePages,
      totalViews,
      totalClicks,
      subscription: {
        planName: 'Unlimited SaaS License',
        price: 500.0,
        currency: 'USD',
        billingType: 'One Time',
        status: 'ACTIVE',
      },
      primaryDomain: 'go.wagateway.com',
    };
  } catch {
    return {
      totalPages: 0,
      activePages: 0,
      inactivePages: 0,
      totalViews: 0,
      totalClicks: 0,
      subscription: { planName: 'Unlimited SaaS License', price: 500.0, currency: 'USD', billingType: 'One Time', status: 'ACTIVE' },
      primaryDomain: 'go.wagateway.com',
    };
  }
}

// ---------------------------------------------------------------------------
// List (Admin sees own workspace; Super Admin sees all)
// ---------------------------------------------------------------------------

export async function getLandingPagesAction() {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    await apply90DayArchivalPolicy();

    if (session.role === UserRole.SUPER_ADMIN) {
      return db.landingPage.findMany({
        where: { status: { not: PageStatus.ARCHIVED } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const email = session.email?.toLowerCase().trim();
    const workspaceId = session.workspaceId;

    const orConditions: any[] = [];
    if (workspaceId) orConditions.push({ workspaceId });
    if (email) orConditions.push({ userEmail: email });

    return db.landingPage.findMany({
      where: {
        status: { not: PageStatus.ARCHIVED },
        OR: orConditions.length > 0 ? orConditions : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error: any) {
    console.error('getLandingPagesAction error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Get Single Page by ID
// ---------------------------------------------------------------------------

export async function getLandingPageByIdAction(id: string) {
  try {
    const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    const page = await db.landingPage.findUnique({ where: { id } });

    if (!page) return null;

    if (
      session.role !== UserRole.SUPER_ADMIN &&
      session.workspaceId &&
      page.workspaceId !== session.workspaceId &&
      page.userEmail !== session.email
    ) {
      throw new Error('FORBIDDEN');
    }

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
    const workspaceId = await ensureWorkspace(session.id, userEmail, session.workspaceId);

    const formattedSlug = slugify(data.slug || data.name);
    if (!formattedSlug) {
      return { success: false, error: 'Page name is required to generate a URL slug.' };
    }

    const existingSlug = await db.landingPage.findUnique({ where: { slug: formattedSlug } });
    if (existingSlug) {
      return { success: false, error: `Slug "${formattedSlug}" is already taken. Please choose another name.` };
    }

    const newPage = await db.landingPage.create({
      data: {
        workspaceId,
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
    });

    revalidatePath('/dashboard/landing-pages');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${formattedSlug}`);

    return { success: true, page: newPage };
  } catch (error: any) {
    console.error('createLandingPageAction error:', error);
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

    if (
      session.role !== UserRole.SUPER_ADMIN &&
      session.workspaceId &&
      existing.workspaceId !== session.workspaceId &&
      existing.userEmail !== session.email
    ) {
      return { success: false, error: 'Unauthorized access to this landing page' };
    }

    const formattedSlug = slugify(data.slug || data.name);

    if (formattedSlug !== existing.slug) {
      const slugCheck = await db.landingPage.findUnique({ where: { slug: formattedSlug } });
      if (slugCheck) {
        return { success: false, error: `Slug "${formattedSlug}" is already taken.` };
      }
    }

    const updatedPage = await db.landingPage.update({
      where: { id },
      data: {
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
    });

    revalidatePath('/dashboard/landing-pages');
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/landing-pages/${id}/edit`);
    revalidatePath(`/p/${formattedSlug}`);
    if (existing.slug !== formattedSlug) {
      revalidatePath(`/p/${existing.slug}`);
    }

    return { success: true, page: updatedPage };
  } catch (error: any) {
    console.error('updateLandingPageAction error:', error);
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

    if (
      session.role !== UserRole.SUPER_ADMIN &&
      session.workspaceId &&
      page.workspaceId !== session.workspaceId &&
      page.userEmail !== session.email
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.landingPage.delete({ where: { id } });

    revalidatePath('/dashboard/landing-pages');
    revalidatePath('/dashboard');
    revalidatePath(`/p/${page.slug}`);

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

    if (
      session.role !== UserRole.SUPER_ADMIN &&
      session.workspaceId &&
      original.workspaceId !== session.workspaceId &&
      original.userEmail !== session.email
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    const newSlug = slugify(`${original.slug}-copy-${Math.floor(Math.random() * 9000) + 1000}`);

    const copyPage = await db.landingPage.create({
      data: {
        workspaceId: original.workspaceId,
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

    if (
      session.role !== UserRole.SUPER_ADMIN &&
      session.workspaceId &&
      existing.workspaceId !== session.workspaceId &&
      existing.userEmail !== session.email
    ) {
      return { success: false, error: 'Unauthorized' };
    }

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
// Public: Track Views & Clicks
// ---------------------------------------------------------------------------

export async function trackPageViewAction(slug: string) {
  try {
    if (!slug) return;
    await db.landingPage.updateMany({
      where: { slug: slug.toLowerCase().trim() },
      data: { viewsCount: { increment: 1 } },
    });
  } catch {
    // Non-blocking — never fail a public page load due to analytics
  }
}

export async function trackWhatsAppClickAction(slug: string) {
  try {
    if (!slug) return;
    await db.landingPage.updateMany({
      where: { slug: slug.toLowerCase().trim() },
      data: { clicksCount: { increment: 1 } },
    });
  } catch {
    // Non-blocking
  }
}

// ---------------------------------------------------------------------------
// Public: Get Page by Slug (for /p/[slug] route)
// ---------------------------------------------------------------------------

export async function getPublicLandingPageBySlug(slug: string) {
  try {
    if (!slug) return null;

    return db.landingPage.findFirst({
      where: {
        slug: slug.toLowerCase().trim(),
        status: PageStatus.ACTIVE,
      },
    });
  } catch {
    return null;
  }
}
