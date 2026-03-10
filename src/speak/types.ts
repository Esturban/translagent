import type { SupportedLanguage } from '../types';

export interface SpeakOptions {
  text: string;
  language?: SupportedLanguage;
  headers?: Record<string, string>;
}

export interface CacheConfig {
  memoryCache: Map<string, ArrayBuffer>;
  cacheDir: string;
}
