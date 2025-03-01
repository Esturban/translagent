import OpenAI from 'openai';

export async function transliterateText(text: string, openai: OpenAI, temperature: number = 0,language: string="ar"): Promise<string> {
  try {
    // Select the appropriate system message based on language
    let systemMessage = "";
    if (language === "ar") {
      systemMessage = "You are a transliterator that converts Arabic text to its Latin alphabet pronunciation equivalent. Only respond with the transliterated text.";
    } else if (language === "zh") {
      systemMessage = "You are a transliterator that converts Chinese text to its pinyin pronunciation. Include tone marks. Only respond with the transliterated text.";
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