import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);

export const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'wa-media';

/**
 * Upload file buffer or ArrayBuffer to persistent storage (Supabase Storage or local /api/upload).
 */
export async function uploadMediaToSupabase(
  fileBuffer: Buffer | ArrayBuffer,
  fileName: string,
  contentType: string,
  folder: 'logos' | 'media' | 'favicons' = 'media'
): Promise<string> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);

  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${folder}/${folder.slice(0, -1)}_${timestamp}_${randomSuffix}_${baseName}${ext}`;

  // 1. If Supabase environment is validly configured
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: contentType || 'application/octet-stream',
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        return `${publicUrlData.publicUrl}?v=${timestamp}`;
      }
    } catch (err) {
      console.warn('Supabase storage error, attempting local API upload:', err);
    }
  }

  // 2. Local Persistent File Upload via /api/upload Endpoint
  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: contentType || 'application/octet-stream' });
    formData.append('file', blob, fileName);

    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn('Local API upload fallback failed:', err);
  }

  // 3. Fallback Data URL
  const base64 = Buffer.from(fileBuffer as any).toString('base64');
  const mime = contentType || 'image/png';
  return `data:${mime};base64,${base64}`;
}
