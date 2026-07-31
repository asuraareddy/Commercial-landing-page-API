import { supabase, BUCKET_NAME } from './supabase';
import { db } from './db';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CloudDbState {
  landingPages: any[];
  users: any[];
  domains: any[];
  updatedAt: string;
}

const DB_FILE_KEY = 'system_db_state.json';
const LOCAL_FALLBACK_PATH = path.join(os.tmpdir(), 'wa_gateway_cloud_state.json');

// Memory Cache with short TTL for maximum performance
let memoryStateCache: CloudDbState | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2000; // 2 seconds TTL

/**
 * Fetch global persistent cloud state shared across all Vercel Lambdas.
 */
export async function getCloudDb(): Promise<CloudDbState> {
  const now = Date.now();

  if (memoryStateCache && now - lastFetchTime < CACHE_TTL_MS) {
    return memoryStateCache;
  }

  // 1. Attempt to fetch from Supabase Storage (Cloud persistent storage)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(DB_FILE_KEY);

      if (data && !error) {
        const text = await data.text();
        const state = JSON.parse(text) as CloudDbState;
        memoryStateCache = state;
        lastFetchTime = now;
        return state;
      }
    }
  } catch (err) {
    console.warn('Could not fetch cloud state from Supabase storage, trying local fallback:', err);
  }

  // 2. Local File System Fallback
  if (fs.existsSync(LOCAL_FALLBACK_PATH)) {
    try {
      const content = fs.readFileSync(LOCAL_FALLBACK_PATH, 'utf-8');
      const state = JSON.parse(content) as CloudDbState;
      memoryStateCache = state;
      lastFetchTime = now;
      return state;
    } catch (e) {
      console.error('Failed to parse local fallback cloud state:', e);
    }
  }

  // 3. Initial Seed Fallback from Prisma DB
  let initialPages: any[] = [];
  try {
    initialPages = await db.landingPage.findMany({ orderBy: { createdAt: 'desc' } });
  } catch (e) {
    initialPages = [];
  }

  const initialState: CloudDbState = {
    landingPages: initialPages,
    users: [],
    domains: [],
    updatedAt: new Date().toISOString(),
  };

  memoryStateCache = initialState;
  lastFetchTime = now;
  await saveCloudDb(initialState);
  return initialState;
}

/**
 * Save global persistent cloud state across all Vercel Lambdas.
 */
export async function saveCloudDb(state: CloudDbState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  memoryStateCache = state;
  lastFetchTime = Date.now();

  const jsonString = JSON.stringify(state, null, 2);

  // 1. Write to local fallback
  try {
    fs.writeFileSync(LOCAL_FALLBACK_PATH, jsonString, 'utf-8');
  } catch (e) {
    console.error('Failed to write local fallback cloud state:', e);
  }

  // 2. Upload to Supabase Storage (Cloud persistent storage)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const blob = new Blob([jsonString], { type: 'application/json' });
      await supabase.storage
        .from(BUCKET_NAME)
        .upload(DB_FILE_KEY, blob, {
          contentType: 'application/json',
          upsert: true,
        });
    }
  } catch (err) {
    console.error('Failed to upload cloud state to Supabase storage:', err);
  }
}
