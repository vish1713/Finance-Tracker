import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  /** Deletes every cache entry whose key starts with `prefix` (used to invalidate a user's analytics cache on write). */
  async delByPrefix(prefix: string): Promise<void> {
    const store = this.cache.store as unknown as { keys?: (pattern: string) => Promise<string[]> };
    if (typeof store.keys !== 'function') return;
    const keys = await store.keys(`${prefix}*`);
    await Promise.all(keys.map((key) => this.cache.del(key)));
  }
}
