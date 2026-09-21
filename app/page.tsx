import Header from './components/header';
import LeagueTabs from './components/league-tabs';
import { Brain, BarChart3, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="hero-gradient pitch-lines relative overflow-hidden">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:py-20">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Brain className="h-8 w-8" />
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Football<span className="text-primary">IQ</span>
            </h1>
            <p className="max-w-lg text-muted-foreground">
              Real-time standings, results, and AI-powered match predictions across Europe&apos;s top leagues.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                8 Competitions
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Live Predictions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <LeagueTabs />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="mx-auto max-w-[1200px] px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>FootballIQ</span>
          <span>Data from football-data.org &amp; The Odds API</span>
        </div>
      </footer>
    </div>
  );
}
