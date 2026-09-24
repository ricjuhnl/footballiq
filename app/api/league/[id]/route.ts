export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getStandings } from '@/lib/football-data';
import { LEAGUES } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leagueId = parseInt(id, 10);
    if (!LEAGUES[leagueId]) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const { standings, seasonLabel, currentMatchday } = await getStandings(leagueId);
    return NextResponse.json({
      standings,
      league: LEAGUES[leagueId],
      seasonLabel,
      currentMatchday,
    });
  } catch (err: any) {
    console.error('League API error:', err?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
