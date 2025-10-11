'use server';

/**
 * @fileOverview AI-powered flow to generate a daily motivational phrase for business users.
 *
 * - generateDailyPhrase - A function that generates a daily motivational phrase.
 * - DailyPhraseOutput - The output type for the generateDailyPhrase function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyPhraseOutputSchema = z.object({
  phrase: z.string().describe('A daily motivational phrase for business users.'),
  author: z.string().describe('The author of the phrase, which can be "IA" or a real person.'),
});

export type DailyPhraseOutput = z.infer<typeof DailyPhraseOutputSchema>;

export async function generateDailyPhrase(): Promise<DailyPhraseOutput> {
  return generateDailyPhraseFlow();
}

const prompt = ai.definePrompt({
  name: 'dailyPhrasePrompt',
  output: {schema: DailyPhraseOutputSchema},
  prompt: `Você é um coach de negócios. Gere uma frase motivacional curta e inspiradora para um usuário empreendedor começar o dia. A frase deve ter no máximo 20 palavras e ser em português brasileiro. Atribua a autoria a uma pessoa famosa ou à "IA".`,
});

const generateDailyPhraseFlow = ai.defineFlow(
  {
    name: 'generateDailyPhraseFlow',
    outputSchema: DailyPhraseOutputSchema,
  },
  async () => {
    const {output} = await prompt({});
    return output!;
  }
);
