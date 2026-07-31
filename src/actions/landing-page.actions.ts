'use server';

import { requireAuth, getSession } from '@/lib/auth';
import { UserRole, PageStatus, MediaType } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/utils';
import { fetchCloudState, saveCloudState } from '@/lib/cloud-store';

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
  const workspaceId = session.workspaceId;

  const state = await fetchCloudState();
  let pages = state.landingPages || [];

  if (session.role !== UserRole.SUPER_ADMIN && workspaceId) {
    pages = pages.filter((p) => p.workspaceId === workspaceId);
  }

  return pages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getLandingPageByIdAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();
  const page = state.landingPages.find((p) => p.id === id);

  if (!page) return null;

  if (session.role !== UserRole.SUPER_ADMIN && session.workspaceId && page.workspaceId !== session.workspaceId) {
    throw new Error('FORBIDDEN');
  }

  return page;
}

export async function createLandingPageAction(data: any) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const workspaceId = session.workspaceId || 'default-workspace-id';

  const formattedSlug = slugify(data.slug || data.name);
  const state = await fetchCloudState();

  const slugExists = state.landingPages.some((p) => p.slug === formattedSlug);
  if (slugExists) {
    return { success: false, error: `Slug "${formattedSlug}" is already taken. Please choose another.` };
  }

  const newLandingPage = {
    id: `lp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    workspaceId,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.landingPages.unshift(newLandingPage);
  await saveCloudState(state);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  revalidatePath(`/p/${formattedSlug}`);

  return { success: true, page: newLandingPage };
}

export async function updateLandingPageAction(id: string, data: any) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();
  const pageIndex = state.landingPages.findIndex((p) => p.id === id);

  if (pageIndex === -1) {
    return { success: false, error: 'Landing page not found' };
  }

  const existing = state.landingPages[pageIndex];
  if (session.role !== UserRole.SUPER_ADMIN && session.workspaceId && existing.workspaceId !== session.workspaceId) {
    return { success: false, error: 'Unauthorized access to this landing page' };
  }

  const formattedSlug = slugify(data.slug || data.name);

  if (formattedSlug !== existing.slug) {
    const slugCheck = state.landingPages.some((p) => p.slug === formattedSlug && p.id !== id);
    if (slugCheck) {
      return { success: false, error: `Slug "${formattedSlug}" is already taken.` };
    }
  }

  const updatedPage = {
    ...existing,
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

  state.landingPages[pageIndex] = updatedPage;
  await saveCloudState(state);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  revalidatePath(`/dashboard/landing-pages/${id}/edit`);
  revalidatePath(`/p/${formattedSlug}`);
  if (existing.slug !== formattedSlug) {
    revalidatePath(`/p/${existing.slug}`);
  }

  return { success: true, page: updatedPage };
}

export async function deleteLandingPageAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  const page = state.landingPages.find((p) => p.id === id);
  if (!page) return { success: false, error: 'Landing page not found' };

  if (session.role !== UserRole.SUPER_ADMIN && session.workspaceId && page.workspaceId !== session.workspaceId) {
    return { success: false, error: 'Unauthorized' };
  }

  state.landingPages = state.landingPages.filter((p) => p.id !== id);
  await saveCloudState(state);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  revalidatePath(`/p/${page.slug}`);
  return { success: true };
}

export async function duplicateLandingPageAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  const original = state.landingPages.find((p) => p.id === id);
  if (!original) return { success: false, error: 'Original landing page not found' };

  if (session.role !== UserRole.SUPER_ADMIN && session.workspaceId && original.workspaceId !== session.workspaceId) {
    return { success: false, error: 'Unauthorized' };
  }

  const newSlug = slugify(`${original.slug}-copy-${Math.floor(Math.random() * 1000)}`);
  const copyPage = {
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

  state.landingPages.unshift(copyPage);
  await saveCloudState(state);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  return { success: true, page: copyPage };
}

export async function toggleLandingPageStatusAction(id: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  const pageIndex = state.landingPages.findIndex((p) => p.id === id);
  if (pageIndex === -1) return { success: false, error: 'Landing page not found' };

  const existing = state.landingPages[pageIndex];
  if (session.role !== UserRole.SUPER_ADMIN && session.workspaceId && existing.workspaceId !== session.workspaceId) {
    return { success: false, error: 'Unauthorized' };
  }

  const newStatus = existing.status === PageStatus.ACTIVE ? PageStatus.INACTIVE : PageStatus.ACTIVE;
  state.landingPages[pageIndex].status = newStatus;
  state.landingPages[pageIndex].updatedAt = new Date().toISOString();

  await saveCloudState(state);

  revalidatePath('/dashboard/landing-pages');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/landing-pages');
  revalidatePath('/super-admin');
  return { success: true, status: newStatus };
}

export async function trackPageViewAction(slug: string) {
  try {
    const state = await fetchCloudState();
    const pageIndex = state.landingPages.findIndex((p) => p.slug === slug);
    if (pageIndex !== -1) {
      state.landingPages[pageIndex].viewsCount = (state.landingPages[pageIndex].viewsCount || 0) + 1;
      await saveCloudState(state);
    }
  } catch (error) {
    // Non-blocking
  }
}

export async function trackWhatsAppClickAction(slug: string) {
  try {
    const state = await fetchCloudState();
    const pageIndex = state.landingPages.findIndex((p) => p.slug === slug);
    if (pageIndex !== -1) {
      state.landingPages[pageIndex].clicksCount = (state.landingPages[pageIndex].clicksCount || 0) + 1;
      await saveCloudState(state);
    }
  } catch (error) {
    // Non-blocking
  }
}

export async function getPublicLandingPageBySlug(slug: string) {
  const state = await fetchCloudState();
  const page = state.landingPages.find((p) => p.slug === slug && p.status === PageStatus.ACTIVE);

  if (!page) {
    return null;
  }

  return page;
}
