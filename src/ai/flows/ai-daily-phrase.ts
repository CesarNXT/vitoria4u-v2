'use server';

/**
 * @fileOverview AI-powered flow to generate a daily motivational phrase for business users.
 */

import { model } from '@/ai/genkit';

export interface DailyPhraseOutput {
  phrase: string;
  author: string;
}

export async function generateDailyPhrase(): Promise<DailyPhraseOutput> {
  try {
    const prompt = `Você é um coach de negócios. Gere uma frase motivacional curta e inspiradora para um usuário empreendedor começar o dia. A frase deve ter no máximo 20 palavras e ser em português brasileiro. 

Responda APENAS em formato JSON válido, sem markdown, com esta estrutura exata:
{"phrase": "sua frase aqui", "author": "nome do autor ou IA"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Remove markdown se houver
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    return {
      phrase: parsed.phrase || 'Acredite no seu potencial e siga em frente!',
      author: parsed.author || 'IA'
    };
  } catch (error) {
    console.error('Erro ao gerar frase:', error);
    return {
      phrase: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.',
      author: 'Robert Collier'
    };
  }
}
