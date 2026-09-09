import { cachedFetch } from './api-cache';

const BASE_URL = 'https://api.football-data.org/v4';

// Map our internal league ids to football-data.org competition codes.
// Europa League (id 3) is intentionally absent: it is not on the free plan, so
// it has no standings (predictions/results only).
export const FD_COMPETITION_CODES: Record<number, string> = {
  39: 'PL', // Premier League
  140: 'PD', // La Liga (Primera Division)
  78: 'BL1', // Bundesliga
  135: 'SA', // Serie A
  61: 'FL1', // Ligue 1
  88: 'DED', // Eredivisie
  2: 'CL', // UEFA Champions League
};

export interface StandingsEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  form: string | null;
  description: string | null;
}

export interface StandingsResult {
  standings: StandingsEntry[];
  seasonLabel: string | null;
  currentMatchday: number | null;
}

function seasonLabelFrom(start?: string, end?: string): string | null {
  const s = start ? new Date(start).getUTCFullYear() : null;
  const e = end ? new Date(end).getUTCFullYear() : null;
  if (s && e) return `${s}/${String(e).slice(2)}`;
  if (s) return String(s);
  return null;
}

export async function getStandings(leagueId: number): Promise<StandingsResult> {
  const code = FD_COMPETITION_CODES[leagueId];
  if (!code) return { standings: [], seasonLabel: null, currentMatchday: null };

  const url = `${BASE_URL}/competitions/${code}/standings`;

  return cachedFetch(url, () => fetchStandings(url));
}

async function fetchStandings(url: string): Promise<StandingsResult> {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) {
    console.warn('FOOTBALL_DATA_KEY is not set');
    return { standings: [], seasonLabel: null, currentMatchday: null };
  }

  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 86400 },
  });

  if (res.status === 429) {
    console.warn('football-data.org rate limited, returning empty');
    return { standings: [], seasonLabel: null, currentMatchday: null };
  }

  if (!res.ok) {
    console.warn(`football-data.org error: ${res.status} ${res.statusText}`);
    return { standings: [], seasonLabel: null, currentMatchday: null };
  }

  const json = await res.json();
  // Prefer the overall (TOTAL) table.
  const totalTable =
    (json?.standings ?? []).find((s: any) => s?.type === 'TOTAL') ?? json?.standings?.[0];
  const table: any[] = totalTable?.table ?? [];

  const standings: StandingsEntry[] = table.map((row: any) => ({
    rank: row?.position ?? 0,
    // football-data.org team ids do not match the API-Football ids used by the
    // team detail pages, so we set id=0 to disable team navigation from here.
    team: {
      id: 0,
      name: row?.team?.shortName ?? row?.team?.name ?? 'Unknown',
      logo: row?.team?.crest ?? '',
    },
    points: row?.points ?? 0,
    goalsDiff: row?.goalDifference ?? 0,
    all: {
      played: row?.playedGames ?? 0,
      win: row?.won ?? 0,
      draw: row?.draw ?? 0,
      lose: row?.lost ?? 0,
      goals: { for: row?.goalsFor ?? 0, against: row?.goalsAgainst ?? 0 },
    },
    // free tier returns form=null; keep whatever is provided.
    form: typeof row?.form === 'string' ? row.form.replace(/,/g, '') : null,
    description: null,
  }));

  const result: StandingsResult = {
    standings,
    seasonLabel: seasonLabelFrom(json?.season?.startDate, json?.season?.endDate),
    currentMatchday: json?.season?.currentMatchday ?? null,
  };

  return result;
}
