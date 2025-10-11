
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import { generateDailyPhrase, type DailyPhraseOutput } from '@/ai/flows/ai-daily-phrase';

export function DailyPhrase() {
  const [phraseData, setPhraseData] = useState<DailyPhraseOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPhrase() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const cachedData = localStorage.getItem('dailyPhrase');
        
        if (cachedData) {
          const { date, data } = JSON.parse(cachedData);
          if (date === today) {
            setPhraseData(data);
            setIsLoading(false);
            return;
          }
        }
        
        // If not cached or date is old, fetch new phrase
        setIsLoading(true);
        const newPhraseData = await generateDailyPhrase();
        setPhraseData(newPhraseData);
        localStorage.setItem('dailyPhrase', JSON.stringify({ date: today, data: newPhraseData }));

      } catch (error) {
        console.error("Failed to fetch daily phrase:", error);
        setPhraseData({ phrase: "A jornada de mil milhas começa com um único passo.", author: "Lao Tzu" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPhrase();
  }, []);

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 col-span-1 lg:col-span-7">
      <CardContent className="p-4 flex items-center gap-4">
        <Lightbulb className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin"/>
                <p className="text-xs italic text-muted-foreground">Gerando sua inspiração diária...</p>
            </div>
          ) : phraseData && (
            <>
              <p className="text-sm font-medium italic">"{phraseData.phrase}"</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

    
