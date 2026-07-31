import fs from 'fs';
import path from 'path';
import os from 'os';

interface DynamicStore {
  deletedPageIds: string[];
  createdLandingPages: any[];
  updatedLandingPages: Record<string, any>;
}

const globalStore = globalThis as unknown as {
  waDynamicStore: DynamicStore | undefined;
};

function getStoreFilePath(): string {
  return path.join(os.tmpdir(), 'wa_gateway_dynamic_store.json');
}

export function getDynamicStore(): DynamicStore {
  if (globalStore.waDynamicStore) {
    return globalStore.waDynamicStore;
  }

  const filePath = getStoreFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      globalStore.waDynamicStore = {
        deletedPageIds: Array.isArray(data.deletedPageIds) ? data.deletedPageIds : [],
        createdLandingPages: Array.isArray(data.createdLandingPages) ? data.createdLandingPages : [],
        updatedLandingPages: data.updatedLandingPages || {},
      };
      return globalStore.waDynamicStore;
    } catch (err) {
      console.error('Error reading dynamic store:', err);
    }
  }

  globalStore.waDynamicStore = {
    deletedPageIds: [],
    createdLandingPages: [],
    updatedLandingPages: {},
  };

  return globalStore.waDynamicStore;
}

export function saveDynamicStore(store: DynamicStore) {
  globalStore.waDynamicStore = store;
  try {
    fs.writeFileSync(getStoreFilePath(), JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving dynamic store:', err);
  }
}

export function markPageDeleted(id: string) {
  const store = getDynamicStore();
  if (!store.deletedPageIds.includes(id)) {
    store.deletedPageIds.push(id);
  }
  store.createdLandingPages = store.createdLandingPages.filter((p) => p.id !== id);
  delete store.updatedLandingPages[id];
  saveDynamicStore(store);
}

export function recordPageCreated(page: any) {
  const store = getDynamicStore();
  store.createdLandingPages = store.createdLandingPages.filter((p) => p.id !== page.id);
  store.createdLandingPages.unshift(page);
  store.deletedPageIds = store.deletedPageIds.filter((id) => id !== page.id);
  saveDynamicStore(store);
}

export function recordPageUpdated(page: any) {
  const store = getDynamicStore();
  store.updatedLandingPages[page.id] = page;
  const idx = store.createdLandingPages.findIndex((p) => p.id === page.id);
  if (idx !== -1) {
    store.createdLandingPages[idx] = page;
  }
  saveDynamicStore(store);
}
