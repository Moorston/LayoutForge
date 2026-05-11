/**
 * In-memory response cache for non-streaming AI completions.
 */
import { createHash } from "node:crypto";

export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const CACHE_MAX_SIZE = 50;

interface CacheEntry {
  body: string;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();

export function hasImageUrlInBody(body: Record<string, unknown>): boolean {
  return JSON.stringify(body).includes('"image_url"');
}

export function getCacheKey(body: Record<string, unknown>): string {
  const keyObj = { model: body.model, messages: body.messages };
  return createHash("sha256").update(JSON.stringify(keyObj)).digest("hex");
}

export function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
  while (responseCache.size > CACHE_MAX_SIZE) {
    const firstKey = responseCache.keys().next().value as string | undefined;
    if (firstKey === undefined) break;
    responseCache.delete(firstKey);
  }
}

export function getCachedResponse(cacheKey: string): string | null {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.body;
  }
  return null;
}

export function setCachedResponse(cacheKey: string, body: string): void {
  pruneCache();
  responseCache.set(cacheKey, { body, timestamp: Date.now() });
}
