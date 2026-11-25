export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DomainStatus = {
  PENDING: 'PENDING',
  CONNECTED: 'CONNECTED',
  FAILED: 'FAILED',
  ACTIVE: 'ACTIVE',
  VERIFIED: 'VERIFIED',
} as const;

export type DomainStatus = (typeof DomainStatus)[keyof typeof DomainStatus];

export const SslStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  FAILED: 'FAILED',
} as const;

export type SslStatus = (typeof SslStatus)[keyof typeof SslStatus];

export const DnsRecordStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  MISSING: 'MISSING',
  INCORRECT: 'INCORRECT',
} as const;

export type DnsRecordStatus = (typeof DnsRecordStatus)[keyof typeof DnsRecordStatus];

export type DnsRecordType = 'CNAME' | 'A' | 'TXT' | 'MX';

export interface DnsRecordCheck {
  id: string;
  type: DnsRecordType;
  name: string;
  fqdn: string;
  value: string;
  ttl: string;
  priority?: number;
  purpose: string;
  category: 'ROUTING' | 'VERIFICATION' | 'SSL' | 'EMAIL';
  required: boolean;
  status: DnsRecordStatus;
  actualValues?: string[];
  conflictProvider?: string | null;
  actionRequired?: string;
  message?: string;
}

export interface DomainDnsSummary {
  domainId: string;
  domainName: string;
  zoneName: string;
  isApex: boolean;
  status: DomainStatus;
  sslStatus: SslStatus;
  detectedRegistrar?: 'godaddy' | 'cloudflare' | 'namecheap' | 'other';
  detectedProviderName?: string;
  nameservers?: string[];
  records: DnsRecordCheck[];
  warnings: string[];
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  verificationError: string | null;
}

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const MediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export const PageStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type PageStatus = (typeof PageStatus)[keyof typeof PageStatus];
