import { serve } from "bun";
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import { translateText, transliterateText } from './translation';
import { isRateLimited } from './utils/rate-limiter';

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
    
    // Check rate limit (but not for OPTIONS requests)
    if (req.method !== "OPTIONS" && isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { 
          status: 429, 
          headers: { ...headers, "Content-Type": "application/json", "Retry-After": "60" }
        }
      );
    }
    
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
    
    // Handle POST requests for translation
    if (req.method === "POST" && (url.pathname === "/" || url.pathname === "/translate")) {
      try {
        // Parse the JSON body
        const body = await req.json();
        const { text } = body;
        
        if (!text) {
          return new Response(
            JSON.stringify({ error: "Missing 'text' field" }),
            { 
              status: 400, 
              headers: { ...headers, "Content-Type": "application/json" }
            }
          );
        }
        
        // Translate and transliterate the text using our modules
        const translatedText = await translateText(text, openai);
        const transliteratedText = await transliterateText(translatedText, openai);
        
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

console.log("Server running on http://localhost:3001");