import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

type PageUrlInput = { slug: string; domain?: { domainName: string } | null };

/** Public URL of a landing page. Domain-mapped pages use their own domain; legacy pages stay on /p/<slug>. */
export function getLandingPageUrl(page: PageUrlInput): string {
  if (page.domain?.domainName) return `https://${page.domain.domainName}/${page.slug}`;
  return `/p/${page.slug}`;
}

/** Short human-readable form for tables, e.g. "go.client.com/offer" or "/p/offer". */
export function getLandingPageDisplayUrl(page: PageUrlInput): string {
  if (page.domain?.domainName) return `${page.domain.domainName}/${page.slug}`;
  return `/p/${page.slug}`;
}

export function buildWhatsAppUrl(phone: string, message?: string | null): string {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!message) {
    return `https://wa.me/${cleanPhone}`;
  }
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
