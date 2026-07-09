const OpenAI = require('openai');
const { translateText, transliterateText } = require('../../src/speak');

exports.handler = async function(event) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const { text, language="ar" } = JSON.parse(event.body);
    
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'text' field" })
      };
    }
    
    const translatedText = await translateText(text, openai, 0, language);
    const transliteratedText = await transliterateText(translatedText, openai, 0, language);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ translatedText, transliteratedText })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};