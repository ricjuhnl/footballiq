export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getOdds, getScores, parseEventOdds, buildRecentResults, hashId } from '@/lib/odds-api';
import { generatePrediction } from '@/lib/predictions';
import { LEAGUES } from '@/lib/constants';

const EMPTY_FORM = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId: lid } = await params;
    const leagueId = parseInt(lid, 10);
    const league = LEAGUES[leagueId];
    if (!league) {
      return NextResponse.json({ error: 'Invalid league' }, { status: 400 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') ?? 'recent';

    // ---- RECENT RESULTS ----
    // Live completed scores from The Odds API (always current).
    if (type === 'recent') {
      const scores = await getScores(league.sportKey, 3);
      const fixtures = buildRecentResults(scores);
      return NextResponse.json({ fixtures, stale: false });
    }

    // ---- UPCOMING FIXTURES + PREDICTIONS ----
    // Real upcoming matches with bookmaker odds from The Odds API.
    if (type === 'upcoming') {
      const oddsData = await getOdds(league.sportKey);

      const now = Date.now();
      const fixtures = (oddsData ?? [])
        .filter((ev: any) => new Date(ev?.commence_time ?? 0).getTime() >= now - 2 * 60 * 60 * 1000)
        .sort(
          (a: any, b: any) =>
            new Date(a?.commence_time ?? 0).getTime() - new Date(b?.commence_time ?? 0).getTime()
        )
        .slice(0, 12)
        .map((ev: any) => {
          const odds = parseEventOdds(ev);
          const prediction = generatePrediction(odds, { ...EMPTY_FORM }, { ...EMPTY_FORM });
          return {
            fixture: {
              id: hashId(ev?.id ?? `${ev?.home_team}-${ev?.away_team}-${ev?.commence_time}`),
              date: ev?.commence_time ?? '',
              status: { short: 'NS' },
            },
            teams: {
              home: { id: 0, name: ev?.home_team ?? 'Home', logo: '' },
              away: { id: 0, name: ev?.away_team ?? 'Away', logo: '' },
            },
            prediction,
            source: 'odds',
          };
        });

      return NextResponse.json({ fixtures });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    console.error('Fixtures API error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}
