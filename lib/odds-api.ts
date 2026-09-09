import { cachedFetch } from './api-cache';

const BASE_URL = 'https://api.the-odds-api.com/v4';

// Stable numeric id from a string (event ids from The Odds API are hex strings).
export function hashId(str: string): number {
  let h = 0;
  const s = str ?? '';
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Fetch upcoming odds (1X2 + Over/Under 2.5) for a league sport key.
export async function getOdds(sportKey: string) {
  return cachedFetch(`odds_${sportKey}`, async () => {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      console.warn('ODDS_API_KEY not set');
      return [];
    }

    try {
      const url = `${BASE_URL}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
      const res = await fetch(url, { next: { revalidate: 86400 } });

      if (!res.ok) {
        console.warn(`Odds API (odds) error: ${res.status} for ${sportKey}`);
        return [];
      }

      const data = await res.json();
      return data ?? [];
    } catch (err: any) {
      console.error('Odds API fetch error:', err?.message);
      return [];
    }
  });
}

// Fetch recently completed (and live) matches with scores for a league.
export async function getScores(sportKey: string, daysFrom: number = 3) {
  return cachedFetch(`scores_${sportKey}_${daysFrom}`, async () => {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      console.warn('ODDS_API_KEY not set');
      return [];
    }

    try {
      const url = `${BASE_URL}/sports/${sportKey}/scores/?apiKey=${apiKey}&daysFrom=${daysFrom}`;
      const res = await fetch(url, { next: { revalidate: 86400 } });

      if (!res.ok) {
        console.warn(`Odds API (scores) error: ${res.status} for ${sportKey}`);
        return [];
      }

      const data = await res.json();
      return data ?? [];
    } catch (err: any) {
      console.error('Odds API scores fetch error:', err?.message);
      return [];
    }
  });
}

export interface MatchOdds {
  homeWin: number;
  draw: number;
  awayWin: number;
  over25: number;
  under25: number;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  over25Odds: number;
  under25Odds: number;
  bookmaker: string;
  bookmakerCount: number;
}

function avg(nums: number[]): number {
  const valid = nums.filter((n) => typeof n === 'number' && n > 0);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Parse a single Odds API event into averaged odds + implied probabilities.
export function parseEventOdds(event: any): MatchOdds | null {
  const bookmakers = event?.bookmakers ?? [];
  if (!bookmakers.length) return null;

  const homeName = event?.home_team;
  const awayName = event?.away_team;

  const homePrices: number[] = [];
  const drawPrices: number[] = [];
  const awayPrices: number[] = [];
  const overPrices: number[] = [];
  const underPrices: number[] = [];

  for (const bm of bookmakers) {
    const h2h = bm?.markets?.find((m: any) => m?.key === 'h2h');
    if (h2h) {
      const o = h2h?.outcomes ?? [];
      const h = o.find((x: any) => x?.name === homeName)?.price;
      const d = o.find((x: any) => x?.name === 'Draw')?.price;
      const a = o.find((x: any) => x?.name === awayName)?.price;
      if (h) homePrices.push(h);
      if (d) drawPrices.push(d);
      if (a) awayPrices.push(a);
    }
    const totals = bm?.markets?.find((m: any) => m?.key === 'totals');
    if (totals) {
      const o = totals?.outcomes ?? [];
      const over = o.find((x: any) => x?.name === 'Over' && x?.point === 2.5)?.price;
      const under = o.find((x: any) => x?.name === 'Under' && x?.point === 2.5)?.price;
      if (over) overPrices.push(over);
      if (under) underPrices.push(under);
    }
  }

  const homeOdds = avg(homePrices);
  const drawOdds = avg(drawPrices);
  const awayOdds = avg(awayPrices);
  const over25Odds = avg(overPrices);
  const under25Odds = avg(underPrices);

  if (!(homeOdds > 0 && drawOdds > 0 && awayOdds > 0)) return null;

  const totalH2H = 1 / homeOdds + 1 / drawOdds + 1 / awayOdds;
  const totalOU = (over25Odds > 0 ? 1 / over25Odds : 0) + (under25Odds > 0 ? 1 / under25Odds : 0);

  return {
    homeWin: (1 / homeOdds / totalH2H) * 100,
    draw: (1 / drawOdds / totalH2H) * 100,
    awayWin: (1 / awayOdds / totalH2H) * 100,
    over25: totalOU > 0 ? (1 / over25Odds / totalOU) * 100 : 0,
    under25: totalOU > 0 ? (1 / under25Odds / totalOU) * 100 : 0,
    homeOdds,
    drawOdds,
    awayOdds,
    over25Odds,
    under25Odds,
    bookmaker: `${bookmakers.length} bookmakers (avg)`,
    bookmakerCount: bookmakers.length,
  };
}

// Legacy matcher kept for compatibility: find odds for a named fixture.
export function findMatchOdds(oddsData: any[], homeTeam: string, awayTeam: string): MatchOdds | null {
  if (!oddsData?.length) return null;
  const normalize = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const searchHome = normalize(homeTeam);
  const searchAway = normalize(awayTeam);

  for (const event of oddsData) {
    const eventHome = normalize(event?.home_team ?? '');
    const eventAway = normalize(event?.away_team ?? '');
    const homeMatch = eventHome.includes(searchHome) || searchHome.includes(eventHome);
    const awayMatch = eventAway.includes(searchAway) || searchAway.includes(eventAway);
    if (homeMatch && awayMatch) return parseEventOdds(event);
  }
  return null;
}

// Build a normalized recent-results list from The Odds API /scores response.
export function buildRecentResults(scoresData: any[]): any[] {
  const completed = (scoresData ?? []).filter((m: any) => m?.completed && m?.scores?.length);

  const results = completed.map((m: any) => {
    const scores = m?.scores ?? [];
    const homeScoreRaw = scores.find((s: any) => s?.name === m?.home_team)?.score;
    const awayScoreRaw = scores.find((s: any) => s?.name === m?.away_team)?.score;
    const homeGoals = homeScoreRaw != null ? parseInt(homeScoreRaw, 10) : null;
    const awayGoals = awayScoreRaw != null ? parseInt(awayScoreRaw, 10) : null;

    let homeWinner: boolean | null = null;
    let awayWinner: boolean | null = null;
    if (homeGoals != null && awayGoals != null) {
      if (homeGoals > awayGoals) { homeWinner = true; awayWinner = false; }
      else if (homeGoals < awayGoals) { homeWinner = false; awayWinner = true; }
    }

    return {
      fixture: {
        id: hashId(m?.id ?? `${m?.home_team}-${m?.away_team}-${m?.commence_time}`),
        date: m?.commence_time ?? '',
        status: { short: 'FT', long: 'Match Finished' },
      },
      teams: {
        home: { id: 0, name: m?.home_team ?? 'Home', logo: '', winner: homeWinner },
        away: { id: 0, name: m?.away_team ?? 'Away', logo: '', winner: awayWinner },
      },
      goals: { home: homeGoals, away: awayGoals },
      source: 'odds',
    };
  });

  // Most recent first
  results.sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime());
  return results;
}
