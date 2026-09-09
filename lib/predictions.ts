import { MatchOdds } from './odds-api';

export interface Prediction {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  bttsPct: number;
  over25Pct: number;
  recommendedBet: string;
  confidence: 'High' | 'Medium' | 'Low';
  oddsAvailable: boolean;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  over25Odds: number;
  under25Odds: number;
}

interface TeamForm {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

function calcFormStrength(form: TeamForm): number {
  if (!form?.played) return 0.5;
  const pts = (form.wins ?? 0) * 3 + (form.draws ?? 0) * 1;
  const maxPts = (form.played ?? 1) * 3;
  return maxPts > 0 ? pts / maxPts : 0.5;
}

export function extractTeamForm(fixtures: any[], teamId: number): TeamForm {
  const form: TeamForm = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };

  for (const fix of (fixtures ?? [])) {
    const home = fix?.teams?.home;
    const away = fix?.teams?.away;
    const goals = fix?.goals;
    if (!home || !away || goals == null) continue;

    const isHome = home?.id === teamId;
    const gf = isHome ? (goals?.home ?? 0) : (goals?.away ?? 0);
    const ga = isHome ? (goals?.away ?? 0) : (goals?.home ?? 0);
    const won = isHome ? home?.winner : away?.winner;

    form.played++;
    form.goalsFor += gf;
    form.goalsAgainst += ga;

    if (won === true) form.wins++;
    else if (won === false) form.losses++;
    else form.draws++;
  }

  return form;
}

export function generatePrediction(
  odds: MatchOdds | null,
  homeForm: TeamForm,
  awayForm: TeamForm
): Prediction {
  const homeStrength = calcFormStrength(homeForm);
  const awayStrength = calcFormStrength(awayForm);

  // Form-based probabilities
  const totalStrength = homeStrength + awayStrength;
  const formHomeWin = totalStrength > 0 ? (homeStrength / totalStrength) * 70 : 35;
  const formAwayWin = totalStrength > 0 ? (awayStrength / totalStrength) * 70 : 35;
  const formDraw = 100 - formHomeWin - formAwayWin;

  let homeWinPct: number;
  let drawPct: number;
  let awayWinPct: number;
  let over25Pct: number;
  let bttsPct: number;
  let oddsAvailable = false;

  const hasForm = (homeForm?.played ?? 0) > 0 || (awayForm?.played ?? 0) > 0;

  if (odds && odds.homeWin > 0) {
    oddsAvailable = true;
    if (hasForm) {
      // 60% odds + 40% recent form
      homeWinPct = odds.homeWin * 0.6 + formHomeWin * 0.4;
      drawPct = odds.draw * 0.6 + formDraw * 0.4;
      awayWinPct = odds.awayWin * 0.6 + formAwayWin * 0.4;
    } else {
      // No form data available — rely purely on bookmaker-implied probabilities
      homeWinPct = odds.homeWin;
      drawPct = odds.draw;
      awayWinPct = odds.awayWin;
    }
    over25Pct = odds.over25;
  } else {
    homeWinPct = formHomeWin;
    drawPct = formDraw;
    awayWinPct = formAwayWin;
    // Estimate over 2.5 from form
    const avgGoals = ((homeForm?.goalsFor ?? 0) + (awayForm?.goalsFor ?? 0)) / Math.max((homeForm?.played ?? 1) + (awayForm?.played ?? 1), 1);
    over25Pct = Math.min(avgGoals * 30, 85);
  }

  // Normalize to 100%
  const total = homeWinPct + drawPct + awayWinPct;
  if (total > 0) {
    homeWinPct = (homeWinPct / total) * 100;
    drawPct = (drawPct / total) * 100;
    awayWinPct = (awayWinPct / total) * 100;
  }

  // BTTS prediction
  if (!hasForm && oddsAvailable) {
    // Derive a BTTS estimate from the Over/Under 2.5 line (goal expectancy proxy).
    bttsPct = Math.max(30, Math.min(over25Pct * 0.9 + 15, 85));
  } else {
    const homeAvgGF = (homeForm?.played ?? 0) > 0 ? (homeForm.goalsFor / homeForm.played) : 1;
    const awayAvgGF = (awayForm?.played ?? 0) > 0 ? (awayForm.goalsFor / awayForm.played) : 1;
    const homeAvgGA = (homeForm?.played ?? 0) > 0 ? (homeForm.goalsAgainst / homeForm.played) : 1;
    const awayAvgGA = (awayForm?.played ?? 0) > 0 ? (awayForm.goalsAgainst / awayForm.played) : 1;
    bttsPct = Math.min(((homeAvgGF + awayAvgGA) / 2 + (awayAvgGF + homeAvgGA) / 2) * 25, 85);
  }

  // Recommended bet
  const bets: { label: string; pct: number }[] = [
    { label: 'Home Win', pct: homeWinPct },
    { label: 'Draw', pct: drawPct },
    { label: 'Away Win', pct: awayWinPct },
    { label: 'Over 2.5 Goals', pct: over25Pct },
    { label: 'BTTS Yes', pct: bttsPct },
  ];
  bets.sort((a, b) => b.pct - a.pct);
  const best = bets[0] ?? { label: 'Home Win', pct: 50 };

  // Confidence
  const spread = Math.max(homeWinPct, drawPct, awayWinPct) - Math.min(homeWinPct, drawPct, awayWinPct);
  let confidence: 'High' | 'Medium' | 'Low';
  if (spread > 30) confidence = 'High';
  else if (spread > 15) confidence = 'Medium';
  else confidence = 'Low';

  return {
    homeWinPct: Math.round(homeWinPct * 10) / 10,
    drawPct: Math.round(drawPct * 10) / 10,
    awayWinPct: Math.round(awayWinPct * 10) / 10,
    bttsPct: Math.round(bttsPct * 10) / 10,
    over25Pct: Math.round(over25Pct * 10) / 10,
    recommendedBet: `${best.label} ${Math.round(best.pct)}%`,
    confidence,
    oddsAvailable,
    homeOdds: odds?.homeOdds ?? 0,
    drawOdds: odds?.drawOdds ?? 0,
    awayOdds: odds?.awayOdds ?? 0,
    over25Odds: odds?.over25Odds ?? 0,
    under25Odds: odds?.under25Odds ?? 0,
  };
}
