import { prisma } from './db';
import { CACHE_TTL_MS, EMPTY_CACHE_TTL_MS } from './constants';

// ---------------------------------------------------------------------------
// Shared cache layer for all external API calls (football-data.org + Odds API).
//
// Three layers, checked in order:
//   1. In-memory Map (fastest; per-process, cleared on restart)
//   2. ApiCache DB table (persistent; survives restarts/redeploys)
//   3. The external API (only hit at most once a day per key)
//
// Good responses are cached for CACHE_TTL_MS (24h = once a day). Empty/failed
// responses use EMPTY_CACHE_TTL_MS (1h) so they recover sooner.
// ---------------------------------------------------------------------------

interface MemEntry {
  data: any;
  expiresAt: number;
}

const memoryCache = new Map<string, MemEntry>();

function getMem(key: string): any | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setMem(key: string, data: any, ttlMs: number): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function getDb(key: string): Promise<any | null> {
  try {
    const row = await prisma.apiCache.findUnique({ where: { key } });
    if (!row) return null;
    if (new Date() > row.expiresAt) return null;
    return row.data;
  } catch (err: any) {
    console.warn('ApiCache DB read failed:', err?.message);
    return null;
  }
}

async function setDb(key: string, data: any, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  const payload = data ?? [];
  try {
    await prisma.apiCache.upsert({
      where: { key },
      update: { data: payload, expiresAt },
      create: { key, data: payload, expiresAt },
    });
  } catch (err: any) {
    console.warn('ApiCache DB write failed:', err?.message);
  }
}

// Consider a response "empty" (worth retrying sooner) when it carries no data.
export function isEmptyData(data: any): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  // Standings result shape: { standings: [...] }
  if (Array.isArray(data?.standings)) return data.standings.length === 0;
  return false;
}

// Fetch-through cache: returns cached value if fresh (memory → DB), otherwise
// runs the fetcher and writes the result to both memory and DB.
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const mem = getMem(key);
  if (mem !== null) return mem as T;

  const db = await getDb(key);
  if (db !== null) {
    // Re-hydrate in-memory cache. Use the shorter TTL for empty data.
    const ttl = isEmptyData(db) ? EMPTY_CACHE_TTL_MS : CACHE_TTL_MS;
    setMem(key, db, ttl);
    return db as T;
  }

  const fresh = await fetcher();
  const ttl = isEmptyData(fresh) ? EMPTY_CACHE_TTL_MS : CACHE_TTL_MS;
  setMem(key, fresh, ttl);
  await setDb(key, fresh, ttl);
  return fresh;
}
