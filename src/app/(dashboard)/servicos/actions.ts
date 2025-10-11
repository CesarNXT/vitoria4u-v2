
'use server';

import { generateServiceDescription as generateDescriptionFlow, type ServiceDescriptionInput } from '@/ai/flows/ai-service-description';

export async function generateServiceDescription(input: ServiceDescriptionInput): Promise<{ description: string }> {
    try {
        const result = await generateDescriptionFlow(input);
        return { description: result.description };
    } catch (error) {
        console.error('Error generating description with Genkit:', error);
        throw new Error('Falha ao gerar descrição com a IA.');
    }
}
