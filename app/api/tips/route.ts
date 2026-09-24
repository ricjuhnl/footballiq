export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getOdds } from '@/lib/odds-api';
import { buildTips, TIP_MIN_PCT, TIP_MIN_ODDS, TIP_MAX_HOURS_AHEAD, type Tip } from '@/lib/tips';
import { LEAGUES, LEAGUE_IDS } from '@/lib/constants';

const HOUR_MS = 60 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();

    // Best tips span all six leagues. Only the first upcoming matches count:
    // kickoff no earlier than 2h ago (same grace as the fixtures route) and no
    // further than 7 days ahead (next matchday only).
    const leagues = await Promise.all(
      LEAGUE_IDS.map(async (leagueId) => {
        const league = LEAGUES[leagueId];
        if (!league) return { leagueId, events: [] };
        const events = await getOdds(league.sportKey);
        return {
          leagueId,
          events: (events ?? []).filter((ev: any) => {
            const kickoff = new Date(ev?.commence_time ?? 0).getTime();
            return kickoff >= now - 2 * HOUR_MS && kickoff <= now + TIP_MAX_HOURS_AHEAD * HOUR_MS;
          }),
        };
      })
    );

    const tips: Tip[] = buildTips(leagues);

    return NextResponse.json({
      tips,
      filters: { minPct: TIP_MIN_PCT, minOdds: TIP_MIN_ODDS },
    });
  } catch (err: any) {
    console.error('Tips API error:', err?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
