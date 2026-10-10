import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Brain,
  Lightbulb,
  Clock,
  Calendar,
  Layers,
  Star,
  CheckCircle2,
  PieChart as PieIcon,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Trade, Strategy } from '../../types/trade';
import { PortfolioStatistics } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';

interface AnalyticsViewProps {
  stats: PortfolioStatistics;
  trades: Trade[];
  strategies: Strategy[];
  reportingCurrency: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  trades,
  strategies,
  reportingCurrency,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'mistakes' | 'psychology' | 'insights'>('overview');

  const closedTrades = useMemo(() => {
    return trades.filter((t) => t.status === 'closed' || (t.status !== 'open' && t.exitPrice !== undefined));
  }, [trades]);

  // Day of Week Performance (Mon-Fri)
  const weekdayData = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const buckets: Record<string, { name: string; pnl: number; count: number; wins: number }> = {
      Monday: { name: 'Mon', pnl: 0, count: 0, wins: 0 },
      Tuesday: { name: 'Tue', pnl: 0, count: 0, wins: 0 },
      Wednesday: { name: 'Wed', pnl: 0, count: 0, wins: 0 },
      Thursday: { name: 'Thu', pnl: 0, count: 0, wins: 0 },
      Friday: { name: 'Fri', pnl: 0, count: 0, wins: 0 },
    };

    closedTrades.forEach((t) => {
      const d = new Date(t.entryDate);
      const dayName = days[d.getDay()];
      if (buckets[dayName]) {
        const pnl = t.netPnLReporting !== undefined ? t.netPnLReporting : t.netPnL;
        buckets[dayName].pnl += pnl;
        buckets[dayName].count++;
        if (pnl > 0.0001) buckets[dayName].wins++;
      }
    });

    return Object.values(buckets).map((b) => ({
      ...b,
      pnl: Number(b.pnl.toFixed(2)),
      winRate: b.count > 0 ? Math.round((b.wins / b.count) * 100) : 0,
    }));
  }, [closedTrades]);

  // Mistakes Damage Analysis
  const mistakeAnalytics = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalLoss: number; wins: number }>();
    closedTrades.forEach((t) => {
      const mistakes = t.notes?.mistakes || [];
      const pnl = t.netPnLReporting !== undefined ? t.netPnLReporting : t.netPnL;
      mistakes.forEach((m) => {
        const existing = map.get(m) || { name: m, count: 0, totalLoss: 0, wins: 0 };
        existing.count++;
        existing.totalLoss += pnl; // sum pnl for this mistake
        if (pnl > 0.0001) existing.wins++;
        map.set(m, existing);
      });
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        totalLoss: Number(item.totalLoss.toFixed(2)),
        winRate: item.count > 0 ? Math.round((item.wins / item.count) * 100) : 0,
      }))
      .sort((a, b) => a.totalLoss - b.totalLoss); // most negative first
  }, [closedTrades]);

  // Emotional Correlation Analysis
  const emotionAnalytics = useMemo(() => {
    const map = new Map<string, { name: string; count: number; pnl: number; totalR: number; rCount: number }>();
    closedTrades.forEach((t) => {
      const emotions = t.psychology?.emotions || [];
      const pnl = t.netPnLReporting !== undefined ? t.netPnLReporting : t.netPnL;
      emotions.forEach((e) => {
        const existing = map.get(e) || { name: e, count: 0, pnl: 0, totalR: 0, rCount: 0 };
        existing.count++;
        existing.pnl += pnl;
        if (t.actualRMultiple !== undefined && t.plannedRiskAmount && t.plannedRiskAmount > 0) {
          existing.totalR += t.actualRMultiple;
          existing.rCount++;
        }
        map.set(e, existing);
      });
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        pnl: Number(item.pnl.toFixed(2)),
        avgR: item.rCount > 0 ? Number((item.totalR / item.rCount).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  // Asset Class breakdown
  const assetClassData = useMemo(() => {
    const map = new Map<string, { name: string; pnl: number; count: number }>();
    closedTrades.forEach((t) => {
      const cls = t.assetClass.toUpperCase();
      const existing = map.get(cls) || { name: cls, pnl: 0, count: 0 };
      const pnl = t.netPnLReporting !== undefined ? t.netPnLReporting : t.netPnL;
      existing.pnl += pnl;
      existing.count++;
      map.set(cls, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  // Rule-based Smart Insights (Section 40)
  const smartInsights = useMemo(() => {
    const insights: { type: 'positive' | 'warning' | 'info'; title: string; text: string }[] = [];

    // 1. Process Discipline correlation
    const disciplinedTrades = closedTrades.filter((t) => (t.disciplineScore ?? 100) >= 80);
    const undisciplinedTrades = closedTrades.filter((t) => (t.disciplineScore ?? 100) < 80);
    if (disciplinedTrades.length > 0 && undisciplinedTrades.length > 0) {
      const discPnL = disciplinedTrades.reduce((s, t) => s + (t.netPnLReporting ?? t.netPnL), 0) / disciplinedTrades.length;
      const undiscPnL = undisciplinedTrades.reduce((s, t) => s + (t.netPnLReporting ?? t.netPnL), 0) / undisciplinedTrades.length;
      if (discPnL > undiscPnL) {
        insights.push({
          type: 'positive',
          title: 'Process Discipline Directly Drives Edge',
          text: `Trades following ≥80% of playbook rules averaged ${formatCurrency(discPnL, reportingCurrency)} vs ${formatCurrency(undiscPnL, reportingCurrency)} on lower discipline setups.`,
        });
      }
    }

    // 2. Costliest Mistake Insight
    if (mistakeAnalytics.length > 0 && mistakeAnalytics[0].totalLoss < 0) {
      const worst = mistakeAnalytics[0];
      insights.push({
        type: 'warning',
        title: `Most Costly Identified Mistake: "${worst.name}"`,
        text: `Trades tagged with "${worst.name}" have accumulated ${formatCurrency(worst.totalLoss, reportingCurrency)} in net losses across ${worst.count} trades (Win Rate: ${worst.winRate}%). Eliminating this one habit would substantially protect capital.`,
      });
    }

    // 3. Best Weekday
    const bestDay = [...weekdayData].sort((a, b) => b.pnl - a.pnl)[0];
    const worstDay = [...weekdayData].sort((a, b) => a.pnl - b.pnl)[0];
    if (bestDay && bestDay.pnl > 0) {
      insights.push({
        type: 'info',
        title: `Highest Profitability Day: ${bestDay.name}`,
        text: `Historically, your best trading day of the week is ${bestDay.name} with ${formatCurrency(bestDay.pnl, reportingCurrency)} net profit (${bestDay.winRate}% win rate across ${bestDay.count} sessions).`,
      });
    }
    if (worstDay && worstDay.pnl < 0) {
      insights.push({
        type: 'warning',
        title: `Underperforming Day: ${worstDay.name}`,
        text: `You have historically given back ${formatCurrency(worstDay.pnl, reportingCurrency)} on ${worstDay.name}s. Consider lowering size or increasing selectivity on this weekday.`,
      });
    }

    // 4. Emotional State Insight
    const calm = emotionAnalytics.find((e) => e.name === 'Calm');
    const fomo = emotionAnalytics.find((e) => e.name === 'FOMO');
    if (calm && fomo) {
      insights.push({
        type: 'info',
        title: 'Calm Mindset vs FOMO Returns',
        text: `Executions with a "Calm" state generated ${formatCurrency(calm.pnl, reportingCurrency)} (Avg ${calm.avgR}R), whereas "FOMO" states generated ${formatCurrency(fomo.pnl, reportingCurrency)} (Avg ${fomo.avgR}R).`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'info',
        title: 'Gathering Behavioral Data',
        text: 'Record additional trades with complete playbook checklists, mistake tags, and psychology ratings to generate deeper empirical pattern analysis.',
      });
    }

    return insights;
  }, [closedTrades, mistakeAnalytics, weekdayData, emotionAnalytics, reportingCurrency]);

  return (
    <div className="space-y-6">
      {/* Sub-tab selection */}
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1.5 rounded-lg text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          Comprehensive Overview
        </button>
        <button
          onClick={() => setActiveSubTab('insights')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'insights'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Smart Insights</span>
        </button>
        <button
          onClick={() => setActiveSubTab('mistakes')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'mistakes'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Mistake Audit</span>
        </button>
        <button
          onClick={() => setActiveSubTab('psychology')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'psychology'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-purple-500" />
          <span>Psychology &amp; Emotions</span>
        </button>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key statistical grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs min-w-0">
              <span className="text-zinc-400 block text-[10px] uppercase font-mono truncate">Gross Profit</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block truncate">
                {formatCurrency(stats.grossProfit, reportingCurrency)}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs min-w-0">
              <span className="text-zinc-400 block text-[10px] uppercase font-mono truncate">Gross Loss</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm block truncate">
                {formatCurrency(stats.grossLoss, reportingCurrency)}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs min-w-0">
              <span className="text-zinc-400 block text-[10px] uppercase font-mono truncate">Win/Loss Ratio</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm block truncate">
                {stats.winLossRatio}x
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs min-w-0">
              <span className="text-zinc-400 block text-[10px] uppercase font-mono truncate">Largest Winner</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block truncate">
                {formatCurrency(stats.largestWinner, reportingCurrency)}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs min-w-0">
              <span className="text-zinc-400 block text-[10px] uppercase font-mono truncate">Largest Loser</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm block truncate">
                {formatCurrency(stats.largestLoser, reportingCurrency)}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs min-w-0">
              <span className="text-zinc-400 block text-[10px] uppercase font-mono truncate">Max Win Streak</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block truncate">
                {stats.bestStreak.win} in a row
              </span>
            </div>
          </div>

          {/* Weekday Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase font-mono">
                Day-of-Week Performance (Monday - Friday)
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(v, reportingCurrency, { compact: true })}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val), reportingCurrency), 'Net P&L']}
                      contentStyle={{
                        backgroundColor: 'rgba(24, 24, 27, 0.95)',
                        borderColor: '#3f3f46',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="pnl">
                      {weekdayData.map((entry, idx) => (
                        <Cell key={`day-${idx}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Asset Class Distribution */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase font-mono">
                Performance by Asset Class
              </h4>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-56 overflow-y-auto text-xs">
                {assetClassData.map((cls) => (
                  <div key={cls.name} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">{cls.name}</span>
                      <span className="text-[10px] text-zinc-400">{cls.count} trades taken</span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        cls.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(cls.pnl, reportingCurrency, { showSign: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SMART INSIGHTS TAB */}
      {activeSubTab === 'insights' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-1">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Empirical Behavior Insights (Rule-based)
            </h4>
            <p className="text-xs text-zinc-500 mb-4">
              These observations are automatically derived strictly from your own trading data to highlight statistical correlations. They are descriptive analytics, not financial advice.
            </p>

            <div className="space-y-3">
              {smartInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border text-xs space-y-1 ${
                    insight.type === 'positive'
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                      : insight.type === 'warning'
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
                      : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <span className="font-bold text-sm block">{insight.title}</span>
                  <p className="leading-relaxed opacity-90">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. MISTAKE AUDIT TAB */}
      {activeSubTab === 'mistakes' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4 shadow-xs">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Mistakes Damage Ledger
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Quantifying the cumulative capital destroyed by recurring trading errors.
            </p>
          </div>

          {mistakeAnalytics.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              No mistakes recorded on trades yet. Tag errors like FOMO, Early Entry, or Stop Moved to view audit data.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden text-xs">
              {mistakeAnalytics.map((item) => (
                <div key={item.name} className="p-3.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 block text-sm">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Committed in {item.count} trades · Win rate when present: {item.winRate}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400 block">
                      {formatCurrency(item.totalLoss, reportingCurrency)}
                    </span>
                    <span className="text-[10px] text-zinc-400">Cumulative Net Impact</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. PSYCHOLOGY TAB */}
      {activeSubTab === 'psychology' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4 shadow-xs">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              Emotional State vs Performance Correlation
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Historical performance partitioned by dominant emotional mindset.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {emotionAnalytics.map((emo) => (
              <div
                key={emo.name}
                className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{emo.name}</span>
                  <span className="text-[10px] font-mono text-zinc-400">{emo.count} trades</span>
                </div>
                <div
                  className={`font-mono font-bold text-base ${
                    emo.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(emo.pnl, reportingCurrency, { showSign: true })}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Average R Multiple: <strong>{emo.avgR > 0 ? `+${emo.avgR}R` : `${emo.avgR}R`}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
