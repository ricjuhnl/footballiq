import { LEAGUES } from './constants';
import { parseEventOdds } from './odds-api';
import { generatePrediction } from './predictions';

export const TIP_MIN_PCT = 58; // selection needs prediction probability higher than this (%)
export const TIP_MIN_ODDS = 1.4; // selection needs decimal odds higher than this
export const TIP_MAX_HOURS_AHEAD = 7 * 24; // only the first upcoming matchday (rolling 7-day window)
export const TIP_MAX_SELECTIONS = 12; // keep only the top-N picks across all leagues
export const TIP_MAX_PER_GROUP = 3; // each separate tip carries max 2-3 selections
export const TIP_MIN_PER_GROUP = 2;

const EMPTY_FORM = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };

export type MarketCode = 'home' | 'draw' | 'away' | 'over25';

export interface TipSelection {
  id: string;
  leagueId: number;
  leagueName: string;
  leagueFlag: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  marketCode: MarketCode;
  probability: number; // FootballIQ probability (%, > 65)
  odds: number; // decimal odds (> 1.50)
}

export interface Tip {
  id: string;
  label: 'Single' | 'Double' | 'Treble';
  combinedOdds: number;
  combinedPct: number;
  selections: TipSelection[];
}

export interface LeagueEvents {
  leagueId: number;
  events: any[];
}

interface MarketCandidate {
  market: string;
  marketCode: MarketCode;
  probability: number;
  odds: number;
}

const MARKET_DEFS: { code: MarketCode; label: string }[] = [
  { code: 'home', label: 'Home Win' },
  { code: 'draw', label: 'Draw' },
  { code: 'away', label: 'Away Win' },
  { code: 'over25', label: 'Over 2.5 Goals' },
];

// Extract the markets of a match that clear the quality bar:
// probability > 65% AND decimal odds > 1.50.
export function buildMatchCandidates(prediction: any): MarketCandidate[] {
  const map: Record<MarketCode, { pct: number; odds: number }> = {
    home: { pct: prediction?.homeWinPct ?? 0, odds: prediction?.homeOdds ?? 0 },
    draw: { pct: prediction?.drawPct ?? 0, odds: prediction?.drawOdds ?? 0 },
    away: { pct: prediction?.awayWinPct ?? 0, odds: prediction?.awayOdds ?? 0 },
    over25: { pct: prediction?.over25Pct ?? 0, odds: prediction?.over25Odds ?? 0 },
  };

  return MARKET_DEFS.flatMap(({ code, label }) => {
    const { pct, odds } = map[code];
    if (!(odds > 0) || !(pct > TIP_MIN_PCT) || !(odds > TIP_MIN_ODDS)) return [];
    return [{ market: label, marketCode: code, probability: pct, odds }];
  });
}

// Group ranked selections into separate tips of max 2-3 picks each, avoiding
// a lone 1-pick remainder (4 -> 2+2, 7 -> 3+2+2, 8 -> 3+3+2, ...).
export function groupSelections<T>(items: T[]): T[][] {
  const groups: T[][] = [];
  let i = 0;
  while (i < items.length) {
    const left = items.length - i;
    let size: number;
    if (left <= TIP_MAX_PER_GROUP) {
      size = left;
    } else {
      // Leave enough behind so no tip ever ends up with a single pick.
      const afterMax = left - TIP_MAX_PER_GROUP;
      size = afterMax === 1 ? TIP_MAX_PER_GROUP - 1 : TIP_MAX_PER_GROUP;
    }
    groups.push(items.slice(i, i + size));
    i += size;
  }
  return groups;
}

function pickLabel(size: number): Tip['label'] {
  if (size === 1) return 'Single';
  if (size === 2) return 'Double';
  return 'Treble';
}

// Scan every league's upcoming odds and rank the selections that clear
// probability > 65% and odds > 1.50, then split them into separate tips of
// max 2-3 selections (one market per match, best market only).
export function buildTips(leagues: LeagueEvents[]): Tip[] {
  const all: TipSelection[] = [];

  for (const { leagueId, events } of leagues) {
    const league = LEAGUES[leagueId];
    if (!league) continue;

    for (const ev of events ?? []) {
      const odds = parseEventOdds(ev);
      if (!odds) continue;

      const prediction = generatePrediction(odds, { ...EMPTY_FORM }, { ...EMPTY_FORM });
      const candidates = buildMatchCandidates(prediction)
        .sort(
          (a, b) =>
            b.probability - a.probability || b.odds - a.odds
        );

      if (!candidates.length) continue;

      const matchId = `${ev?.home_team ?? ''}-${ev?.away_team ?? ''}-${ev?.commence_time ?? ''}`;
      const best = candidates[0]; // strongest market of this match only
      all.push({
        id: `${matchId}-${best.marketCode}`,
        leagueId,
        leagueName: league.name,
        leagueFlag: league.flag,
        kickoff: ev?.commence_time ?? '',
        homeTeam: ev?.home_team ?? 'Home',
        awayTeam: ev?.away_team ?? 'Away',
        market: best.market,
        marketCode: best.marketCode,
        probability: best.probability,
        odds: best.odds,
      });
    }
  }

  // Best picks first: highest FootballIQ probability, then best price.
  all.sort((a, b) => b.probability - a.probability || b.odds - a.odds);
  const top = all.slice(0, TIP_MAX_SELECTIONS);

  return groupSelections(top).map((selections, idx) => {
    const combinedOdds = selections.reduce((acc, s) => acc * s.odds, 1);
    const combinedPct = selections.reduce((acc, s) => acc * (s.probability / 100), 1) * 100;
    return {
      id: `tip-${idx + 1}`,
      label: pickLabel(selections.length),
      combinedOdds,
      combinedPct,
      selections,
    };
  });
}
