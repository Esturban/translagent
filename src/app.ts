import { serve } from "bun";
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Translation function using OpenAI
async function translateText(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a translator that translates English text to Arabic. Only respond with the translated text."
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 500
    });
    
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

// Transliteration function using OpenAI
async function transliterateText(arabicText: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a transliterator that converts Arabic text to its Latin alphabet pronunciation equivalent. Only respond with the transliterated text."
        },
        {
          role: "user",
          content: arabicText
        }
      ],
      max_tokens: 500
    });
    
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Transliteration error:", error);
    throw error;
  }
}

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
            headers: { 
              ...headers, 
              "Content-Type": "text/html" 
            } 
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
    if (req.method === "POST") {
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
        
        // Translate the text
        const translatedText = await translateText(text);
        
        // Use OpenAI for transliteration instead of the package
        const transliteratedText = await transliterateText(translatedText);
        
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

// console.log("Server running on http://localhost:3001");
// console.log("- UI available at http://localhost:3001/");
// console.log("- API accepts POST requests with JSON body: {'text': 'your text here'}");