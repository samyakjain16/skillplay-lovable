
// Shared caching utilities for prize distribution

// In-memory cache settings
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generic cache implementation for data models
export class ModelCache<T> {
  private cache: Map<string, T> | null = null;
  private lastUpdate = 0;

  isValid(): boolean {
    const now = Date.now();
    return !!this.cache && (now - this.lastUpdate) < CACHE_DURATION;
  }

  getCache(): Map<string, T> | null {
    return this.cache;
  }

  setCache(data: Map<string, T>): void {
    this.cache = data;
    this.lastUpdate = Date.now();
  }

  clear(): void {
    this.cache = null;
    this.lastUpdate = 0;
  }
}
