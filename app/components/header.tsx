'use client';

import { Brain, Trophy, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <Brain className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Football<span className="text-primary">IQ</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trophy className="h-4 w-4" />
            Leagues
          </Link>
          <Link
            href="/#predictions"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <TrendingUp className="h-4 w-4" />
            Predictions
          </Link>
        </nav>
      </div>
    </header>
  );
}
