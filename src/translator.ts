import OpenAI from 'openai';
import transliterate from '@sindresorhus/transliterate';

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function translateText(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a translator that translates English text to Arabic. You will only translate arabic in a Saudi Dialect. Only respond with the translated text, no explanations or additional text."
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

export function transliterateText(text: string): string {
  // Use the @sindresorhus/transliterate library
  return transliterate(text);
}
