
'use server';

/**
 * @fileOverview AI-powered flow to generate a service description.
 *
 * - generateServiceDescription - A function that generates a description for a given service name and business category.
 * - ServiceDescriptionInput - The input type for the function.
 * - ServiceDescriptionOutput - The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ServiceDescriptionInputSchema = z.object({
  serviceName: z.string().describe('The name of the service to describe.'),
  businessCategory: z.string().describe('The category of the business (e.g., "Barbearia", "ClinicaDeEstetica").'),
});

const ServiceDescriptionOutputSchema = z.object({
  description: z.string().describe('A creative and attractive description for the service.'),
});

export type ServiceDescriptionInput = z.infer<typeof ServiceDescriptionInputSchema>;
export type ServiceDescriptionOutput = z.infer<typeof ServiceDescriptionOutputSchema>;

export async function generateServiceDescription(input: ServiceDescriptionInput): Promise<ServiceDescriptionOutput> {
  return generateServiceDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'serviceDescriptionPrompt',
  input: {schema: ServiceDescriptionInputSchema},
  output: {schema: ServiceDescriptionOutputSchema},
  prompt: `Você é um especialista em marketing para negócios locais.
  O negócio se enquadra na categoria: "{{businessCategory}}".
  Gere uma descrição curta, criativa e atraente para o serviço chamado "{{serviceName}}", levando em conta o contexto da categoria do negócio.
  A descrição deve ser em português brasileiro e ter no máximo 50 palavras, destacando os benefícios e o diferencial do serviço.`,
});

const generateServiceDescriptionFlow = ai.defineFlow(
  {
    name: 'generateServiceDescriptionFlow',
    inputSchema: ServiceDescriptionInputSchema,
    outputSchema: ServiceDescriptionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
