'use server';

/**
 * @fileOverview AI-powered flow to generate a service description.
 */

import { model } from '@/ai/genkit';

export interface ServiceDescriptionInput {
  serviceName: string;
  businessCategory: string;
}

export interface ServiceDescriptionOutput {
  description: string;
}

export async function generateServiceDescription(input: ServiceDescriptionInput): Promise<ServiceDescriptionOutput> {
  try {
    const prompt = `Você é um especialista em marketing para negócios locais.
O negócio se enquadra na categoria: "${input.businessCategory}".
Gere uma descrição curta, criativa e atraente para o serviço chamado "${input.serviceName}", levando em conta o contexto da categoria do negócio.
A descrição deve ser em português brasileiro e ter no máximo 50 palavras, destacando os benefícios e o diferencial do serviço.

Responda APENAS em formato JSON válido, sem markdown, com esta estrutura exata:
{"description": "sua descrição aqui"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Remove markdown se houver
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    return {
      description: parsed.description || `${input.serviceName} - Serviço de qualidade para você.`
    };
  } catch (error) {
    console.error('Erro ao gerar descrição:', error);
    return {
      description: `${input.serviceName} - Serviço de qualidade para você.`
    };
  }
}
