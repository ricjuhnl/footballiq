'use client';

import { useEffect, useState } from 'react';
import { CardSkeleton } from './loading-skeleton';
import { AlertCircle, Calendar, TrendingUp, Zap, Target, BarChart3 } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SafeDate, SafeTime } from '@/components/safe-format';
import type { Prediction } from '@/lib/predictions';

function TeamWrap({ className, children }: { className: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

interface FixtureWithPrediction {
  fixture: { id: number; date: string; status: { short: string } };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  prediction: Prediction | null;
}

function ProbabilityBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-[10px] font-medium text-muted-foreground text-right">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct ?? 0, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs">{(pct ?? 0).toFixed?.(1) ?? '0'}%</span>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    High: 'bg-green-500/10 text-green-400 border-green-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Low: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[confidence] ?? styles.Low}`}>
      <Zap className="h-2.5 w-2.5" />
      {confidence}
    </span>
  );
}

export default function UpcomingPredictions({ leagueId }: { leagueId: number }) {
  const [fixtures, setFixtures] = useState<FixtureWithPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/fixtures/${leagueId}?type=upcoming`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setFixtures(data?.fixtures ?? []);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load predictions');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [leagueId]);

  if (loading) return <CardSkeleton count={6} />;
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!fixtures?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No upcoming fixtures available.
      </div>
    );
  }

  return (
    <div id="predictions" className="grid gap-4 sm:grid-cols-2">
      {fixtures.map((fix: FixtureWithPrediction, idx: number) => {
        const pred = fix?.prediction;

        return (
          <motion.div
            key={fix?.fixture?.id ?? idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/20 border-b border-border/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <SafeDate date={fix?.fixture?.date ?? ''} options={{ dateStyle: 'medium' }} />
                <span className="text-muted-foreground/50">·</span>
                <SafeTime date={fix?.fixture?.date ?? ''} options={{ hour: '2-digit', minute: '2-digit' }} localize />
              </div>
              {pred && <ConfidenceBadge confidence={pred?.confidence ?? 'Low'} />}
            </div>

            <div className="p-4 space-y-4">
              {/* Teams */}
              <div className="flex items-center justify-between gap-2">
                <TeamWrap
                  className="flex flex-1 items-center gap-2 min-w-0"
                >
                  {fix?.teams?.home?.logo && (
                    <div className="relative h-8 w-8 flex-shrink-0">
                      <Image src={fix.teams.home.logo} alt={fix?.teams?.home?.name ?? ''} fill className="object-contain" sizes="32px" />
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">{fix?.teams?.home?.name ?? 'Home'}</span>
                </TeamWrap>

                <span className="text-xs font-bold text-muted-foreground/60 px-2">VS</span>

                <TeamWrap
                  className="flex flex-1 items-center justify-end gap-2 min-w-0"
                >
                  <span className="text-sm font-medium truncate text-right">{fix?.teams?.away?.name ?? 'Away'}</span>
                  {fix?.teams?.away?.logo && (
                    <div className="relative h-8 w-8 flex-shrink-0">
                      <Image src={fix.teams.away.logo} alt={fix?.teams?.away?.name ?? ''} fill className="object-contain" sizes="32px" />
                    </div>
                  )}
                </TeamWrap>
              </div>

              {pred ? (
                <>
                  {/* Probability bars */}
                  <div className="space-y-1.5">
                    <ProbabilityBar label="H" pct={pred?.homeWinPct ?? 0} color="bg-green-500" />
                    <ProbabilityBar label="D" pct={pred?.drawPct ?? 0} color="bg-yellow-500" />
                    <ProbabilityBar label="A" pct={pred?.awayWinPct ?? 0} color="bg-red-500" />
                  </div>

                  {/* Recommended bet */}
                  <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                    <Target className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium text-primary">
                      {pred?.recommendedBet ?? 'N/A'}
                    </span>
                  </div>

                  {/* Extra predictions */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-secondary/30 px-3 py-2 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Over 2.5</p>
                      <p className="font-mono text-sm font-bold">{(pred?.over25Pct ?? 0).toFixed?.(0) ?? '0'}%</p>
                    </div>
                    <div className="rounded-lg bg-secondary/30 px-3 py-2 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">BTTS</p>
                      <p className="font-mono text-sm font-bold">{(pred?.bttsPct ?? 0).toFixed?.(0) ?? '0'}%</p>
                    </div>
                  </div>

                  {/* Odds display */}
                  {pred?.oddsAvailable && (
                    <div className="flex gap-2 text-center">
                      <div className="flex-1 rounded-lg bg-secondary/20 px-2 py-1.5">
                        <p className="text-[9px] text-muted-foreground">Home</p>
                        <p className="font-mono text-xs font-bold text-green-400">{(pred?.homeOdds ?? 0).toFixed?.(2) ?? '-'}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-secondary/20 px-2 py-1.5">
                        <p className="text-[9px] text-muted-foreground">Draw</p>
                        <p className="font-mono text-xs font-bold text-yellow-400">{(pred?.drawOdds ?? 0).toFixed?.(2) ?? '-'}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-secondary/20 px-2 py-1.5">
                        <p className="text-[9px] text-muted-foreground">Away</p>
                        <p className="font-mono text-xs font-bold text-red-400">{(pred?.awayOdds ?? 0).toFixed?.(2) ?? '-'}</p>
                      </div>
                      {(pred?.over25Odds ?? 0) > 0 && (
                        <div className="flex-1 rounded-lg bg-secondary/20 px-2 py-1.5">
                          <p className="text-[9px] text-muted-foreground">O2.5</p>
                          <p className="font-mono text-xs font-bold text-blue-400">{(pred?.over25Odds ?? 0).toFixed?.(2) ?? '-'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {pred?.oddsAvailable && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      Prediction from live bookmaker odds (1X2 &amp; O/U 2.5)
                    </div>
                  )}

                  {!pred?.oddsAvailable && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      Odds unavailable — prediction based on form only
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Prediction unavailable
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
