import { Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground',
          className
        )}
      >
        <Gem className="h-6 w-6" />
      </div>
      <span className="text-xl font-bold text-foreground sm:inline-block">
        vitoria4u
      </span>
    </Link>
  );
}
