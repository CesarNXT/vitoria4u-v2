import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializa o Google Generative AI diretamente (sem Genkit)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-exp'
});
