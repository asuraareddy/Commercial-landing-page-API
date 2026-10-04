'use server';

import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { UserRole, SubscriptionStatus, DomainStatus, PageStatus } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { normalizeDomain, invalidateDomainCache } from '@/lib/domains';
import { addDomainToVercel, removeDomainFromVercel } from '@/lib/vercel';

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getSuperAdminStatsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const [totalAdmins, totalLandingPages, totalDomains] = await Promise.all([
    db.user.count({ where: { role: UserRole.ADMIN } }),
    db.landingPage.count(),
    db.domain.count(),
  ]);

  return {
    totalAdmins,
    totalWorkspaces: totalAdmins,
    totalLandingPages,
    activeSubscriptions: totalAdmins,
    totalDomains,
  };
}

// ---------------------------------------------------------------------------
// Admins
// ---------------------------------------------------------------------------

export async function getAdminsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const admins = await db.user.findMany({
    where: { role: UserRole.ADMIN },
    include: {
      workspace: {
        include: {
          _count: { select: { landingPages: true } },
          subscription: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return admins;
}

export async function createAdminAction(formData: FormData) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const email = formData.get('email')?.toString().toLowerCase().trim();
  const password = formData.get('password')?.toString();
  const workspaceName = formData.get('workspaceName')?.toString().trim();

  if (!email || !password || !workspaceName) {
    return { success: false, error: 'Email, password, and workspace name are required' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: 'User with this email already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const newUser = await db.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.ADMIN,
        workspace: {
          create: {
            name: workspaceName,
            supportEmail: email,
            subscription: {
              create: {
                planName: 'Unlimited',
                price: 500.0,
                currency: 'USD',
                billingType: 'One Time',
                status: SubscriptionStatus.ACTIVE,
              },
            },
          },
        },
      },
      include: {
        workspace: {
          include: {
            _count: { select: { landingPages: true } },
            subscription: true,
          },
        },
      },
    });

    revalidatePath('/super-admin/admins');
    revalidatePath('/super-admin');
    return { success: true, user: newUser };
  } catch (error: any) {
    console.error('createAdminAction error:', error);
    return { success: false, error: error.message || 'Failed to create admin' };
  }
}

export async function toggleSuspendAdminAction(userId: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: 'User not found' };

    await db.user.update({
      where: { id: userId },
      data: { isSuspended: !user.isSuspended },
    });

    revalidatePath('/super-admin/admins');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update user' };
  }
}

export async function resetAdminPasswordAction(userId: string, newPassword: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reset password' };
  }
}

export async function deleteAdminAction(userId: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  try {
    await db.user.delete({ where: { id: userId } });

    revalidatePath('/super-admin/admins');
    revalidatePath('/super-admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete admin' };
  }
}

// ---------------------------------------------------------------------------
// Landing Pages
// ---------------------------------------------------------------------------

export async function getAllLandingPagesForSuperAdminAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const pages = await db.landingPage.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      workspace: { select: { id: true, name: true, user: { select: { email: true } } } },
      domain: { select: { id: true, domainName: true } },
    },
  });

  return pages;
}

export async function restoreLandingPageAction(id: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  try {
    const page = await db.landingPage.findUnique({ where: { id } });
    if (!page) return { success: false, error: 'Landing page not found' };

    await db.landingPage.update({
      where: { id },
      data: {
        status: PageStatus.INACTIVE,
        archivedAt: null,
        updatedAt: new Date(),
      },
    });

    revalidatePath('/super-admin/landing-pages');
    revalidatePath('/super-admin');
    revalidatePath('/dashboard/landing-pages');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to restore page' };
  }
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

export async function getAllDomainsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const domains = await db.domain.findMany({
    include: {
      workspace: { select: { id: true, name: true, user: { select: { email: true } } } },
      _count: { select: { landingPages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return domains;
}

/** Lightweight list of workspaces for the domain-assignment dropdown. */
export async function getWorkspaceOptionsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  return db.workspace.findMany({
    select: { id: true, name: true, user: { select: { email: true, role: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createGlobalDomainAction(formData: FormData) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const rawDomain = formData.get('domainName')?.toString() || '';
  const workspaceId = formData.get('workspaceId')?.toString().trim();
  const domainName = normalizeDomain(rawDomain);

  if (!rawDomain.trim()) {
    return { success: false, error: 'Domain name is required' };
  }
  if (!domainName) {
    return { success: false, error: 'Invalid domain format. Use e.g. go.client.com (no http:// or paths).' };
  }
  if (!workspaceId) {
    return { success: false, error: 'Please select which admin/workspace this domain belongs to' };
  }

  try {
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } });
    if (!workspace) {
      return { success: false, error: 'Selected workspace no longer exists' };
    }

    const existing = await db.domain.findUnique({ where: { domainName } });
    if (existing) {
      return { success: false, error: `Domain "${domainName}" is already registered` };
    }

    const isFirstDomain = (await db.domain.count({ where: { workspaceId } })) === 0;

    const newDomain = await db.domain.create({
      data: {
        workspaceId,
        domainName,
        isPrimary: isFirstDomain,
        status: DomainStatus.ACTIVE,
      },
      include: { workspace: { select: { id: true, name: true } } },
    });

    // Auto-sync domain to Vercel
    const vercelSync = await addDomainToVercel(domainName);
    if (!vercelSync.success) {
      console.warn('Domain created in DB but failed to sync to Vercel:', vercelSync.error);
    }

    invalidateDomainCache();
    revalidatePath('/super-admin/domains');
    revalidatePath('/super-admin');
    return { success: true, domain: newDomain };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: `Domain "${domainName}" is already registered` };
    }
    return { success: false, error: error.message || 'Failed to create domain' };
  }
}

export async function assignDomainWorkspaceAction(id: string, workspaceId: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  try {
    const domain = await db.domain.findUnique({
      where: { id },
      include: { _count: { select: { landingPages: true } } },
    });
    if (!domain) return { success: false, error: 'Domain not found' };
    if (domain.workspaceId === workspaceId) return { success: true };

    if (domain._count.landingPages > 0) {
      return {
        success: false,
        error: `Cannot reassign: ${domain._count.landingPages} landing page(s) are published on this domain. Move or delete them first.`,
      };
    }

    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } });
    if (!workspace) return { success: false, error: 'Workspace not found' };

    const isFirstDomain = (await db.domain.count({ where: { workspaceId } })) === 0;

    await db.domain.update({
      where: { id },
      data: { workspaceId, isPrimary: isFirstDomain },
    });

    invalidateDomainCache();
    revalidatePath('/super-admin/domains');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reassign domain' };
  }
}

export async function toggleGlobalDomainStatusAction(id: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  try {
    const domain = await db.domain.findUnique({ where: { id } });
    if (!domain) return { success: false, error: 'Domain not found' };

    const newStatus = domain.status === DomainStatus.ACTIVE ? DomainStatus.PENDING : DomainStatus.ACTIVE;

    await db.domain.update({
      where: { id },
      data: { status: newStatus },
    });

    invalidateDomainCache();
    revalidatePath('/super-admin/domains');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update domain' };
  }
}

export async function deleteGlobalDomainAction(id: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  try {
    const domain = await db.domain.findUnique({ where: { id } });
    if (!domain) return { success: false, error: 'Domain not found' };

    const pageCount = await db.landingPage.count({ where: { domainId: id } });
    if (pageCount > 0) {
      return {
        success: false,
        error: `Cannot delete: ${pageCount} landing page(s) are published on this domain. Move or delete them first.`,
      };
    }

    await db.domain.delete({ where: { id } });

    // Auto-remove domain from Vercel
    await removeDomainFromVercel(domain.domainName);

    invalidateDomainCache();
    revalidatePath('/super-admin/domains');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete domain' };
  }
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export async function getAllWorkspacesAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const workspaces = await db.workspace.findMany({
    include: {
      user: { select: { email: true } },
      landingPages: {
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: 'desc' },
      },
      domains: { select: { id: true, domainName: true } },
      subscription: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return workspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    user: { email: ws.user?.email || 'N/A' },
    landingPages: ws.landingPages || [],
    domains: ws.domains || [],
    subscription: ws.subscription || { status: SubscriptionStatus.ACTIVE },
    createdAt: ws.createdAt,
  }));
}

export async function updateSubscriptionDetailsAction(workspaceId: string, data: any) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  try {
    await db.subscription.update({
      where: { workspaceId },
      data: {
        planName: data.planName,
        billingType: data.billingType,
        price: Number(data.price),
        status: data.status,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });

    revalidatePath('/super-admin/workspaces');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update subscription' };
  }
}
