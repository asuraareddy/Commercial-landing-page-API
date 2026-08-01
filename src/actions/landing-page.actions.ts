'use server';

import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { UserRole, PageStatus, MediaType } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/utils';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Non-blocking outside HTTP request scope
  }
}

/**
 * Lifecycle policy: Automatically archive inactive landing pages that have not
 * been updated for at least 90 consecutive days.
 * Active pages remain active indefinitely.
 */
async function apply90DayArchivalPolicy() {
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
    console.error('Error applying 90-day archival policy:', error);
  }
}

/**
 * Ensure user has a valid workspace record in DB.
 */
async function ensureWorkspaceId(userId: string, email?: string, userWorkspaceId?: string): Promise<string> {
  if (userWorkspaceId) {
    const existingWs = await db.workspace.findUnique({ where: { id: userWorkspaceId } });
    if (existingWs) return existingWs.id;
  }

  const userWs = await db.workspace.findUnique({ where: { userId } });
  if (userWs) return userWs.id;

  // Create workspace for user if missing
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

export async function getAdminDashboardStatsAction() {
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
}

export async function getLandingPagesAction() {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  await apply90DayArchivalPolicy();

  const email = session.email?.toLowerCase().trim();
  let pages: any[] = [];

  if (session.role === UserRole.SUPER_ADMIN) {
    pages = await db.landingPage.findMany({
      where: {
        status: { not: PageStatus.ARCHIVED },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    pages = await db.landingPage.findMany({
      where: {
        status: { not: PageStatus.ARCHIVED },
        OR: [
          session.workspaceId ? { workspaceId: session.workspaceId } : {},
          email ? { userEmail: email } : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return pages;
}

export async function getLandingPageByIdAction(id: string) {
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
}

export async function createLandingPageAction(data: any) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const userEmail = session.email?.toLowerCase().trim();
  const workspaceId = await ensureWorkspaceId(session.id, userEmail, session.workspaceId);

  const formattedSlug = slugify(data.slug || data.name);

  const existingSlug = await db.landingPage.findUnique({
    where: { slug: formattedSlug },
  });

  if (existingSlug) {
    return { success: false, error: `Slug "${formattedSlug}" is already taken. Please choose another.` };
  }

  const newLandingPage = await db.landingPage.create({
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

  safeRevalidatePath('/dashboard/landing-pages');
  safeRevalidatePath('/dashboard');
  safeRevalidatePath('/super-admin/landing-pages');
  safeRevalidatePath('/super-admin');
  safeRevalidatePath(`/p/${formattedSlug}`);
  safeRevalidatePath(`/${formattedSlug}`);

  return { success: true, page: newLandingPage };
}

export async function updateLandingPageAction(id: string, data: any) {
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
      userEmail: existing.userEmail || session.email?.toLowerCase().trim(),
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

  safeRevalidatePath('/dashboard/landing-pages');
  safeRevalidatePath('/dashboard');
  safeRevalidatePath('/super-admin/landing-pages');
  safeRevalidatePath('/super-admin');
  safeRevalidatePath(`/dashboard/landing-pages/${id}/edit`);
  safeRevalidatePath(`/p/${formattedSlug}`);
  safeRevalidatePath(`/${formattedSlug}`);
  if (existing.slug !== formattedSlug) {
    safeRevalidatePath(`/p/${existing.slug}`);
    safeRevalidatePath(`/${existing.slug}`);
  }

  return { success: true, page: updatedPage };
}

export async function deleteLandingPageAction(id: string) {
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

  safeRevalidatePath('/dashboard/landing-pages');
  safeRevalidatePath('/dashboard');
  safeRevalidatePath('/super-admin/landing-pages');
  safeRevalidatePath('/super-admin');
  safeRevalidatePath(`/p/${page.slug}`);
  safeRevalidatePath(`/${page.slug}`);
  return { success: true };
}

export async function duplicateLandingPageAction(id: string) {
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

  const newSlug = slugify(`${original.slug}-copy-${Math.floor(Math.random() * 1000)}`);
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

  safeRevalidatePath('/dashboard/landing-pages');
  safeRevalidatePath('/dashboard');
  safeRevalidatePath('/super-admin/landing-pages');
  safeRevalidatePath('/super-admin');
  return { success: true, page: copyPage };
}

export async function toggleLandingPageStatusAction(id: string) {
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

  const updated = await db.landingPage.update({
    where: { id },
    data: {
      status: newStatus,
      updatedAt: new Date(),
      archivedAt: null,
    },
  });

  safeRevalidatePath('/dashboard/landing-pages');
  safeRevalidatePath('/dashboard');
  safeRevalidatePath('/super-admin/landing-pages');
  safeRevalidatePath('/super-admin');
  return { success: true, status: updated.status };
}

export async function trackPageViewAction(slug: string) {
  try {
    const cleanSlug = slug ? slug.toLowerCase().trim() : '';
    if (!cleanSlug) return;

    await db.landingPage.updateMany({
      where: { slug: cleanSlug },
      data: { viewsCount: { increment: 1 } },
    });
  } catch (error) {
    // Non-blocking
  }
}

export async function trackWhatsAppClickAction(slug: string) {
  try {
    const cleanSlug = slug ? slug.toLowerCase().trim() : '';
    if (!cleanSlug) return;

    await db.landingPage.updateMany({
      where: { slug: cleanSlug },
      data: { clicksCount: { increment: 1 } },
    });
  } catch (error) {
    // Non-blocking
  }
}

export async function getPublicLandingPageBySlug(slug: string) {
  const cleanSlug = slug ? slug.toLowerCase().trim() : '';
  if (!cleanSlug) return null;

  const page = await db.landingPage.findFirst({
    where: {
      slug: cleanSlug,
      status: PageStatus.ACTIVE,
    },
  });

  return page;
}
