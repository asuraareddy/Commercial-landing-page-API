import { getWorkspaceSettingsAction } from '@/actions/workspace.actions';
import { LandingPageForm } from '@/components/landing/landing-page-form';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NewLandingPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const workspace = await getWorkspaceSettingsAction();

  const initialDefaults = {
    companyName: workspace?.name || '',
    logoUrl: workspace?.logoUrl || '',
    whatsappNumber: workspace?.defaultWhatsapp || '',
    prefilledMessage: workspace?.defaultMessage || '',
    metaPixelId: workspace?.defaultPixelId || '',
    buttonText: 'Continue to WhatsApp',
    status: 'ACTIVE',
  };

  return <LandingPageForm initialData={initialDefaults} isEdit={false} />;
}
