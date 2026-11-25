'use server';

import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { UserRole, DomainStatus } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { normalizeDomain, invalidateDomainCache } from '@/lib/domains';
import { generateVerificationToken } from '@/lib/dns';
import {
  enrichDomainWithDnsConfig,
  runDomainDnsVerification,
} from '@/lib/domain-service';
import { addDomainToVercel, removeDomainFromVercel } from '@/lib/vercel';
import { SslStatus } from '@/lib/types';
import type { SessionUser } from '@/lib/auth';

/**
 * The caller's own workspace id. Never falls back to another tenant's workspace
 * (the old db.workspace.findFirst() fallback leaked one tenant's settings and
 * domains into the Super Admin's landing pages).
 */
async function getOwnWorkspaceId(session: SessionUser): Promise<string | null> {
  if (session.workspaceId) return session.workspaceId;
  const ws = await db.workspace.findUnique({ where: { userId: session.id }, select: { id: true } });
  return ws?.id ?? null;
}

export async function getWorkspaceSettingsAction() {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const workspaceId = await getOwnWorkspaceId(session);

  if (!workspaceId) return null;

  return db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      subscription: true,
      domains: true,
    },
  });
}

export async function updateWorkspaceSettingsAction(data: any) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const workspaceId = await getOwnWorkspaceId(session);

  if (!workspaceId) {
    return { success: false, error: 'Workspace not found' };
  }

  const updated = await db.workspace.update({
    where: { id: workspaceId },
    data: {
      name: data.name,
      logoUrl: data.logoUrl || null,
      faviconUrl: data.faviconUrl || null,
      primaryColor: data.primaryColor || '#0f172a',
      buttonColor: data.buttonColor || '#25D366',
      supportEmail: data.supportEmail || null,
      defaultWhatsapp: data.defaultWhatsapp || null,
      defaultPixelId: data.defaultPixelId || null,
      defaultMessage: data.defaultMessage || null,
    },
  });

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return { success: true, workspace: updated };
}

export async function getWorkspaceDomainsAction() {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const workspaceId = await getOwnWorkspaceId(session);

  if (!workspaceId) return [];

  const reqHeaders = await headers();
  const runtimeHost = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host');

  const domains = await db.domain.findMany({
    where: { workspaceId },
    include: {
      workspace: {
        select: { id: true, name: true, supportEmail: true },
      },
      _count: {
        select: { landingPages: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    domains.map((domain) => enrichDomainWithDnsConfig(domain, runtimeHost))
  );
}

export async function addCustomDomainAction(domainName: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const workspaceId = await getOwnWorkspaceId(session);

  if (!workspaceId) {
    return {
      success: false,
      error: session.role === UserRole.SUPER_ADMIN
        ? 'Use Super Admin → Domains to add a domain and assign it to a workspace.'
        : 'Workspace not found',
    };
  }

  const cleanDomain = normalizeDomain(domainName);
  if (!cleanDomain) {
    return { success: false, error: 'Invalid domain format. Use e.g. go.client.com (no http:// or paths).' };
  }

  const existing = await db.domain.findUnique({ where: { domainName: cleanDomain } });
  if (existing) {
    return { success: false, error: 'This domain is already registered on the platform.' };
  }

  const isFirstDomain = (await db.domain.count({ where: { workspaceId } })) === 0;
  const verificationToken = generateVerificationToken();

  try {
    const newDomain = await db.domain.create({
      data: {
        workspaceId,
        domainName: cleanDomain,
        isPrimary: isFirstDomain,
        status: DomainStatus.PENDING,
        sslStatus: SslStatus.PENDING,
        verificationToken,
      },
      include: {
        workspace: {
          select: { id: true, name: true, supportEmail: true },
        },
        _count: {
          select: { landingPages: true },
        },
      },
    });

    await addDomainToVercel(cleanDomain);

    const reqHeaders = await headers();
    const runtimeHost = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host');

    await runDomainDnsVerification(newDomain.id, runtimeHost);

    const refreshed = await db.domain.findUnique({
      where: { id: newDomain.id },
      include: {
        workspace: {
          select: { id: true, name: true, supportEmail: true },
        },
        _count: {
          select: { landingPages: true },
        },
      },
    });

    const enriched = refreshed
      ? await enrichDomainWithDnsConfig(refreshed, runtimeHost)
      : await enrichDomainWithDnsConfig(newDomain, runtimeHost);

    invalidateDomainCache();
    revalidatePath('/dashboard/domains');
    revalidatePath('/dashboard');
    revalidatePath('/super-admin/domains');
    return { success: true, domain: enriched };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'This domain is already registered on the platform.' };
    }
    return { success: false, error: error.message || 'Failed to add domain' };
  }
}

export async function verifyWorkspaceDomainDnsAction(domainId: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const domain = await db.domain.findUnique({ where: { id: domainId } });
  if (!domain) {
    return { success: false, error: 'Domain not found' };
  }

  const ownWorkspaceId = await getOwnWorkspaceId(session);
  if (session.role !== UserRole.SUPER_ADMIN && domain.workspaceId !== ownWorkspaceId) {
    return { success: false, error: 'Unauthorized: You can only verify your own workspace domains.' };
  }

  const reqHeaders = await headers();
  const runtimeHost = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host');

  const summary = await runDomainDnsVerification(domain.id, runtimeHost);
  if (!summary) {
    return { success: false, error: 'Failed to run DNS verification' };
  }

  invalidateDomainCache();
  revalidatePath('/dashboard/domains');
  revalidatePath('/dashboard');
  revalidatePath('/super-admin/domains');
  return { success: true, summary };
}

export async function setPrimaryDomainAction(domainId: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const domain = await db.domain.findUnique({ where: { id: domainId }, select: { id: true, workspaceId: true } });
  if (!domain) return { success: false, error: 'Domain not found' };

  const ownWorkspaceId = await getOwnWorkspaceId(session);
  if (session.role !== UserRole.SUPER_ADMIN && domain.workspaceId !== ownWorkspaceId) {
    return { success: false, error: 'Unauthorized' };
  }

  await db.$transaction([
    db.domain.updateMany({ where: { workspaceId: domain.workspaceId }, data: { isPrimary: false } }),
    db.domain.update({ where: { id: domainId }, data: { isPrimary: true } }),
  ]);

  revalidatePath('/dashboard/domains');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCustomDomainAction(domainId: string) {
  const session = await requireAuth([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const domain = await db.domain.findUnique({ where: { id: domainId } });
  if (!domain) return { success: false, error: 'Domain not found' };

  const ownWorkspaceId = await getOwnWorkspaceId(session);
  if (session.role !== UserRole.SUPER_ADMIN && domain.workspaceId !== ownWorkspaceId) {
    return { success: false, error: 'Unauthorized' };
  }

  const pageCount = await db.landingPage.count({ where: { domainId } });
  if (pageCount > 0) {
    return {
      success: false,
      error: `Cannot delete: ${pageCount} landing page(s) are published on this domain. Move or delete them first.`,
    };
  }

  await db.domain.delete({ where: { id: domainId } });
  invalidateDomainCache();

  if (domain.isPrimary) {
    const nextDomain = await db.domain.findFirst({
      where: { workspaceId: domain.workspaceId },
    });
    if (nextDomain) {
      await db.domain.update({
        where: { id: nextDomain.id },
        data: { isPrimary: true },
      });
    }
  }

  revalidatePath('/dashboard/domains');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateUserProfilePasswordAction(currentPassword: string, newPassword: string) {
  const session = await requireAuth();

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user) return { success: false, error: 'User not found' };

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return { success: false, error: 'Current password is incorrect' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({
    where: { id: session.id },
    data: { passwordHash },
  });

  return { success: true };
}
