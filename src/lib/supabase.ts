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
 * Upload file buffer or File object to Supabase Storage and return public URL.
 */
export async function uploadMediaToSupabase(
  fileBuffer: Buffer | ArrayBuffer,
  fileName: string,
  contentType: string,
  folder: 'logos' | 'media' | 'favicons' = 'media'
): Promise<string> {
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    // Return mock placeholder URL for local development/test if Supabase keys not configured
    const isVideo = contentType.includes('video');
    if (isVideo) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    }
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80`;
  }

  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

  // Ensure bucket exists or handle upload
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    throw new Error(`Failed to upload media to storage: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
