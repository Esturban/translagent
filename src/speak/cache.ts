import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CacheConfig } from './types';

// Export the audio cache to be used across the application
export const audioCache = new Map<string, ArrayBuffer>();
export const CACHE_DIR = path.join(process.cwd(), 'cache', 'audio');

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Generates a hash for the given text and voice parameters
 */
export function generateHash(text: string, voice: string, language: string): string {
  return crypto.createHash('md5').update(`${text}-${voice}-${language}`).digest('hex');
}

/**
 * Retrieves audio from cache (memory or disk)
 */
export async function getFromCache(hash: string): Promise<ArrayBuffer | null> {
  const cacheFilePath = path.join(CACHE_DIR, `${hash}.mp3`);
  
  // Check memory cache first
  if (audioCache.has(hash)) {
    return audioCache.get(hash)!;
  }
  
  // Then check disk cache
  if (fs.existsSync(cacheFilePath)) {
    const fileData = fs.readFileSync(cacheFilePath);
    const buffer = fileData.buffer.slice(
      fileData.byteOffset, 
      fileData.byteOffset + fileData.byteLength
    );
    
    // Store in memory for faster access next time
    audioCache.set(hash, buffer);
    return buffer;
  }
  
  return null;
}

/**
 * Saves audio to cache (both memory and disk)
 */
export function saveToCache(hash: string, buffer: ArrayBuffer): void {
  const cacheFilePath = path.join(CACHE_DIR, `${hash}.mp3`);
  
  // Cache in memory
  audioCache.set(hash, buffer);
  
  // Cache on disk
  fs.writeFileSync(cacheFilePath, Buffer.from(buffer));
}

/**
 * Cleans up old cache files
 */
export function cleanupCache(maxAgeMs = 7 * 24 * 60 * 60 * 1000): void {
  try {
    console.log('Running cache cleanup...');
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    console.log(`Cache cleanup complete. Deleted ${deletedCount} files.`);
  } catch (err) {
    console.error('Cache cleanup error:', err);
  }
}