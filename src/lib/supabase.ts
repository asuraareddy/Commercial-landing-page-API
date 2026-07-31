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
 * Upload file buffer or ArrayBuffer to Supabase Storage with cache-busting timestamp.
 */
export async function uploadMediaToSupabase(
  fileBuffer: Buffer | ArrayBuffer,
  fileName: string,
  contentType: string,
  folder: 'logos' | 'media' | 'favicons' = 'media'
): Promise<string> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);

  // Extract extension
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${folder}/${folder.slice(0, -1)}_${timestamp}_${randomSuffix}_${baseName}${ext}`;

  // If Supabase environment is not configured, convert buffer to Data URL fallback
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    const base64 = Buffer.from(fileBuffer as any).toString('base64');
    const mime = contentType || (fileName.endsWith('.mp4') ? 'video/mp4' : 'image/png');
    return `data:${mime};base64,${base64}`;
  }

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: true,
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    throw new Error(`Failed to upload media: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  // Append timestamp query parameter to bust browser cache
  return `${publicUrlData.publicUrl}?v=${timestamp}`;
}
