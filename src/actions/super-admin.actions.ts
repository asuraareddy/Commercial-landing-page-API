'use server';

import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { UserRole, SubscriptionStatus, DomainStatus } from '@/lib/types';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { fetchCloudState, saveCloudState } from '@/lib/cloud-store';

export async function getSuperAdminStatsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  const totalAdmins = state.admins.length > 0 ? state.admins.length : 1;
  const totalLandingPages = state.landingPages.length;
  const totalDomains = state.domains.length;

  return {
    totalAdmins,
    totalWorkspaces: totalAdmins,
    totalLandingPages,
    activeSubscriptions: totalAdmins,
    totalDomains,
  };
}

export async function getAdminsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  let dbAdmins: any[] = [];
  try {
    dbAdmins = await db.user.findMany({
      where: { role: UserRole.ADMIN },
      include: { workspace: { include: { _count: { select: { landingPages: true } } } } },
    });
  } catch (e) {}

  const combined = [...state.admins];
  for (const dbAdmin of dbAdmins) {
    if (!combined.some((a) => a.email === dbAdmin.email)) {
      combined.push(dbAdmin);
    }
  }

  return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllLandingPagesForSuperAdminAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();
  return state.landingPages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createAdminAction(formData: FormData) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const email = formData.get('email')?.toString().toLowerCase().trim();
  const password = formData.get('password')?.toString();
  const workspaceName = formData.get('workspaceName')?.toString().trim();

  if (!email || !password || !workspaceName) {
    return { success: false, error: 'Email, password, and workspace name are required' };
  }

  const state = await fetchCloudState();
  if (state.admins.some((a) => a.email === email)) {
    return { success: false, error: 'User with this email already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newAdminObj = {
    id: userId,
    email,
    passwordHash,
    role: UserRole.ADMIN,
    isSuspended: false,
    createdAt: new Date().toISOString(),
    workspace: {
      id: workspaceId,
      name: workspaceName,
      supportEmail: email,
      _count: { landingPages: 0 },
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        planName: 'Unlimited',
        price: 500.0,
      },
    },
  };

  try {
    await db.user.create({
      data: {
        id: userId,
        email,
        passwordHash,
        role: UserRole.ADMIN,
        workspace: {
          create: {
            id: workspaceId,
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
    });
  } catch (e) {}

  state.admins.unshift(newAdminObj);
  await saveCloudState(state);

  revalidatePath('/super-admin/admins');
  revalidatePath('/super-admin');
  return { success: true, user: newAdminObj };
}

export async function toggleSuspendAdminAction(userId: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  const idx = state.admins.findIndex((a) => a.id === userId);
  if (idx !== -1) {
    state.admins[idx].isSuspended = !state.admins[idx].isSuspended;
    await saveCloudState(state);
  }

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      await db.user.update({
        where: { id: userId },
        data: { isSuspended: !user.isSuspended },
      });
    }
  } catch (e) {}

  revalidatePath('/super-admin/admins');
  return { success: true };
}

export async function resetAdminPasswordAction(userId: string, newPassword: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const state = await fetchCloudState();

  const idx = state.admins.findIndex((a) => a.id === userId);
  if (idx !== -1) {
    state.admins[idx].passwordHash = passwordHash;
    await saveCloudState(state);
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  } catch (e) {}

  return { success: true };
}

export async function deleteAdminAction(userId: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  state.admins = state.admins.filter((a) => a.id !== userId);
  await saveCloudState(state);

  try {
    await db.user.delete({ where: { id: userId } });
  } catch (e) {}

  revalidatePath('/super-admin/admins');
  revalidatePath('/super-admin');
  return { success: true };
}

export async function getAllDomainsAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();
  return state.domains;
}

export async function createGlobalDomainAction(formData: FormData) {
  await requireAuth([UserRole.SUPER_ADMIN]);

  const domainName = formData.get('domainName')?.toString().toLowerCase().trim();

  if (!domainName) {
    return { success: false, error: 'Domain name is required' };
  }

  const state = await fetchCloudState();
  if (state.domains.some((d) => d.domainName === domainName)) {
    return { success: false, error: `Domain "${domainName}" is already registered` };
  }

  const newDomainObj = {
    id: `dom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    domainName,
    status: DomainStatus.ACTIVE,
    isPrimary: false,
    createdAt: new Date().toISOString(),
    workspace: { name: 'Global Pool' },
  };

  state.domains.unshift(newDomainObj);
  await saveCloudState(state);

  revalidatePath('/super-admin/domains');
  revalidatePath('/super-admin');
  return { success: true, domain: newDomainObj };
}

export async function toggleGlobalDomainStatusAction(id: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  const idx = state.domains.findIndex((d) => d.id === id);
  if (idx !== -1) {
    state.domains[idx].status = state.domains[idx].status === DomainStatus.ACTIVE ? DomainStatus.PENDING : DomainStatus.ACTIVE;
    await saveCloudState(state);
  }

  revalidatePath('/super-admin/domains');
  return { success: true };
}

export async function deleteGlobalDomainAction(id: string) {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();

  state.domains = state.domains.filter((d) => d.id !== id);
  await saveCloudState(state);

  revalidatePath('/super-admin/domains');
  return { success: true };
}

export async function getAllWorkspacesAction() {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();
  return state.admins.map((a) => ({
    id: a.workspace?.id || `ws_${a.id}`,
    name: a.workspace?.name || 'Default Workspace',
    user: { email: a.email },
    landingPages: state.landingPages.filter((p) => p.workspaceId === (a.workspace?.id || `ws_${a.id}`)),
    subscription: a.workspace?.subscription || { status: SubscriptionStatus.ACTIVE },
    createdAt: a.createdAt,
  }));
}

export async function updateSubscriptionStatusAction(workspaceId: string, status: SubscriptionStatus) {
  await requireAuth([UserRole.SUPER_ADMIN]);
  const state = await fetchCloudState();
  const idx = state.admins.findIndex((a) => (a.workspace?.id || `ws_${a.id}`) === workspaceId);
  if (idx !== -1) {
    if (state.admins[idx].workspace) {
      if (!state.admins[idx].workspace.subscription) {
        state.admins[idx].workspace.subscription = {};
      }
      state.admins[idx].workspace.subscription.status = status;
      await saveCloudState(state);
    }
  }
  revalidatePath('/super-admin/workspaces');
  return { success: true };
}
