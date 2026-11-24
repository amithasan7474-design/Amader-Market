import type {
  AdminActionRequest,
  HouseItem,
  OrderItem,
  PartnerRequest,
  SiteSettings,
  StoreRequest,
  UserProfile,
  WithdrawalItem,
} from '../types/marketplace';

const DB_NAME = 'amader_market_offline_v1';
const DB_VERSION = 1;
const STORE_NAME = 'kv_cache';
const IMAGE_CACHE_NAME = 'amader-product-images';

export interface CachedMarketplaceSnapshot {
  siteSettings?: SiteSettings;
  houses?: HouseItem[];
  orders?: OrderItem[];
  users?: UserProfile[];
  withdrawals?: WithdrawalItem[];
  storeRequests?: StoreRequest[];
  partnerRequests?: PartnerRequest[];
  adminActionRequests?: AdminActionRequest[];
  lastSyncAt?: number;
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(`am_cache_${key}`, JSON.stringify(value));
    } catch {
      // Storage quota full
    }
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIDB();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(`am_cache_${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
}

export async function loadFullCacheSnapshot(): Promise<CachedMarketplaceSnapshot> {
  const [
    siteSettings,
    houses,
    orders,
    users,
    withdrawals,
    storeRequests,
    partnerRequests,
    adminActionRequests,
    lastSyncAt,
  ] = await Promise.all([
    cacheGet<SiteSettings>('siteSettings'),
    cacheGet<HouseItem[]>('houses'),
    cacheGet<OrderItem[]>('orders'),
    cacheGet<UserProfile[]>('users'),
    cacheGet<WithdrawalItem[]>('withdrawals'),
    cacheGet<StoreRequest[]>('storeRequests'),
    cacheGet<PartnerRequest[]>('partnerRequests'),
    cacheGet<AdminActionRequest[]>('adminActionRequests'),
    cacheGet<number>('lastSyncAt'),
  ]);

  return {
    siteSettings: siteSettings ?? undefined,
    houses: houses ?? undefined,
    orders: orders ?? undefined,
    users: users ?? undefined,
    withdrawals: withdrawals ?? undefined,
    storeRequests: storeRequests ?? undefined,
    partnerRequests: partnerRequests ?? undefined,
    adminActionRequests: adminActionRequests ?? undefined,
    lastSyncAt: lastSyncAt ?? undefined,
  };
}

export async function clearOfflineCache(): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
  try {
    if ('caches' in window) {
      await caches.delete(IMAGE_CACHE_NAME);
    }
  } catch {
    // ignore
  }
}

/**
 * Pre-warms product and banner images in Cache Storage silently so they load
 * instantaneously on subsequent views and remain visible offline.
 */
export async function prewarmImageCache(urls: string[], limit = 40): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window) || !navigator.onLine) {
    return 0;
  }
  const uniqueUrls = Array.from(
    new Set(
      urls.filter(
        (u) =>
          typeof u === 'string' &&
          u.startsWith('http') &&
          !u.includes('via.placeholder.com')
      )
    )
  ).slice(0, limit);

  let cachedCount = 0;
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const batchSize = 5;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const existing = await cache.match(url);
            if (existing) {
              cachedCount++;
              return;
            }
            const res = await fetch(url, { mode: 'no-cors' });
            if (res) {
              await cache.put(url, res);
              cachedCount++;
            }
          } catch {
            // Skip unreachable cross-origin image
          }
        })
      );
    }
  } catch {
    // Cache Storage unavailable
  }
  return cachedCount;
}

export async function getCachedImageCount(): Promise<number> {
  try {
    if (typeof window === 'undefined' || !('caches' in window)) return 0;
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch {
    return 0;
  }
}
