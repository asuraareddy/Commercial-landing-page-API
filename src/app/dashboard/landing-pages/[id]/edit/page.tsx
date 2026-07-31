import { getLandingPageByIdAction } from '@/actions/landing-page.actions';
import { LandingPageForm } from '@/components/landing/landing-page-form';
import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLandingPage({ params }: EditPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const page = await getLandingPageByIdAction(id);

  if (!page) {
    notFound();
  }

  return <LandingPageForm initialData={page} isEdit={true} />;
}
