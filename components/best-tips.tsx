'use client';

import { useEffect, useState } from 'react';
import { CardSkeleton } from '@/app/components/loading-skeleton';
import { AlertCircle, Sparkles, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { SafeDate, SafeTime } from '@/components/safe-format';

interface TipSelection {
  id: string;
  leagueId: number;
  leagueName: string;
  leagueFlag: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  marketCode: 'home' | 'draw' | 'away' | 'over25';
  probability: number;
  odds: number;
}

interface Tip {
  id: string;
  label: 'Single' | 'Double' | 'Treble';
  combinedOdds: number;
  combinedPct: number;
  selections: TipSelection[];
}

const MARKET_STYLES: Record<TipSelection['marketCode'], string> = {
  home: 'bg-green-500/10 text-green-400 border-green-500/20',
  draw: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  away: 'bg-red-500/10 text-red-400 border-red-500/20',
  over25: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function BestTips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [filters, setFilters] = useState<{ minPct: number; minOdds: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/tips')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setTips(data?.tips ?? []);
          setFilters(data?.filters ?? null);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load tips');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) return <CardSkeleton count={3} />;
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  const pickCount = tips.reduce((acc, t) => acc + t.selections.length, 0);

  return (
    <div id="tips" className="space-y-5">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Best Tips</h2>
            <p className="text-xs text-muted-foreground">
              Top upcoming picks across all 6 leagues, split into separate tips of max 2-3 selections
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
            Probability &gt; {filters?.minPct ?? 58}%
          </span>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
            Odds &gt; {filters?.minOdds?.toFixed?.(2) ?? '1.40'}
          </span>
        </div>
      </div>

      {!tips.length ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card px-6 py-14 text-center">
          <Sparkles className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No tips available right now.</p>
          <p className="max-w-md text-xs text-muted-foreground/70">
            No upcoming match currently clears the &gt;{filters?.minPct ?? 58}% probability and
            &gt;{filters?.minOdds?.toFixed?.(2) ?? '1.40'} odds bar. Check back when new odds are published.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tips.map((tip, idx) => {
            const selections = tip.selections;
            return (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-border/30 bg-secondary/20 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold">Tip {idx + 1}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {tip.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total odds</p>
                    <p className="font-mono text-sm font-bold text-primary">
                      {tip.combinedOdds.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Selections */}
                <div className="flex-1 space-y-3 px-4 py-3">
                  {selections.map((sel) => (
                    <div
                      key={sel.id}
                      className="flex items-center justify-between gap-3 border-b border-border/20 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium">
                          {sel.homeTeam}
                          <span className="mx-1 text-[10px] text-muted-foreground/60">vs</span>
                          {sel.awayTeam}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span>{sel.leagueFlag}</span>
                            {sel.leagueName}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <CalendarDays className="h-2.5 w-2.5" />
                            <SafeDate date={sel.kickoff} options={{ timeZone: 'Europe/Amsterdam', month: 'short', day: 'numeric' }} />
                            <SafeTime date={sel.kickoff} options={{ timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hour12: false }} />
                          </span>
                          <span className={`rounded-full border px-1.5 py-px font-semibold ${MARKET_STYLES[sel.marketCode] ?? MARKET_STYLES.home}`}>
                            {sel.market}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-mono text-sm font-bold">
                          {Math.round(sel.probability)}%
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          @{sel.odds.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/30 bg-secondary/10 px-4 py-2">
                  <span className="text-[10px] text-muted-foreground">
                    Est. combined probability
                  </span>
                  <span className="font-mono text-xs font-bold text-primary">
                    {Math.round(tip.combinedPct)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {pickCount > 0 && (
        <p className="text-center text-[10px] text-muted-foreground/60">
          {pickCount} selection{pickCount !== 1 ? 's' : ''} across {tips.length} tip{tips.length !== 1 ? 's' : ''} ·
          selections meet FootballIQ probability &gt;{filters?.minPct ?? 58}% with odds &gt;{filters?.minOdds?.toFixed?.(2) ?? '1.40'}
        </p>
      )}
    </div>
  );
}
