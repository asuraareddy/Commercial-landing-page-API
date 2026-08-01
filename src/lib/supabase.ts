import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Support both the new "publishable key" format and the classic "anon key" format
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'wa-media';

const isConfigured = supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseAnonKey;

// Warn in server logs when service role key is missing (server-side only)
if (typeof window === 'undefined' && isConfigured && !supabaseServiceKey) {
  console.warn(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Server-side uploads will fall back to the anon key. ' +
    'Set this in Vercel → Project → Settings → Environment Variables.'
  );
}

// Browser-side client (uses anon/publishable key)
export const supabaseBrowser = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side client (uses service role key for trusted writes, falls back to anon key)
export const supabaseServer = isConfigured
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;


/**
 * Upload a file to Supabase Storage and return the public CDN URL.
 *
 * Priority:
 * 1. Supabase Storage (if configured) → permanent public CDN URL
 * 2. Local /api/upload endpoint → /uploads/<filename> (development only)
 *
 * Never returns base64 data URLs in production.
 */
export async function uploadToSupabaseStorage(
  fileBuffer: Buffer | ArrayBuffer,
  fileName: string,
  contentType: string,
  folder: 'logos' | 'media' | 'favicons' = 'media'
): Promise<string> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const filePath = `${folder}/${timestamp}_${randomSuffix}_${baseName}${ext}`;

  // --- 1. Supabase Storage ---
  const client = supabaseServer || supabaseBrowser;
  if (client) {
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, new Blob([fileBuffer as BlobPart], { type: contentType || 'application/octet-stream' }), {
        contentType: contentType || 'application/octet-stream',
        upsert: true,
      });

    if (!error) {
      const { data: urlData } = client.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      return `${urlData.publicUrl}?v=${timestamp}`;
    }

    console.error('Supabase Storage upload error:', error.message);
    throw new Error(`Supabase Storage upload failed: ${error.message}. Please check your storage bucket configuration.`);
  }

  // --- 2. Local dev fallback: /api/upload ---
  if (process.env.NODE_ENV === 'development') {
    const formData = new FormData();
    const blob = new Blob([fileBuffer as unknown as ArrayBuffer], { type: contentType });
    formData.append('file', blob, fileName);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/upload`, { method: 'POST', body: formData });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  }

  throw new Error(
    'File storage is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}
