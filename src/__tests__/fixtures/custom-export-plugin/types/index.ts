export interface CacheConfig {
  ttl: number;
  strategy: 'memory' | 'redis';
}

export interface CacheEntry {
  key: string;
  value: unknown;
  expiresAt: Date;
}
