'use client';

import { useEffect, useState } from 'react';
import { CardSkeleton } from './loading-skeleton';
import { AlertCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SafeDate } from '@/components/safe-format';

function TeamWrap({ className, children }: { className: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

interface Fixture {
  fixture: { id: number; date: string; status: { short: string; long: string } };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

export default function RecentResults({ leagueId }: { leagueId: number }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prevLeagueId, setPrevLeagueId] = useState(leagueId);
  if (prevLeagueId !== leagueId) {
    // Reset for the new league during render (react.dev "adjust state when props change"),
    // so the effect body stays free of synchronous setState.
    setPrevLeagueId(leagueId);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/fixtures/${leagueId}?type=recent`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setFixtures(data?.fixtures ?? []);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load results');
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
        No recent results available.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fixtures.map((fix: Fixture, idx: number) => {
        const homeWin = fix?.teams?.home?.winner === true;
        const awayWin = fix?.teams?.away?.winner === true;
        const isDraw = fix?.teams?.home?.winner === null && fix?.goals?.home != null;

        return (
          <motion.div
            key={fix?.fixture?.id ?? idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-border hover:shadow-lg"
          >
            {/* Date */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <SafeDate date={fix?.fixture?.date ?? ''} options={{ dateStyle: 'medium' }} />
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                fix?.fixture?.status?.short === 'FT'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {fix?.fixture?.status?.short ?? 'FT'}
              </span>
            </div>

            {/* Teams & Score */}
            <div className="flex items-center justify-between gap-2">
              {/* Home */}
              <TeamWrap
                className="flex flex-1 items-center gap-2 min-w-0"
              >
                {fix?.teams?.home?.logo && (
                  <div className="relative h-7 w-7 flex-shrink-0">
                    <Image src={fix.teams.home.logo} alt={fix?.teams?.home?.name ?? ''} fill className="object-contain" sizes="28px" />
                  </div>
                )}
                <span className={`text-sm truncate ${homeWin ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                  {fix?.teams?.home?.name ?? 'Home'}
                </span>
              </TeamWrap>

              {/* Score */}
              <div className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-mono text-lg font-bold ${
                isDraw ? 'bg-yellow-500/10 text-yellow-400' : 'bg-secondary/50'
              }`}>
                <span className={homeWin ? 'text-green-400' : ''}>{fix?.goals?.home ?? 0}</span>
                <span className="text-muted-foreground/50">-</span>
                <span className={awayWin ? 'text-green-400' : ''}>{fix?.goals?.away ?? 0}</span>
              </div>

              {/* Away */}
              <TeamWrap
                className="flex flex-1 items-center justify-end gap-2 min-w-0"
              >
                <span className={`text-sm truncate text-right ${awayWin ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                  {fix?.teams?.away?.name ?? 'Away'}
                </span>
                {fix?.teams?.away?.logo && (
                  <div className="relative h-7 w-7 flex-shrink-0">
                    <Image src={fix.teams.away.logo} alt={fix?.teams?.away?.name ?? ''} fill className="object-contain" sizes="28px" />
                  </div>
                )}
              </TeamWrap>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
