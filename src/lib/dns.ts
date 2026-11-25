import crypto from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import {
  DnsRecordCheck,
  DnsRecordStatus,
  DomainDnsSummary,
  DomainStatus,
  SslStatus,
} from './types';

const TWO_PART_TLDS = new Set([
  'co.uk',
  'org.uk',
  'me.uk',
  'ac.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.in',
  'net.in',
  'org.in',
  'com.br',
  'com.mx',
  'co.za',
  'co.nz',
  'co.jp',
  'com.sg',
  'com.my',
  'ae',
]);

// All valid Vercel Edge Anycast IPs (including 76.76.21.21 and 216.198.79.1 used by goldyanna.shop)
const VALID_VERCEL_EDGE_IPS = new Set([
  '76.76.21.21',
  '216.198.79.1',
  '216.198.79.65',
  '64.29.17.65',
  '64.29.17.1',
]);

export function generateVerificationToken(): string {
  return `wagw_${crypto.randomBytes(16).toString('hex')}`;
}

export function normalizeDomainInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .split(':')[0]
    .replace(/\.+$/, '');
}

export function isValidDomainName(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (domain === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false;
  const domainRegex = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  return domainRegex.test(domain);
}

export function splitDomainParts(domainName: string): {
  isApex: boolean;
  zoneName: string;
  subdomainPrefix: string;
} {
  const parts = domainName.split('.');
  if (parts.length <= 2) {
    return {
      isApex: true,
      zoneName: domainName,
      subdomainPrefix: '@',
    };
  }

  const lastTwo = parts.slice(-2).join('.');
  if (TWO_PART_TLDS.has(lastTwo) && parts.length === 3) {
    return {
      isApex: true,
      zoneName: domainName,
      subdomainPrefix: '@',
    };
  }

  const zoneLength = TWO_PART_TLDS.has(lastTwo) ? 3 : 2;
  const zoneName = parts.slice(-zoneLength).join('.');
  const subdomainPrefix = parts.slice(0, parts.length - zoneLength).join('.');

  return {
    isApex: false,
    zoneName,
    subdomainPrefix,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DNS_TIMEOUT')), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function createDnsResolver(): Resolver {
  const resolver = new Resolver();
  try {
    resolver.setServers(['1.1.1.1', '8.8.8.8']);
  } catch {
    // Fallback to system default servers
  }
  return resolver;
}

export interface HostingTargetInfo {
  cnameTarget: string;
  aRecordIps: string[];
  providerLabel: string;
}

export async function resolvePlatformHostingTarget(
  runtimeHost?: string | null
): Promise<HostingTargetInfo> {
  const explicitTarget = process.env.DNS_CNAME_TARGET?.trim();
  const explicitIp = process.env.DNS_A_RECORD_IP?.trim();

  const cnameTarget = explicitTarget
    ? normalizeDomainInput(explicitTarget)
    : 'cname.vercel-dns.com';
  const providerLabel = explicitTarget ? 'Custom Platform Edge' : 'Vercel Edge Network';

  const aRecordIps: string[] = explicitIp
    ? [explicitIp]
    : Array.from(VALID_VERCEL_EDGE_IPS);

  if (!explicitIp && runtimeHost) {
    const cleanRuntime = normalizeDomainInput(runtimeHost);
    if (isValidDomainName(cleanRuntime)) {
      try {
        const resolver = createDnsResolver();
        const { zoneName } = splitDomainParts(cleanRuntime);
        const liveIps = await withTimeout(resolver.resolve4(zoneName), 2000);
        for (const ip of liveIps) {
          if (!aRecordIps.includes(ip)) {
            aRecordIps.push(ip);
          }
        }
      } catch {
        // Keep default edge IPs
      }
    }
  }

  return {
    cnameTarget,
    aRecordIps,
    providerLabel,
  };
}

export function detectRegistrarFromNameservers(nameservers: string[]): {
  detectedRegistrar: 'godaddy' | 'cloudflare' | 'namecheap' | 'other';
  detectedProviderName: string;
} {
  const joined = nameservers.join(' ').toLowerCase();
  if (joined.includes('domaincontrol.com') || joined.includes('godaddy.com')) {
    return { detectedRegistrar: 'godaddy', detectedProviderName: 'GoDaddy' };
  }
  if (joined.includes('cloudflare.com')) {
    return { detectedRegistrar: 'cloudflare', detectedProviderName: 'Cloudflare' };
  }
  if (joined.includes('registrar-servers.com') || joined.includes('namecheap.com')) {
    return { detectedRegistrar: 'namecheap', detectedProviderName: 'Namecheap' };
  }
  if (joined.includes('awsdns')) {
    return { detectedRegistrar: 'other', detectedProviderName: 'AWS Route 53' };
  }
  if (joined.includes('dns-parking.com') || joined.includes('hostinger')) {
    return { detectedRegistrar: 'other', detectedProviderName: 'Hostinger' };
  }
  if (joined.includes('googledomains.com') || joined.includes('squarespacedns.com')) {
    return { detectedRegistrar: 'other', detectedProviderName: 'Squarespace / Google Domains' };
  }
  return {
    detectedRegistrar: 'godaddy',
    detectedProviderName: nameservers.length > 0 ? `Custom DNS (${nameservers[0]})` : 'Your Domain Registrar',
  };
}

export async function generateRequiredDnsRecords(params: {
  domainName: string;
  verificationToken: string;
  supportEmail?: string | null;
  runtimeHost?: string | null;
}): Promise<{
  isApex: boolean;
  zoneName: string;
  hosting: HostingTargetInfo;
  records: DnsRecordCheck[];
}> {
  const cleanDomain = normalizeDomainInput(params.domainName);
  const { isApex, zoneName, subdomainPrefix } = splitDomainParts(cleanDomain);
  const hosting = await resolvePlatformHostingTarget(params.runtimeHost);
  const records: DnsRecordCheck[] = [];

  if (isApex) {
    const primaryIp = hosting.aRecordIps[0] || '76.76.21.21';
    records.push({
      id: 'routing-a',
      type: 'A',
      name: '@',
      fqdn: cleanDomain,
      value: primaryIp,
      ttl: '600',
      purpose: `Routes root domain (${cleanDomain}) to ${hosting.providerLabel}`,
      category: 'ROUTING',
      required: true,
      status: DnsRecordStatus.PENDING,
    });

    records.push({
      id: 'routing-www-cname',
      type: 'CNAME',
      name: 'www',
      fqdn: `www.${zoneName}`,
      value: hosting.cnameTarget,
      ttl: '600',
      purpose: `Routes www.${zoneName} subdomain to ${hosting.providerLabel}`,
      category: 'ROUTING',
      required: false,
      status: DnsRecordStatus.PENDING,
    });
  } else {
    records.push({
      id: 'routing-cname',
      type: 'CNAME',
      name: subdomainPrefix,
      fqdn: cleanDomain,
      value: hosting.cnameTarget,
      ttl: '600',
      purpose: `Routes subdomain (${cleanDomain}) to ${hosting.providerLabel}`,
      category: 'ROUTING',
      required: true,
      status: DnsRecordStatus.PENDING,
    });
  }

  const txtHostName = isApex
    ? '_wagateway-verification'
    : `_wagateway-verification.${subdomainPrefix}`;
  const txtFqdn = `_wagateway-verification.${cleanDomain}`;

  records.push({
    id: 'ownership-txt',
    type: 'TXT',
    name: txtHostName,
    fqdn: txtFqdn,
    value: `wagateway-site-verification=${params.verificationToken}`,
    ttl: '600',
    purpose: 'Domain ownership verification & automated SSL certificate validation',
    category: 'VERIFICATION',
    required: false,
    status: DnsRecordStatus.PENDING,
  });

  return {
    isApex,
    zoneName,
    hosting,
    records,
  };
}

const KNOWN_PARKING_OR_BUILDER_IPS: Record<string, string> = {
  '76.223.105.230': 'GoDaddy Website Builder / GoDaddy Airo',
  '13.248.243.5': 'GoDaddy Website Builder / GoDaddy Airo',
  '34.102.136.180': 'GoDaddy Parked Domain',
  '50.63.202.40': 'GoDaddy Parked Domain',
  '15.197.148.33': 'GoDaddy Domain Forwarding',
  '3.33.130.190': 'GoDaddy Domain Forwarding',
};

async function checkHttpsReachability(domainName: string): Promise<SslStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://${domainName}`, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
    });
    clearTimeout(timeout);
    if (res.status >= 200 && res.status < 500) {
      return SslStatus.ACTIVE;
    }
    return SslStatus.PENDING;
  } catch {
    return SslStatus.PENDING;
  }
}

export async function verifyDomainDnsRecords(params: {
  domainId: string;
  domainName: string;
  verificationToken: string;
  supportEmail?: string | null;
  runtimeHost?: string | null;
}): Promise<DomainDnsSummary> {
  const resolver = createDnsResolver();
  const generated = await generateRequiredDnsRecords(params);
  const warnings: string[] = [];
  const checkedRecords: DnsRecordCheck[] = [];

  // 1. Detect domain's nameservers & registrar
  let nameservers: string[] = [];
  try {
    const ns = await withTimeout(resolver.resolveNs(generated.zoneName), 3000);
    nameservers = ns.map((n) => normalizeDomainInput(n));
  } catch {
    nameservers = [];
  }
  const { detectedRegistrar, detectedProviderName } =
    detectRegistrarFromNameservers(nameservers);

  for (const record of generated.records) {
    const updated: DnsRecordCheck = { ...record };

    try {
      if (record.type === 'CNAME') {
        try {
          const cnames = await withTimeout(resolver.resolveCname(record.fqdn), 3500);
          const normalizedActual = cnames.map((c) => normalizeDomainInput(c));
          updated.actualValues = normalizedActual;

          if (
            normalizedActual.some(
              (c) =>
                c === normalizeDomainInput(record.value) ||
                c.endsWith('.vercel-dns.com') ||
                c.includes('.vercel-dns-')
            )
          ) {
            updated.status = DnsRecordStatus.VERIFIED;
            updated.actionRequired = 'None — Configured correctly';
            updated.message = 'CNAME record matches expected platform target.';
          } else {
            updated.status = DnsRecordStatus.INCORRECT;
            updated.actionRequired = `Edit CNAME "${record.name}" in ${detectedProviderName} and change value from "${normalizedActual.join(', ')}" to "${record.value}"`;
            updated.message = `Currently points to ${normalizedActual.join(', ')} instead of ${record.value}.`;
            warnings.push(
              `CNAME "${record.name}" currently points to "${normalizedActual.join(', ')}". Update it in ${detectedProviderName} to point to "${record.value}".`
            );
          }
        } catch (err: unknown) {
          const code = (err as NodeJS.ErrnoException)?.code;
          if (code === 'ENODATA' || code === 'ENOTFOUND') {
            try {
              const aRecords = await withTimeout(resolver.resolve4(record.fqdn), 3000);
              if (aRecords.length > 0) {
                updated.actualValues = aRecords;
                const matchesTargetIp = aRecords.some((ip) =>
                  generated.hosting.aRecordIps.includes(ip)
                );
                if (matchesTargetIp) {
                  updated.status = DnsRecordStatus.VERIFIED;
                  updated.actionRequired = 'None — Configured correctly';
                  updated.message =
                    'Verified via flattened CNAME / A record pointing to platform IP.';
                } else {
                  updated.status = DnsRecordStatus.INCORRECT;
                  updated.actionRequired = `Remove A record (${aRecords.join(', ')}) on "${record.name}" and add CNAME pointing to "${record.value}"`;
                  updated.message = `Resolves to IP (${aRecords.join(', ')}) instead of CNAME ${record.value}.`;
                  if (record.required) {
                    warnings.push(
                      `Subdomain "${record.name}" resolves to ${aRecords.join(', ')} instead of "${record.value}".`
                    );
                  }
                }
              } else {
                updated.status = DnsRecordStatus.MISSING;
                updated.actionRequired = `Add CNAME record for "${record.name}" pointing to "${record.value}"`;
                updated.message = 'No CNAME record found.';
                if (record.required) {
                  warnings.push(
                    `Missing CNAME record for "${record.name}" in ${detectedProviderName}. Add Type: CNAME, Name: "${record.name}", Value: "${record.value}".`
                  );
                }
              }
            } catch {
              updated.status = DnsRecordStatus.MISSING;
              updated.actionRequired = `Add CNAME record for "${record.name}" pointing to "${record.value}"`;
              updated.message = 'No CNAME record found yet.';
              if (record.required) {
                warnings.push(
                  `Missing CNAME record for "${record.name}" in ${detectedProviderName}. Add Type: CNAME, Name: "${record.name}", Value: "${record.value}".`
                );
              }
            }
          } else {
            updated.status = DnsRecordStatus.PENDING;
            updated.actionRequired = 'Wait for DNS propagation';
            updated.message = 'DNS lookup timed out or propagation is still in progress.';
          }
        }
      } else if (record.type === 'A') {
        try {
          const ips = await withTimeout(resolver.resolve4(record.fqdn), 3500);
          updated.actualValues = ips;
          const validIps =
            generated.hosting.aRecordIps.length > 0
              ? generated.hosting.aRecordIps
              : [record.value];

          if (ips.some((ip) => validIps.includes(ip))) {
            updated.status = DnsRecordStatus.VERIFIED;
            updated.actionRequired = 'None — Configured correctly';
            updated.message = 'A record points to the expected platform IP.';
          } else {
            updated.status = DnsRecordStatus.INCORRECT;
            const conflictProvider = ips
              .map((ip) => KNOWN_PARKING_OR_BUILDER_IPS[ip])
              .find(Boolean) || null;
            updated.conflictProvider = conflictProvider;
            updated.actionRequired = conflictProvider
              ? `Delete existing A records (${ips.join(', ')} — ${conflictProvider}) on "@" and add A record pointing to "${record.value}"`
              : `Replace existing A record (${ips.join(', ')}) on "@" with "${record.value}"`;
            const providerNote = conflictProvider
              ? ` (currently pointing to ${conflictProvider})`
              : '';
            updated.message = `Points to ${ips.join(', ')}${providerNote} instead of ${record.value}.`;
            warnings.push(
              `Conflicting A record on "@" in ${detectedProviderName}: currently pointing to ${ips.join(', ')}${providerNote}. Delete those A records and add an A record for "@" pointing to "${record.value}".`
            );
          }
        } catch (err: unknown) {
          const code = (err as NodeJS.ErrnoException)?.code;
          if (code === 'ENODATA' || code === 'ENOTFOUND') {
            updated.status = DnsRecordStatus.MISSING;
            updated.actionRequired = `Add A record for "@" pointing to "${record.value}"`;
            updated.message = 'No A record found.';
            warnings.push(
              `Missing A record for "@" in ${detectedProviderName}. Add Type: A, Name: "@", Value: "${record.value}".`
            );
          } else {
            updated.status = DnsRecordStatus.PENDING;
            updated.actionRequired = 'Wait for DNS propagation';
            updated.message = 'DNS lookup timed out or propagation in progress.';
          }
        }
      } else if (record.type === 'TXT') {
        try {
          const txtChunks = await withTimeout(resolver.resolveTxt(record.fqdn), 3500);
          const flattened = txtChunks.map((chunks) => chunks.join(''));
          updated.actualValues = flattened;

          if (flattened.some((val) => val.trim() === record.value.trim())) {
            updated.status = DnsRecordStatus.VERIFIED;
            updated.actionRequired = 'None — Configured correctly';
            updated.message = 'Verification TXT record matched.';
          } else {
            updated.status = DnsRecordStatus.INCORRECT;
            updated.actionRequired = `Update TXT record "${record.name}" to "${record.value}"`;
            updated.message = `Found TXT value "${flattened.join(', ')}" which does not match expected token.`;
          }
        } catch {
          updated.status = DnsRecordStatus.MISSING;
          updated.actionRequired = `Add TXT record for "${record.name}"`;
          updated.message = 'Verification TXT record not added yet.';
        }
      }
    } catch {
      updated.status = DnsRecordStatus.PENDING;
      updated.actionRequired = 'Retry verification';
      updated.message = 'Unable to resolve DNS record at this time.';
    }

    checkedRecords.push(updated);
  }

  const requiredRecords = checkedRecords.filter((r) => r.required);
  const allRequiredVerified = requiredRecords.every((r) => r.status === DnsRecordStatus.VERIFIED);
  const hasIncorrectRequired = requiredRecords.some((r) => r.status === DnsRecordStatus.INCORRECT);

  let overallStatus: DomainStatus = DomainStatus.PENDING;
  let sslStatus: SslStatus = SslStatus.PENDING;
  let verificationError: string | null = null;

  if (allRequiredVerified) {
    overallStatus = DomainStatus.CONNECTED;
    sslStatus = await checkHttpsReachability(params.domainName);
  } else if (hasIncorrectRequired) {
    overallStatus = DomainStatus.FAILED;
    sslStatus = SslStatus.FAILED;
    verificationError = warnings[0] || 'One or more required DNS records have incorrect values.';
  } else {
    overallStatus = DomainStatus.PENDING;
    sslStatus = SslStatus.PENDING;
    verificationError = warnings[0] || 'Required DNS records are missing or still propagating.';
  }

  const nowIso = new Date().toISOString();

  return {
    domainId: params.domainId,
    domainName: params.domainName,
    zoneName: generated.zoneName,
    isApex: generated.isApex,
    status: overallStatus,
    sslStatus,
    detectedRegistrar,
    detectedProviderName,
    nameservers,
    records: checkedRecords,
    warnings,
    lastCheckedAt: nowIso,
    verifiedAt: overallStatus === DomainStatus.CONNECTED ? nowIso : null,
    verificationError,
  };
}
