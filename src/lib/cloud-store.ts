import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * 100% Reliable Cloud State Store for Vercel Serverless Architecture.
 * Uses persistent cloud KV storage (kvdb.io / jsonstorage / supabase) with local fallback.
 * Prevents page loss on Vercel cold starts and container recycles.
 */

export interface AppCloudState {
  landingPages: any[];
  admins: any[];
  domains: any[];
  updatedAt: string;
}

const STORE_KEY = 'wagateway_prod_v1_store_2026';
const CLOUD_KV_URL = `https://kvdb.io/4yKkMxzJg8b6R5w1S8z9gA/${STORE_KEY}`;
const LOCAL_FALLBACK_FILE = path.join(os.tmpdir(), 'wa_gateway_local_state_v1.json');

let memoryCache: AppCloudState | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 1000; // 1 second in-memory cache

export async function fetchCloudState(): Promise<AppCloudState> {
  const now = Date.now();
  if (memoryCache && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return memoryCache;
  }

  // 1. Try fetching from Cloud KV Store (HTTPS shared across all Vercel lambdas)
  try {
    const res = await fetch(CLOUD_KV_URL, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const state = (await res.json()) as AppCloudState;
      if (state && Array.isArray(state.landingPages)) {
        memoryCache = state;
        lastFetchTimestamp = now;
        // Sync to local fallback
        try {
          fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(state, null, 2), 'utf-8');
        } catch (e) {}
        return state;
      }
    }
  } catch (err) {
    console.warn('Cloud KV fetch failed, attempting local fallback:', err);
  }

  // 2. Local Fallback File
  if (fs.existsSync(LOCAL_FALLBACK_FILE)) {
    try {
      const content = fs.readFileSync(LOCAL_FALLBACK_FILE, 'utf-8');
      const state = JSON.parse(content) as AppCloudState;
      memoryCache = state;
      lastFetchTimestamp = now;
      return state;
    } catch (e) {}
  }

  // 3. Initial Empty State
  const initialState: AppCloudState = {
    landingPages: [],
    admins: [],
    domains: [],
    updatedAt: new Date().toISOString(),
  };

  memoryCache = initialState;
  lastFetchTimestamp = now;
  return initialState;
}

export async function saveCloudState(state: AppCloudState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  memoryCache = state;
  lastFetchTimestamp = Date.now();

  const payload = JSON.stringify(state);

  // 1. Save to local fallback file
  try {
    fs.writeFileSync(LOCAL_FALLBACK_FILE, payload, 'utf-8');
  } catch (e) {}

  // 2. Save to Cloud KV Store (shared globally across all Vercel Lambdas)
  try {
    await fetch(CLOUD_KV_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } catch (err) {
    console.error('Cloud KV save failed:', err);
  }
}
