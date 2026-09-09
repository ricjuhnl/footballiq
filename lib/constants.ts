export interface LeagueInfo {
  id: number;
  name: string;
  country: string;
  flag: string;
  sportKey: string;
  color: string;
  // Whether league standings are available (football-data.org free tier).
  // Europa League has no standings on the free plan → predictions/results only.
  hasStandings: boolean;
}

export const LEAGUES: Record<number, LeagueInfo> = {
  39: {
    id: 39,
    name: 'Premier League',
    country: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    sportKey: 'soccer_epl',
    color: '#3d195b',
    hasStandings: true,
  },
  140: {
    id: 140,
    name: 'La Liga',
    country: 'Spain',
    flag: '🇪🇸',
    sportKey: 'soccer_spain_la_liga',
    color: '#ee8707',
    hasStandings: true,
  },
  78: {
    id: 78,
    name: 'Bundesliga',
    country: 'Germany',
    flag: '🇩🇪',
    sportKey: 'soccer_germany_bundesliga',
    color: '#d20515',
    hasStandings: true,
  },
  135: {
    id: 135,
    name: 'Serie A',
    country: 'Italy',
    flag: '🇮🇹',
    sportKey: 'soccer_italy_serie_a',
    color: '#024494',
    hasStandings: true,
  },
  61: {
    id: 61,
    name: 'Ligue 1',
    country: 'France',
    flag: '🇫🇷',
    sportKey: 'soccer_france_ligue_one',
    color: '#091c3e',
    hasStandings: true,
  },
  88: {
    id: 88,
    name: 'Eredivisie',
    country: 'Netherlands',
    flag: '🇳🇱',
    sportKey: 'soccer_netherlands_eredivisie',
    color: '#e6001e',
    hasStandings: true,
  },
  2: {
    id: 2,
    name: 'Champions League',
    country: 'Europe',
    flag: '🏆',
    sportKey: 'soccer_uefa_champs_league',
    color: '#0a1e5b',
    hasStandings: true,
  },
  3: {
    id: 3,
    name: 'Europa League',
    country: 'Europe',
    flag: '🥇',
    sportKey: 'soccer_uefa_europa_league',
    color: '#ff6a00',
    hasStandings: false,
  },
};

export const LEAGUE_IDS = [39, 140, 78, 135, 61, 88, 2, 3] as const;

// Standings come from football-data.org (current season, always live). Upcoming
// fixtures/predictions and recent scores come from The Odds API, also current.
// External APIs are only called once a day; responses are cached in memory AND
// persisted in the ApiCache DB table so they survive restarts/redeploys.
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (once a day)

// Empty/failed responses are cached for a much shorter time so they can recover
// on the next request instead of being locked stale for a full day.
export const EMPTY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
