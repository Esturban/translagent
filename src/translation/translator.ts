import OpenAI from 'openai';

export async function translateText(text: string, openai: OpenAI, temperature: number =0): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a translator that translates English text to Arabic, specifically a Saudi dialect from the Riyadh province. Only respond with the translated text."
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 500,
      temperature: temperature
    });
    
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}