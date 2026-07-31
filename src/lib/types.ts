export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DomainStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  VERIFIED: 'VERIFIED',
} as const;

export type DomainStatus = (typeof DomainStatus)[keyof typeof DomainStatus];

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
} as const;

export type PageStatus = (typeof PageStatus)[keyof typeof PageStatus];
