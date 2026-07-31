'use server';

import { db } from '@/lib/db';
import { requireAuth, getSession } from '@/lib/auth';
import { UserRole, PageStatus, MediaType } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/utils';
import {
  getDynamicStore,
  markPageDeleted,
  recordPageCreated,
  recordPageUpdated,
} from '@/lib/db-store';

export async function getAdminDashboardStatsAction() {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  
  let workspaceId = session.workspaceId;

  if (!workspaceId && session.role === UserRole.SUPER_ADMIN) {
    const firstWs = await db.workspace.findFirst();
    workspaceId = firstWs?.id;
  }

  if (!workspaceId) {
    return {
      totalPages: 0,
      activePages: 0,
      inactivePages: 0,
      totalViews: 0,
      totalClicks: 0,
      subscription: null,
      primaryDomain: 'No domain configured',
    };
  }

  const pages = await getLandingPagesAction();
  const activePages = pages.filter((p) => p.status === PageStatus.ACTIVE).length;
  const inactivePages = pages.filter((p) => p.status === PageStatus.INACTIVE).length;
  const totalViews = pages.reduce((acc, p) => acc + (p.viewsCount || 0), 0);
  const totalClicks = pages.reduce((acc, p) => acc + (p.clicksCount || 0), 0);

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      subscription: true,
      domains: { where: { isPrimary: true }, take: 1 },
    },
  });

  return {
    totalPages: pages.length,
    activePages,
    inactivePages,
    totalViews,
    totalClicks,
    subscription: workspace?.subscription || null,
    primaryDomain: workspace?.domains[0]?.domainName || 'No domain configured',
  };
}

export async function getLandingPagesAction() {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const workspaceId = session.workspaceId;

  if (!workspaceId && session.role !== UserRole.SUPER_ADMIN) {
    return [];
  }

  const whereClause = session.role === UserRole.SUPER_ADMIN && !session.workspaceId
    ? {}
    : { workspaceId: workspaceId! };

  let dbPages: any[] = [];
  try {
    dbPages = await db.landingPage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('Error fetching pages from DB:', err);
  }

  const store = getDynamicStore();

  // 1. Filter out deleted pages
  let combined = dbPages.filter((p) => !store.deletedPageIds.includes(p.id));

  // 2. Apply updated overrides
  combined = combined.map((p) => store.updatedLandingPages[p.id] || p);

  // 3. Add created pages that are not in DB list
  for (const createdPage of store.createdLandingPages) {
    if (!store.deletedPageIds.includes(createdPage.id)) {
      if (session.role === UserRole.SUPER_ADMIN || createdPage.workspaceId === workspaceId) {
        if (!combined.some((p) => p.id === createdPage.id)) {
          combined.unshift(createdPage);
        }
      }
    }
  }

  return combined;
}

export async function getLandingPageByIdAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const store = getDynamicStore();

  if (store.deletedPageIds.includes(id)) {
    return null;
  }

  if (store.updatedLandingPages[id]) {
    return store.updatedLandingPages[id];
  }

  const landingPage = await db.landingPage.findUnique({
    where: { id },
  });

  if (!landingPage) {
    return store.createdLandingPages.find((p) => p.id === id) || null;
  }

  if (session.role !== UserRole.SUPER_ADMIN && landingPage.workspaceId !== session.workspaceId) {
    throw new Error('FORBIDDEN');
  }

  return landingPage;
}

export async function createLandingPageAction(data: any) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  
  let workspaceId = session.workspaceId;

  if (!workspaceId && session.role === UserRole.SUPER_ADMIN) {
    const firstWs = await db.workspace.findFirst();
    if (!firstWs) return { success: false, error: 'No workspace exists' };
    workspaceId = firstWs.id;
  }

  if (!workspaceId) {
    return { success: false, error: 'Workspace not found' };
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  const formattedSlug = slugify(data.slug || data.name);

  // Check slug in DB and store
  const store = getDynamicStore();
  const existingSlug = await db.landingPage.findUnique({ where: { slug: formattedSlug } });
  const createdSlugMatch = store.createdLandingPages.some((p) => p.slug === formattedSlug);

  if ((existingSlug && !store.deletedPageIds.includes(existingSlug.id)) || createdSlugMatch) {
    return { success: false, error: `Slug "${formattedSlug}" is already taken. Please choose another.` };
  }

  let newLandingPage: any;
  try {
    newLandingPage = await db.landingPage.create({
      data: {
        workspaceId,
        name: data.name,
        slug: formattedSlug,
        companyName: data.companyName || workspace?.name || 'Company Name',
        logoUrl: data.logoUrl || workspace?.logoUrl || null,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType || MediaType.IMAGE,
        mediaWidth: data.mediaWidth || '100%',
        mediaHeight: data.mediaHeight || '260px',
        borderRadius: data.borderRadius || '16px',
        shadow: data.shadow || 'lg',
        objectFit: data.objectFit || 'cover',
        mediaPosition: data.mediaPosition || 'center',
        whatsappNumber: data.whatsappNumber || workspace?.defaultWhatsapp || '',
        prefilledMessage: data.prefilledMessage ?? workspace?.defaultMessage ?? null,
        buttonText: data.buttonText || 'Continue to WhatsApp',
        metaPixelId: data.metaPixelId ?? workspace?.defaultPixelId ?? null,
        status: data.status || PageStatus.ACTIVE,
      },
    });
  } catch (err: any) {
    // Construct in-memory object if DB write hits lock
    newLandingPage = {
      id: `lp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      name: data.name,
      slug: formattedSlug,
      companyName: data.companyName || workspace?.name || 'Company Name',
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
      viewsCount: 0,
      clicksCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  recordPageCreated(newLandingPage);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  return { success: true, page: newLandingPage };
}

export async function updateLandingPageAction(id: string, data: any) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const formattedSlug = slugify(data.slug || data.name);

  let updatedPage: any;

  try {
    const existing = await db.landingPage.findUnique({ where: { id } });
    if (existing && session.role !== UserRole.SUPER_ADMIN && existing.workspaceId !== session.workspaceId) {
      return { success: false, error: 'Unauthorized access to this landing page' };
    }

    updatedPage = await db.landingPage.update({
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
      },
    });
  } catch (err) {
    updatedPage = {
      id,
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
      updatedAt: new Date().toISOString(),
    };
  }

  recordPageUpdated(updatedPage);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  revalidatePath(`/dashboard/landing-pages/${id}/edit`);
  revalidatePath(`/p/${formattedSlug}`);

  return { success: true, page: updatedPage };
}

export async function deleteLandingPageAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  // Mark as deleted in persistent store immediately
  markPageDeleted(id);

  try {
    const existing = await db.landingPage.findUnique({ where: { id } });
    if (existing) {
      await db.landingPage.delete({ where: { id } });
      revalidatePath(`/p/${existing.slug}`);
    }
  } catch (err) {
    // Non-blocking if already removed from store
  }

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  return { success: true };
}

export async function duplicateLandingPageAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const original = await getLandingPageByIdAction(id);
  if (!original) return { success: false, error: 'Original landing page not found' };

  const newSlug = slugify(`${original.slug}-copy-${Math.floor(Math.random() * 1000)}`);
  const copyData = {
    ...original,
    id: `lp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: `${original.name} (Copy)`,
    slug: newSlug,
    status: PageStatus.INACTIVE,
    viewsCount: 0,
    clicksCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.landingPage.create({
      data: {
        workspaceId: original.workspaceId,
        name: copyData.name,
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
      },
    });
  } catch (e) {
    // Handled by dynamic store
  }

  recordPageCreated(copyData);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  return { success: true, page: copyData };
}

export async function toggleLandingPageStatusAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const existing = await getLandingPageByIdAction(id);
  if (!existing) return { success: false, error: 'Landing page not found' };

  const newStatus = existing.status === PageStatus.ACTIVE ? PageStatus.INACTIVE : PageStatus.ACTIVE;
  const updatedPage = { ...existing, status: newStatus };

  try {
    await db.landingPage.update({
      where: { id },
      data: { status: newStatus },
    });
  } catch (e) {
    // Handled by dynamic store
  }

  recordPageUpdated(updatedPage);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  return { success: true, status: newStatus };
}

export async function trackPageViewAction(slug: string) {
  try {
    await db.landingPage.update({
      where: { slug },
      data: { viewsCount: { increment: 1 } },
    });
  } catch (error) {
    // Non-blocking
  }
}

export async function trackWhatsAppClickAction(slug: string) {
  try {
    await db.landingPage.update({
      where: { slug },
      data: { clicksCount: { increment: 1 } },
    });
  } catch (error) {
    // Non-blocking
  }
}

export async function getPublicLandingPageBySlug(slug: string) {
  const store = getDynamicStore();

  // 1. Check if slug matches a created page
  const createdMatch = store.createdLandingPages.find((p) => p.slug === slug);
  if (createdMatch) {
    if (store.deletedPageIds.includes(createdMatch.id) || createdMatch.status !== PageStatus.ACTIVE) {
      return null;
    }
    return createdMatch;
  }

  // 2. Query DB
  const page = await db.landingPage.findUnique({
    where: { slug },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          defaultPixelId: true,
          primaryColor: true,
          buttonColor: true,
        },
      },
    },
  });

  if (!page || store.deletedPageIds.includes(page.id) || page.status !== PageStatus.ACTIVE) {
    return null;
  }

  // Apply updated override if present
  if (store.updatedLandingPages[page.id]) {
    return {
      ...page,
      ...store.updatedLandingPages[page.id],
    };
  }

  return page;
}
