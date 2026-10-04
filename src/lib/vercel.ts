const VERCEL_API_URL = 'https://api.vercel.com';

export async function addDomainToVercel(domain: string) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_ACCESS_TOKEN;

  if (!projectId || !token) {
    console.warn('Vercel API credentials not found. Skipping Vercel domain registration.');
    return { success: true, warning: 'Credentials missing' };
  }

  try {
    const response = await fetch(`${VERCEL_API_URL}/v10/projects/${projectId}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error?.code === 'domain_already_in_use' || data.error?.code === 'forbidden') {
        // If it's already added, we can consider it a success
        return { success: true };
      }
      throw new Error(data.error?.message || 'Failed to add domain to Vercel');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Vercel Add Domain Error:', error);
    return { success: false, error: error.message };
  }
}

export async function removeDomainFromVercel(domain: string) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_ACCESS_TOKEN;

  if (!projectId || !token) {
    return { success: true };
  }

  try {
    const response = await fetch(`${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to remove domain from Vercel');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Vercel Remove Domain Error:', error);
    return { success: false, error: error.message };
  }
}
