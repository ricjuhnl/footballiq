'use client';

import { useState } from 'react';
import { LEAGUES, LEAGUE_IDS } from '@/lib/constants';
import StandingsTable from './standings-table';
import RecentResults from './recent-results';
import UpcomingPredictions from './upcoming-predictions';
import BestTips from './best-tips';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, TrendingUp, Sparkles } from 'lucide-react';

const tabs = [
  { id: 'standings', label: 'Standings', icon: Trophy },
  { id: 'results', label: 'Results', icon: Calendar },
  { id: 'predictions', label: 'Predictions', icon: TrendingUp },
  { id: 'tips', label: 'Tips', icon: Sparkles },
] as const;

type TabId = typeof tabs[number]['id'];

export default function LeagueTabs() {
  const [activeLeague, setActiveLeague] = useState<number>(39);
  const [activeTab, setActiveTab] = useState<TabId>('standings');

  const league = LEAGUES[activeLeague];

  // Some leagues (e.g. Europa League) have no standings — hide that tab for them.
  const visibleTabs = tabs.filter((t) => t.id !== 'standings' || league?.hasStandings);

  const selectLeague = (id: number) => {
    setActiveLeague(id);
    // If the newly selected league has no standings but we're on that tab,
    // fall back to Predictions so the content area is never empty.
    if (!LEAGUES[id]?.hasStandings && activeTab === 'standings') {
      setActiveTab('predictions');
    }
  };

  return (
    <div className="space-y-6">
      {/* League selector */}
      <div className="flex flex-wrap gap-2">
        {LEAGUE_IDS.map((id) => {
          const l = LEAGUES[id];
          if (!l) return null;
          const isActive = id === activeLeague;
          return (
            <button
              key={id}
              onClick={() => selectLeague(id)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary shadow-md shadow-primary/5'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <span className="text-lg">{l.flag}</span>
              <span className="hidden sm:inline">{l.name}</span>
              <span className="sm:hidden">{l.country?.slice(0, 3)?.toUpperCase?.() ?? ''}</span>
              {isActive && (
                <motion.div
                  layoutId="league-indicator"
                  className="absolute inset-0 rounded-xl border border-primary/30"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary/30 p-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-lg bg-card shadow-md"
                  style={{ zIndex: -1 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeLeague}-${activeTab}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'standings' && <StandingsTable leagueId={activeLeague} />}
          {activeTab === 'results' && <RecentResults leagueId={activeLeague} />}
          {activeTab === 'predictions' && <UpcomingPredictions leagueId={activeLeague} />}
          {activeTab === 'tips' && <BestTips />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
