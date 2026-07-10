/**
 * Cache layer for storing rendered SVGs and API responses.
 *
 * Architecture:
 * - In-memory cache for development / single-instance deployment
 * - Redis-compatible interface for distributed deployments (Upstash, etc.)
 * - Cache keys follow the format: `graph:{org}:{theme}:{year}`
 */

export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  ttl: number; // milliseconds
}

/**
 * Default TTL: 15 minutes.
 */
const DEFAULT_TTL = 15 * 60 * 1000;

/**
 * Abstract cache interface for swappable backends.
 */
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/**
 * In-memory cache implementation.
 * Suitable for single-instance deployments and development.
 */
export class MemoryCache implements ICache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private defaultTtl: number = DEFAULT_TTL) {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.createdAt > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.store.set(key, {
      data: value,
      createdAt: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    // Simple glob-style pattern matching for in-memory
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() - entry.createdAt > entry.ttl) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache stats.
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.createdAt > entry.ttl) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clean up the cleanup interval.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Build a cache key for a contribution graph.
 */
export function buildGraphCacheKey(params: {
  org: string;
  theme: string;
  year: number;
  fromYear?: number;
  repo?: string;
}): string {
  const parts = ["graph", params.org, params.theme, String(params.year)];
  if (params.fromYear !== undefined) parts.push(`from${params.fromYear}`);
  if (params.repo) parts.push(params.repo);
  return parts.join(":");
}

/**
 * Build a cache key for stats.
 */
export function buildStatsCacheKey(params: {
  org: string;
  year: number;
}): string {
  return `stats:${params.org}:${params.year}`;
}
