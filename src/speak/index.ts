export { speak, handleSpeakError } from './speak';
export { 
  audioCache, 
  CACHE_DIR, 
  cleanupCache, 
  generateHash, 
  getFromCache, 
  saveToCache 
} from './cache';
export type { SpeakOptions, CacheConfig } from './types';