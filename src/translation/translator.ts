import OpenAI from 'openai';
import type { SupportedLanguage } from '../types';

export async function translateText(
  text: string,
  openai: OpenAI,
  temperature: number = 0,
  language: SupportedLanguage = "ar"
): Promise<string> {
  try {
    let systemMessage = "";
    if (language === "ar") {
      systemMessage = "Translate English text into Arabic in plain text only. Return only the final translation with no notes, labels, or quotation marks.";
    } else if (language === "zh") {
      systemMessage = "Translate English text into Mandarin Chinese in plain text only. Return only the final translation with no notes, labels, or quotation marks.";
    }
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
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
      max_completion_tokens: 500,
      temperature
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}
