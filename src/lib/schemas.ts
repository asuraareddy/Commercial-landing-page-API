import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createAdminSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  workspaceName: z.string().min(2, 'Workspace name is required'),
});

export const updateAdminSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().optional().or(z.literal('')),
  isSuspended: z.boolean().optional(),
});

export const workspaceSettingsSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  primaryColor: z.string().default('#0f172a'),
  buttonColor: z.string().default('#25D366'),
  supportEmail: z.string().email().optional().or(z.literal('')),
  defaultWhatsapp: z.string().min(6, 'Default WhatsApp number is required'),
  defaultPixelId: z.string().optional().or(z.literal('')),
  defaultMessage: z.string().optional().or(z.literal('')),
});

export const landingPageSchema = z.object({
  name: z.string().min(2, 'Page name is required'),
  slug: z.string().min(2, 'URL Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  companyName: z.string().min(2, 'Company name is required'),
  logoUrl: z.string().optional().or(z.literal('')),
  mediaUrl: z.string().optional().or(z.literal('')),
  mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  mediaWidth: z.string().default('100%'),
  mediaHeight: z.string().default('260px'),
  borderRadius: z.string().default('16px'),
  shadow: z.string().default('lg'),
  objectFit: z.string().default('cover'),
  mediaPosition: z.string().default('center'),
  whatsappNumber: z.string().min(6, 'WhatsApp number is required'),
  prefilledMessage: z.string().optional().or(z.literal('')),
  buttonText: z.string().default('Continue to WhatsApp'),
  metaPixelId: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const domainSchema = z.object({
  domainName: z
    .string()
    .min(3, 'Domain name is required')
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i, 'Invalid domain format (e.g. go.client.com)'),
  isPrimary: z.boolean().default(false),
});

export const subscriptionSchema = z.object({
  planName: z.string().default('Unlimited'),
  price: z.number().default(500),
  billingType: z.string().default('One Time'),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).default('ACTIVE'),
  expiryDate: z.string().optional(),
});
