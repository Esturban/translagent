import { serve } from "bun";
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import { translateText, transliterateText } from './translation';
import { isRateLimited } from './utils/rate-limiter';
import { 
  speak, 
  handleSpeakError, 
  audioCache, 
  CACHE_DIR, 
  cleanupCache 
} from './speak';


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

// Create a server that serves both the API and static HTML
const server = serve({
  port: 3001,
  async fetch(req) {
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
    if (req.method === "POST" && (url.pathname === "/" || url.pathname === "/translate")) {
      try {

            // Apply rate limiting only for translation requests
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { 
          status: 429, 
          headers: { ...headers, "Content-Type": "application/json", "Retry-After": "300" }
        }
      );
    }
        // Parse the JSON body
        const body = await req.json();
        const { text, language="ar" } = body;
        
        if (!text) {
          return new Response(
            JSON.stringify({ error: "Missing 'text' field" }),
            { 
              status: 400, 
              headers: { ...headers, "Content-Type": "application/json" }
            }
          );
        }
        // Validate language
        if (language !== "ar" && language !== "zh") {
          return new Response(
            JSON.stringify({ error: "Unsupported language. Currently supporting 'ar' (Arabic) and 'zh' (Chinese)" }),
            { 
              status: 400, 
              headers: { ...headers, "Content-Type": "application/json" }
            }
          );
        }
        // Translate and transliterate the text using our modules
        const translatedText = await translateText(text, openai,0,language);
        const transliteratedText = await transliterateText(translatedText, openai,0,language);
        
        // Return the response
        return new Response(
          JSON.stringify({ translatedText, transliteratedText }),
          { headers: { ...headers, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error processing request:", error);
        
        return new Response(
          JSON.stringify({ error: "Failed to process request", message: error.message }),
          { 
            status: 500, 
            headers: { ...headers, "Content-Type": "application/json" }
          }
        );
      }
    }


    // Handle POST requests for speech synthesis
if (req.method === "POST" && url.pathname === "/speak") {
  try {
    // Parse the JSON body
    const body = await req.json();
    const { text, language="ar" } = body;
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing 'text' field" }),
        { 
          status: 400, 
          headers: { ...headers, "Content-Type": "application/json" }
        }
      );
    }
    
    // Use the new speak module
    const result = await speak({ text, language, headers }, openai);
    
    // Return the audio data
    return new Response(result.buffer, { headers: result.headers });
  } catch (error) {
    return handleSpeakError(error, headers);
  }
}

    
    // Return 404 for all other requests
    return new Response(
      JSON.stringify({ error: "Not Found" }),
      { 
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" }
      }
    );
  }
});
