import { db } from './db';
import {
  detectRegistrarFromNameservers,
  generateRequiredDnsRecords,
  generateVerificationToken,
  verifyDomainDnsRecords,
} from './dns';
import {
  DnsRecordCheck,
  DomainDnsSummary,
  DomainStatus,
  SslStatus,
} from './types';

export interface DomainWithDnsView {
  id: string;
  workspaceId: string;
  domainName: string;
  isPrimary: boolean;
  status: string;
  sslStatus: string;
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  verificationError: string | null;
  createdAt: string;
  updatedAt: string;
  workspace?: {
    id: string;
    name: string;
    user?: { email: string };
  };
  _count?: {
    landingPages: number;
  };
  dnsSummary: DomainDnsSummary;
}

function normalizeDisplayStatus(status: string, hasVerifiedAt: boolean): DomainStatus {
  if (status === DomainStatus.CONNECTED || status === DomainStatus.VERIFIED) {
    return DomainStatus.CONNECTED;
  }
  if (status === DomainStatus.ACTIVE && hasVerifiedAt) {
    return DomainStatus.CONNECTED;
  }
  if (status === DomainStatus.FAILED) {
    return DomainStatus.FAILED;
  }
  return DomainStatus.PENDING;
}

export async function ensureDomainVerificationToken(
  domainId: string,
  existingToken: string | null
): Promise<string> {
  if (existingToken) return existingToken;
  const token = generateVerificationToken();
  await db.domain.update({
    where: { id: domainId },
    data: { verificationToken: token },
  });
  return token;
}

export async function enrichDomainWithDnsConfig(
  domain: {
    id: string;
    workspaceId: string;
    domainName: string;
    isPrimary: boolean;
    status: string;
    sslStatus?: string | null;
    verificationToken?: string | null;
    lastCheckedAt?: Date | null;
    verifiedAt?: Date | null;
    verificationError?: string | null;
    lastCheckResults?: string | null;
    createdAt: Date;
    updatedAt: Date;
    workspace?: {
      id: string;
      name: string;
      supportEmail?: string | null;
      user?: { email: string } | null;
    } | null;
    _count?: {
      landingPages: number;
    };
  },
  runtimeHost?: string | null
): Promise<DomainWithDnsView> {
  const token = await ensureDomainVerificationToken(
    domain.id,
    domain.verificationToken ?? null
  );

  const normalizedInitialStatus = normalizeDisplayStatus(
    domain.status,
    Boolean(domain.verifiedAt)
  );
  const ageMs = domain.lastCheckedAt
    ? Date.now() - domain.lastCheckedAt.getTime()
    : Infinity;

  // Always run a fresh live DNS check if never checked, or if unconnected and older than 15s
  if (!domain.lastCheckedAt || (normalizedInitialStatus !== DomainStatus.CONNECTED && ageMs > 15_000)) {
    const liveSummary = await runDomainDnsVerification(domain.id, runtimeHost);
    if (liveSummary) {
      return {
        id: domain.id,
        workspaceId: domain.workspaceId,
        domainName: domain.domainName,
        isPrimary: domain.isPrimary,
        status: liveSummary.status,
        sslStatus: liveSummary.sslStatus,
        lastCheckedAt: liveSummary.lastCheckedAt,
        verifiedAt: liveSummary.verifiedAt,
        verificationError: liveSummary.verificationError,
        createdAt: domain.createdAt.toISOString(),
        updatedAt: domain.updatedAt.toISOString(),
        workspace: domain.workspace
          ? {
              id: domain.workspace.id,
              name: domain.workspace.name,
              user: domain.workspace.user ?? undefined,
            }
          : undefined,
        _count: domain._count,
        dnsSummary: liveSummary,
      };
    }
  }

  const generated = await generateRequiredDnsRecords({
    domainName: domain.domainName,
    verificationToken: token,
    supportEmail: domain.workspace?.supportEmail,
    runtimeHost,
  });

  let parsedRecords: DnsRecordCheck[] = generated.records;
  let parsedWarnings: string[] = [];
  let nameservers: string[] = [];

  if (domain.lastCheckResults) {
    try {
      const saved = JSON.parse(domain.lastCheckResults) as {
        records?: DnsRecordCheck[];
        warnings?: string[];
        nameservers?: string[];
      };
      if (Array.isArray(saved.records) && saved.records.length > 0) {
        parsedRecords = generated.records.map((rec) => {
          const match = saved.records?.find((s) => s.id === rec.id && s.fqdn === rec.fqdn);
          if (!match) return rec;
          return {
            ...rec,
            status: match.status,
            actualValues: match.actualValues,
            conflictProvider: match.conflictProvider,
            actionRequired: match.actionRequired,
            message: match.message,
          };
        });
      }
      if (Array.isArray(saved.warnings)) {
        parsedWarnings = saved.warnings;
      }
      if (Array.isArray(saved.nameservers)) {
        nameservers = saved.nameservers;
      }
    } catch {
      // Ignore malformed cached JSON
    }
  }

  const { detectedRegistrar, detectedProviderName } =
    detectRegistrarFromNameservers(nameservers);
  const normalizedStatus = normalizeDisplayStatus(domain.status, Boolean(domain.verifiedAt));
  const sslStatus = (domain.sslStatus as SslStatus) || SslStatus.PENDING;

  return {
    id: domain.id,
    workspaceId: domain.workspaceId,
    domainName: domain.domainName,
    isPrimary: domain.isPrimary,
    status: normalizedStatus,
    sslStatus,
    lastCheckedAt: domain.lastCheckedAt ? domain.lastCheckedAt.toISOString() : null,
    verifiedAt: domain.verifiedAt ? domain.verifiedAt.toISOString() : null,
    verificationError: domain.verificationError ?? null,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
    workspace: domain.workspace
      ? {
          id: domain.workspace.id,
          name: domain.workspace.name,
          user: domain.workspace.user ?? undefined,
        }
      : undefined,
    _count: domain._count,
    dnsSummary: {
      domainId: domain.id,
      domainName: domain.domainName,
      zoneName: generated.zoneName,
      isApex: generated.isApex,
      status: normalizedStatus,
      sslStatus,
      detectedRegistrar,
      detectedProviderName,
      nameservers,
      records: parsedRecords,
      warnings: parsedWarnings,
      lastCheckedAt: domain.lastCheckedAt ? domain.lastCheckedAt.toISOString() : null,
      verifiedAt: domain.verifiedAt ? domain.verifiedAt.toISOString() : null,
      verificationError: domain.verificationError ?? null,
    },
  };
}

export async function runDomainDnsVerification(
  domainId: string,
  runtimeHost?: string | null
): Promise<DomainDnsSummary | null> {
  const domain = await db.domain.findUnique({
    where: { id: domainId },
    include: {
      workspace: {
        select: { supportEmail: true },
      },
    },
  });

  if (!domain) return null;

  const token = await ensureDomainVerificationToken(
    domain.id,
    domain.verificationToken ?? null
  );

  const summary = await verifyDomainDnsRecords({
    domainId: domain.id,
    domainName: domain.domainName,
    verificationToken: token,
    supportEmail: domain.workspace?.supportEmail,
    runtimeHost,
  });

  await db.domain.update({
    where: { id: domain.id },
    data: {
      status: summary.status,
      sslStatus: summary.sslStatus,
      lastCheckedAt: new Date(summary.lastCheckedAt || Date.now()),
      verifiedAt: summary.verifiedAt ? new Date(summary.verifiedAt) : domain.verifiedAt,
      verificationError: summary.verificationError,
      lastCheckResults: JSON.stringify({
        records: summary.records,
        warnings: summary.warnings,
        nameservers: summary.nameservers || [],
      }),
    },
  });

  return summary;
}
