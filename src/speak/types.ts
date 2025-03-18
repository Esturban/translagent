export interface SpeakOptions {
  text: string;
  language?: string;
  headers?: Record<string, string>;
}

export interface CacheConfig {
  memoryCache: Map<string, ArrayBuffer>;
  cacheDir: string;
}