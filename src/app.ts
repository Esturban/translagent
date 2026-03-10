import { serve } from "bun";
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import { translateText, transliterateText } from './translation';
import { getRateLimitWindowSeconds, isRateLimited } from './utils/rate-limiter';
import { 
  speak, 
  handleSpeakError, 
  cleanupCache 
} from './speak';
import { isSupportedLanguage, MAX_TEXT_LENGTH, type SupportedLanguage } from './types';


// Run cleanup periodically (every 24 hours)
const cleanupInterval = setInterval(() => cleanupCache(), 24 * 60 * 60 * 1000);

// Handle shutdown signals for graceful cleanup
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

function handleShutdown() {
  
  // Clear the cleanup interval
  clearInterval(cleanupInterval);
  
  // Run a final cache cleanup with shorter retention (keep recent files)
  cleanupCache(60 * 60 * 1000); // Keep files from the last hour
  
  console.log('Cleanup complete. Shutting down.');
  process.exit(0);
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const port = Number(process.env.PORT || 3001);

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...extraHeaders,
      "Content-Type": "application/json"
    }
  });
}

function jsonError(
  code: string,
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {}
) {
  return jsonResponse({ error: { code, message } }, status, extraHeaders);
}

async function parseJsonBody(req: Request, headers: Record<string, string>) {
  try {
    return await req.json();
  } catch {
    return jsonError("invalid_json", "Request body must be valid JSON.", 400, headers);
  }
}

function validateTranslateRequest(
  body: unknown,
  headers: Record<string, string>
): { text: string; language: SupportedLanguage } | Response {
  if (!body || typeof body !== "object") {
    return jsonError("invalid_json", "Request body must be a JSON object.", 400, headers);
  }

  const payload = body as { text?: unknown; language?: unknown };
  const rawText = typeof payload.text === "string" ? payload.text.trim() : "";
  const language = typeof payload.language === "string" ? payload.language : "ar";

  if (!rawText) {
    return jsonError("missing_text", "The 'text' field is required.", 400, headers);
  }

  if (rawText.length > MAX_TEXT_LENGTH) {
    return jsonError(
      "text_too_long",
      `The 'text' field must be ${MAX_TEXT_LENGTH} characters or fewer.`,
      413,
      headers
    );
  }

  if (!isSupportedLanguage(language)) {
    return jsonError("unsupported_language", "Supported languages are 'ar' and 'zh'.", 400, headers);
  }

  return { text: rawText, language };
}

// Create a server that serves both the API and static HTML
serve({
  port,
  async fetch(req: Request) {
    const url = new URL(req.url);
    console.log(`${req.method} ${url.pathname}`);
    
    // Add CORS headers to all responses
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    
    // Get client IP for rate limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (req.method === "GET" && url.pathname === "/healthz") {
      return jsonResponse({ ok: true }, 200, headers);
    }
    
    // Serve the HTML page for GET requests to "/"
    if (req.method === "GET" && url.pathname === "/") {
      try {
        const htmlPath = path.join(process.cwd(), "public", "index.html");
        
        if (fs.existsSync(htmlPath)) {
          const content = fs.readFileSync(htmlPath, 'utf-8');
          return new Response(content, { 
            headers: { ...headers, "Content-Type": "text/html" } 
          });
        } else {
          return new Response("HTML file not found", { status: 404, headers });
        }
      } catch (error) {
        console.error("Error serving HTML:", error);
        return new Response("Error serving HTML", { 
          status: 500, 
          headers: { ...headers, "Content-Type": "text/plain" }
        });
      }
    }
    
    if (req.method === "GET" && url.pathname !== "/" && !url.pathname.includes("..")) {
      try {
        const filePath = path.join(process.cwd(), "public", url.pathname);
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath);
          
          // Determine content type based on file extension
          let contentType = "text/plain";
          if (url.pathname.endsWith(".css")) contentType = "text/css";
          else if (url.pathname.endsWith(".js")) contentType = "text/javascript";
          else if (url.pathname.endsWith(".html")) contentType = "text/html";
          else if (url.pathname.endsWith(".json")) contentType = "application/json";
          else if (url.pathname.endsWith(".png")) contentType = "image/png";
          else if (url.pathname.endsWith(".jpg") || url.pathname.endsWith(".jpeg")) contentType = "image/jpeg";
          else if (url.pathname.endsWith(".svg")) contentType = "image/svg+xml";
          else if (url.pathname.endsWith(".ico")) contentType = "image/x-icon";
          
          return new Response(content, { 
            headers: { ...headers, "Content-Type": contentType } 
          });
        } else {
          console.log(`File not found: ${filePath}`);
          return new Response("File not found", { status: 404, headers });
        }
      } catch (error) {
        console.error("Error serving static file:", error);
        return new Response("Error serving file", { 
          status: 500, 
          headers: { ...headers, "Content-Type": "text/plain" }
        });
      }
    }
    // Handle POST requests for translation
    if (req.method === "POST" && url.pathname === "/translate") {
      try {

        if (isRateLimited(ip)) {
          return jsonError(
            "rate_limit_exceeded",
            "Rate limit exceeded. Try again later.",
            429,
            { ...headers, "Retry-After": String(getRateLimitWindowSeconds()) }
          );
        }
        const body = await parseJsonBody(req, headers);
        if (body instanceof Response) {
          return body;
        }

        const validatedRequest = validateTranslateRequest(body, headers);
        if (validatedRequest instanceof Response) {
          return validatedRequest;
        }

        const { text, language } = validatedRequest;
        // Translate and transliterate the text using our modules
        const translatedText = await translateText(text, openai, 0, language);
        const transliteratedText = await transliterateText(translatedText, openai, 0, language);
        
        // Return the response
        return jsonResponse({ translatedText, transliteratedText }, 200, headers);
      } catch (error) {
        console.error("Error processing request:", error);
        
        return jsonError(
          "translation_failed",
          error instanceof Error ? error.message : "Failed to process request.",
          500,
          headers
        );
      }
    }


    // Handle POST requests for speech synthesis
if (req.method === "POST" && url.pathname === "/speak") {
  try {
    const body = await parseJsonBody(req, headers);
    if (body instanceof Response) {
      return body;
    }

    const validatedRequest = validateTranslateRequest(body, headers);
    if (validatedRequest instanceof Response) {
      return validatedRequest;
    }

    const { text, language } = validatedRequest;
    
    const result = await speak({ text, language, headers }, openai);
    
    return new Response(result.buffer, { headers: result.headers });
  } catch (error) {
    return handleSpeakError(error instanceof Error ? error : new Error("Failed to generate speech"), headers);
  }
}

    
    // Return 404 for all other requests
    return jsonError("not_found", "Not Found", 404, headers);
  }
});
