import OpenAI from 'openai';

export async function transliterateText(arabicText: string, openai: OpenAI, temperature: number = 0): Promise<string> {
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
      max_tokens: 500,
      temperature:temperature
    });
    
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Transliteration error:", error);
    throw error;
  }
}