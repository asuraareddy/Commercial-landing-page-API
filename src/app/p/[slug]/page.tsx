import { getPublicLandingPageBySlug } from '@/actions/landing-page.actions';
import { LandingPageTemplate } from '@/components/landing/landing-page-template';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicLandingPageBySlug(slug);

  if (!page) {
    return {
      title: 'Page Not Found - WA Gateway',
    };
  }

  return {
    title: `${page.companyName} - Connect on WhatsApp`,
    description: `Click below to continue your conversation with ${page.companyName} on WhatsApp.`,
    openGraph: {
      title: `${page.companyName} on WhatsApp`,
      description: `Connect directly with ${page.companyName} via WhatsApp.`,
      images: page.mediaUrl ? [{ url: page.mediaUrl }] : [],
    },
  };
}

export default async function PublicLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPublicLandingPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return <LandingPageTemplate data={page} isPreview={false} />;
}
