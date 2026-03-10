import OpenAI from 'openai';
import type { SupportedLanguage } from '../types';

export async function transliterateText(
  text: string,
  openai: OpenAI,
  temperature: number = 0,
  language: SupportedLanguage = "ar"
): Promise<string> {
  try {
    let systemMessage = "";
    if (language === "ar") {
      systemMessage = "Convert Arabic text into a simple Latin-letter transliteration in plain text only. Return only the transliteration with no notes, labels, or quotation marks.";
    } else if (language === "zh") {
      systemMessage = "Convert Mandarin Chinese text into pinyin with tone marks in plain text only. Return only the transliteration with no notes, labels, or quotation marks.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 500,
      temperature:temperature
    });
    
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Transliteration error:", error);
    throw error;
  }
}
