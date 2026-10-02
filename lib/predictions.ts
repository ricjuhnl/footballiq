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

// Build a prediction from averaged bookmaker odds. Without odds there is
// nothing to base a prediction on, so this returns null.
export function generatePrediction(odds: MatchOdds | null): Prediction | null {
  if (!odds || odds.homeWin <= 0) return null;

  // Bookmaker-implied probabilities (already margin-normalized by parseEventOdds).
  let homeWinPct = odds.homeWin;
  let drawPct = odds.draw;
  let awayWinPct = odds.awayWin;

  // Normalize to 100% (defensive; parseEventOdds already returns ~100).
  const total = homeWinPct + drawPct + awayWinPct;
  if (total > 0) {
    homeWinPct = (homeWinPct / total) * 100;
    drawPct = (drawPct / total) * 100;
    awayWinPct = (awayWinPct / total) * 100;
  }

  const over25Pct = odds.over25;

  // BTTS estimate from the Over/Under 2.5 line (goal expectancy proxy).
  const bttsPct = Math.max(30, Math.min(over25Pct * 0.9 + 15, 85));

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
    oddsAvailable: true,
    homeOdds: odds.homeOdds,
    drawOdds: odds.drawOdds,
    awayOdds: odds.awayOdds,
    over25Odds: odds.over25Odds,
    under25Odds: odds.under25Odds,
  };
}