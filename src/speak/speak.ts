import OpenAI from 'openai';
import { SpeakOptions } from './types';
import { generateHash, getFromCache, saveToCache } from './cache';

/**
 * Generates speech from text using OpenAI's API with caching support
 */
export async function speak(
  options: SpeakOptions,
  openai: OpenAI
): Promise<{ buffer: ArrayBuffer; headers: Record<string, string> }> {
  const { text, language = "ar", headers = {} } = options;
  
  if (!text) {
    throw new Error("Missing 'text' field");
  }
  
  // Determine voice based on language
  const voice = language === "ar" ? "onyx" : "nova";
  
  // Generate hash for cache lookup
  const hash = generateHash(text, voice, language);
  
  // Try to get from cache first
  const cachedBuffer = await getFromCache(hash);
  
  if (cachedBuffer) {
    return {
      buffer: cachedBuffer,
      headers: { 
        ...headers, 
        "Content-Type": "audio/mpeg",
        "Cache-Control": "max-age=31536000" // Cache for 1 year in the browser
      }
    };
  }
  
  // If not in cache, generate from API
  console.log('Generating new audio from API');
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
  });
  
  // Convert the response to an ArrayBuffer
  const buffer = await mp3.arrayBuffer();
  
  // Cache the audio
  saveToCache(hash, buffer);
  
  // Return the audio buffer with appropriate headers
  return {
    buffer,
    headers: { 
      ...headers, 
      "Content-Type": "audio/mpeg",
      "Cache-Control": "max-age=31536000" // Cache for 1 year in the browser
    }
  };
}

/**
 * Error handler for the speak endpoint
 */
export function handleSpeakError(error: Error, headers: Record<string, string> = {}): Response {
  console.error("Speech synthesis error:", error);
  
  return new Response(
    JSON.stringify({ error: "Failed to generate speech", message: error.message }),
    { 
      status: 500, 
      headers: { ...headers, "Content-Type": "application/json" }
    }
  );
}