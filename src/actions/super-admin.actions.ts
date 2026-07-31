'use server';

import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { UserRole, SubscriptionStatus } from '@/lib/types';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export async function getSuperAdminStatsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const [totalAdmins, totalWorkspaces, totalLandingPages, activeSubscriptions, totalDomains] = await Promise.all([
    db.user.count({ where: { role: UserRole.ADMIN } }),
    db.workspace.count(),
    db.landingPage.count(),
    db.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    db.domain.count(),
  ]);

  return {
    totalAdmins,
    totalWorkspaces,
    totalLandingPages,
    activeSubscriptions,
    totalDomains,
  };
}

export async function getAdminsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  return db.user.findMany({
    where: { role: UserRole.ADMIN },
    select: {
      id: true,
      email: true,
      isSuspended: true,
      createdAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          createdAt: true,
          _count: {
            select: { landingPages: true, domains: true },
          },
          subscription: {
            select: {
              status: true,
              planName: true,
              price: true,
              expiryDate: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAdminAction(formData: FormData) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const email = formData.get('email')?.toString().toLowerCase().trim();
  const password = formData.get('password')?.toString();
  const workspaceName = formData.get('workspaceName')?.toString().trim();

  if (!email || !password || !workspaceName) {
    return { success: false, error: 'Email, password, and workspace name are required' };
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return { success: false, error: 'User with this email already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await db.user.create({
    data: {
      email,
      passwordHash,
      role: UserRole.ADMIN,
      workspace: {
        create: {
          name: workspaceName,
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
    include: { workspace: true },
  });

  revalidatePath('/super-admin/admins');
  revalidatePath('/super-admin/workspaces');
  return { success: true, user: newUser };
}

export async function toggleSuspendAdminAction(userId: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === UserRole.SUPER_ADMIN) {
    return { success: false, error: 'Invalid admin target' };
  }

  await db.user.update({
    where: { id: userId },
    data: { isSuspended: !user.isSuspended },
  });

  revalidatePath('/super-admin/admins');
  return { success: true, isSuspended: !user.isSuspended };
}

export async function resetAdminPasswordAction(userId: string, newPassword: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}

export async function deleteAdminAction(userId: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === UserRole.SUPER_ADMIN) {
    return { success: false, error: 'Cannot delete super admin user' };
  }

  await db.user.delete({ where: { id: userId } });

  revalidatePath('/super-admin/admins');
  revalidatePath('/super-admin/workspaces');
  return { success: true };
}

export async function getAllWorkspacesAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  return db.workspace.findMany({
    include: {
      user: {
        select: { id: true, email: true, isSuspended: true },
      },
      subscription: true,
      domains: true,
      landingPages: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          viewsCount: true,
          clicksCount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateSubscriptionStatusAction(workspaceId: string, status: SubscriptionStatus | string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  await db.subscription.update({
    where: { workspaceId },
    data: { status },
  });

  revalidatePath('/super-admin/workspaces');
  return { success: true };
}

export async function getAllDomainsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);

  return db.domain.findMany({
    include: {
      workspace: {
        select: { id: true, name: true, user: { select: { email: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
