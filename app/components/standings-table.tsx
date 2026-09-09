'use client';

import { useEffect, useState } from 'react';
import { TableSkeleton } from './loading-skeleton';
import { AlertCircle, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

interface StandingsEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  form: string | null;
  description: string | null;
}

export default function StandingsTable({ leagueId }: { leagueId: number }) {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [seasonLabel, setSeasonLabel] = useState<string | null>(null);
  const [currentMatchday, setCurrentMatchday] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/league/${leagueId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setStandings(data?.standings ?? []);
          setSeasonLabel(data?.seasonLabel ?? null);
          setCurrentMatchday(data?.currentMatchday ?? null);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load standings');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [leagueId]);

  if (loading) return <TableSkeleton rows={10} />;
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {seasonLabel && (
        <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-secondary/20 px-4 py-2.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <span>
            Live <span className="font-semibold text-foreground">{seasonLabel}</span> season standings
            {currentMatchday ? <> &mdash; through matchday <span className="font-semibold text-foreground">{currentMatchday}</span></> : null}.
          </span>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-secondary/30">
            <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Team</th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">P</th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">W</th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">D</th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">L</th>
            <th className="hidden px-3 py-3 text-center text-xs font-semibold text-muted-foreground sm:table-cell">GF</th>
            <th className="hidden px-3 py-3 text-center text-xs font-semibold text-muted-foreground sm:table-cell">GA</th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">GD</th>
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">Pts</th>
            <th className="hidden px-3 py-3 text-center text-xs font-semibold text-muted-foreground md:table-cell">Form</th>
          </tr>
        </thead>
        <tbody>
          {(standings ?? []).map((entry: StandingsEntry, idx: number) => {
            const rank = entry?.rank ?? idx + 1;
            const isCL = rank <= 4;
            const isRelegation = rank >= (standings?.length ?? 20) - 2;
            const desc = entry?.description ?? '';

            return (
              <motion.tr
                key={`${entry?.rank ?? idx}-${entry?.team?.name ?? idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`border-b border-border/30 transition-colors hover:bg-secondary/30 ${
                  isCL ? 'border-l-2 border-l-primary' : ''
                } ${isRelegation ? 'border-l-2 border-l-destructive' : ''}`}
              >
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{rank}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {entry?.team?.logo && (
                      <div className="relative h-6 w-6 flex-shrink-0">
                        <Image
                          src={entry.team.logo}
                          alt={entry?.team?.name ?? 'Team'}
                          fill
                          className="object-contain"
                          sizes="24px"
                        />
                      </div>
                    )}
                    <span className="font-medium text-sm truncate max-w-[160px] sm:max-w-none">
                      {entry?.team?.name ?? 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-xs">{entry?.all?.played ?? 0}</td>
                <td className="px-3 py-2.5 text-center font-mono text-xs text-green-400">{entry?.all?.win ?? 0}</td>
                <td className="px-3 py-2.5 text-center font-mono text-xs text-yellow-400">{entry?.all?.draw ?? 0}</td>
                <td className="px-3 py-2.5 text-center font-mono text-xs text-red-400">{entry?.all?.lose ?? 0}</td>
                <td className="hidden px-3 py-2.5 text-center font-mono text-xs sm:table-cell">{entry?.all?.goals?.for ?? 0}</td>
                <td className="hidden px-3 py-2.5 text-center font-mono text-xs sm:table-cell">{entry?.all?.goals?.against ?? 0}</td>
                <td className={`px-3 py-2.5 text-center font-mono text-xs ${
                  (entry?.goalsDiff ?? 0) > 0 ? 'text-green-400' : (entry?.goalsDiff ?? 0) < 0 ? 'text-red-400' : 'text-muted-foreground'
                }`}>
                  {(entry?.goalsDiff ?? 0) > 0 ? '+' : ''}{entry?.goalsDiff ?? 0}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-sm font-bold text-primary">{entry?.points ?? 0}</td>
                <td className="hidden px-3 py-2.5 md:table-cell">
                  <div className="flex gap-0.5 justify-center">
                    {(entry?.form ?? '').split('').map((r: string, fi: number) => (
                      <span
                        key={fi}
                        className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                          r === 'W' ? 'bg-green-500/20 text-green-400' :
                          r === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
                          r === 'L' ? 'bg-red-500/20 text-red-400' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-3 text-xs text-muted-foreground border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-1 rounded-full bg-primary" />
          Champions League
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-1 rounded-full bg-destructive" />
          Relegation
        </div>
      </div>
      </div>
    </div>
  );
}
