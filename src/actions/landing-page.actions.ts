'use server';

import { db } from '@/lib/db';
import { requireAuth, getSession } from '@/lib/auth';
import { UserRole, PageStatus, MediaType } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/utils';

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
      primaryDomain: null,
    };
  }

  const [totalPages, activePages, inactivePages, pagesStats, workspace] = await Promise.all([
    db.landingPage.count({ where: { workspaceId } }),
    db.landingPage.count({ where: { workspaceId, status: PageStatus.ACTIVE } }),
    db.landingPage.count({ where: { workspaceId, status: PageStatus.INACTIVE } }),
    db.landingPage.aggregate({
      where: { workspaceId },
      _sum: { viewsCount: true, clicksCount: true },
    }),
    db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        subscription: true,
        domains: { where: { isPrimary: true }, take: 1 },
      },
    }),
  ]);

  return {
    totalPages,
    activePages,
    inactivePages,
    totalViews: pagesStats._sum.viewsCount || 0,
    totalClicks: pagesStats._sum.clicksCount || 0,
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

  return db.landingPage.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getLandingPageByIdAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const landingPage = await db.landingPage.findUnique({
    where: { id },
  });

  if (!landingPage) return null;

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

  const existingSlug = await db.landingPage.findUnique({
    where: { slug: formattedSlug },
  });

  if (existingSlug) {
    return { success: false, error: `Slug "${formattedSlug}" is already taken. Please choose another.` };
  }

  const newLandingPage = await db.landingPage.create({
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

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  return { success: true, page: newLandingPage };
}

export async function updateLandingPageAction(id: string, data: any) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const existing = await db.landingPage.findUnique({ where: { id } });
  if (!existing) return { success: false, error: 'Landing page not found' };

  if (session.role !== UserRole.SUPER_ADMIN && existing.workspaceId !== session.workspaceId) {
    return { success: false, error: 'Unauthorized access to this landing page' };
  }

  const formattedSlug = slugify(data.slug);

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
    },
  });

  revalidatePath('/dashboard/landing-pages');
  revalidatePath(`/dashboard/landing-pages/${id}/edit`);
  revalidatePath(`/p/${formattedSlug}`);
  return { success: true, page: updatedPage };
}

export async function deleteLandingPageAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const existing = await db.landingPage.findUnique({ where: { id } });
  if (!existing) return { success: false, error: 'Landing page not found' };

  if (session.role !== UserRole.SUPER_ADMIN && existing.workspaceId !== session.workspaceId) {
    return { success: false, error: 'Unauthorized' };
  }

  await db.landingPage.delete({ where: { id } });

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function duplicateLandingPageAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const original = await db.landingPage.findUnique({ where: { id } });
  if (!original) return { success: false, error: 'Original landing page not found' };

  if (session.role !== UserRole.SUPER_ADMIN && original.workspaceId !== session.workspaceId) {
    return { success: false, error: 'Unauthorized' };
  }

  const newSlug = slugify(`${original.slug}-copy-${Math.floor(Math.random() * 1000)}`);

  const copy = await db.landingPage.create({
    data: {
      workspaceId: original.workspaceId,
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
    },
  });

  revalidatePath('/dashboard/landing-pages');
  return { success: true, page: copy };
}

export async function toggleLandingPageStatusAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const existing = await db.landingPage.findUnique({ where: { id } });
  if (!existing) return { success: false, error: 'Landing page not found' };

  if (session.role !== UserRole.SUPER_ADMIN && existing.workspaceId !== session.workspaceId) {
    return { success: false, error: 'Unauthorized' };
  }

  const newStatus = existing.status === PageStatus.ACTIVE ? PageStatus.INACTIVE : PageStatus.ACTIVE;

  await db.landingPage.update({
    where: { id },
    data: { status: newStatus },
  });

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
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

  if (!page || page.status !== PageStatus.ACTIVE) {
    return null;
  }

  return page;
}
