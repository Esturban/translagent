import OpenAI from 'openai';

export async function translateText(text: string, openai: OpenAI, temperature: number =0,language: string="ar"): Promise<string> {
  try {

    let systemMessage = "";
    if (language === "ar") {
      systemMessage = "You are an expert translator that translates English text to Arabic, especially with a Saudi Arabian dialect from the Riyadh region. Only respond with the translated text.";
    } else if (language === "zh") {
      systemMessage = "You are an expert translator that translates English text to Mandarin Chinese. Only respond with the translated text.";
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
      max_completion_tokens: 500
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}