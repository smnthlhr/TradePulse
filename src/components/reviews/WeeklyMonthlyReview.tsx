import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Trade, Strategy } from '../../types/trade';
import { calculatePortfolioStats } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

interface WeeklyMonthlyReviewProps {
  trades: Trade[];
  strategies: Strategy[];
  reportingCurrency: string;
}

export const WeeklyMonthlyReview: React.FC<WeeklyMonthlyReviewProps> = ({
  trades,
  strategies,
  reportingCurrency,
}) => {
  const [reviewType, setReviewType] = useState<'weekly' | 'monthly'>('weekly');

  // Weekly reflection user state
  const [weeklyWhatWentWell, setWeeklyWhatWentWell] = useState(
    'Stuck to ORB and Trend Pullback setups. Only had 1 emotional trade and cut it fast.'
  );
  const [weeklyWhatWentWrong, setWeeklyWhatWentWrong] = useState(
    'Exited INFY short slightly premature before final target was met.'
  );
  const [weeklyActionPlan, setWeeklyActionPlan] = useState(
    'Use 15m trailing stop instead of manual early exits. Maintain max 3 trades per session.'
  );

  const stats = useMemo(() => calculatePortfolioStats(trades), [trades]);

  const bestTrade = useMemo(() => {
    return [...trades]
      .filter((t) => t.status === 'closed')
      .sort((a, b) => b.netPnL - a.netPnL)[0];
  }, [trades]);

  const worstTrade = useMemo(() => {
    return [...trades]
      .filter((t) => t.status === 'closed')
      .sort((a, b) => a.netPnL - b.netPnL)[0];
  }, [trades]);

  return (
    <div className="space-y-6">
      {/* Header and Type Toggle */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Periodic Performance Reviews
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Step back from the session noise. Audit performance by cycle, identify recurring errors, and establish discipline goals.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setReviewType('weekly')}
            className={`px-3 py-1 rounded transition-colors ${
              reviewType === 'weekly'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Weekly Review
          </button>
          <button
            onClick={() => setReviewType('monthly')}
            className={`px-3 py-1 rounded transition-colors ${
              reviewType === 'monthly'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Monthly Review
          </button>
        </div>
      </div>

      {/* Review Metrics Card Cluster */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {reviewType === 'weekly' ? 'Week Net P&L' : 'Month Net P&L'}
          </span>
          <span
            className={`font-mono text-xl font-bold ${
              stats.netPnL > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : stats.netPnL < 0
                ? 'text-rose-600'
                : 'text-zinc-600'
            }`}
          >
            {formatCurrency(stats.netPnL, reportingCurrency, { showSign: true })}
          </span>
          <span className="text-[11px] text-zinc-400 block mt-1">
            {stats.closedTrades} closed trades
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Win Rate &amp; PF</span>
          <span className="font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.winRate}%
          </span>
          <span className="text-[11px] text-zinc-400 block mt-1">
            Profit Factor: {stats.profitFactor}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Expectancy &amp; Avg R</span>
          <span className="font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.averageR > 0 ? `+${stats.averageR}R` : `${stats.averageR}R`}
          </span>
          <span className="text-[11px] text-zinc-400 block mt-1">
            Expectancy: {formatCurrency(stats.expectancy, reportingCurrency)}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Rule Discipline</span>
          <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.ruleAdherenceRate}%
          </span>
          <span className="text-[11px] text-zinc-400 block mt-1">
            Checklist adherence rate
          </span>
        </div>
      </div>

      {/* Extreme Trades Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {bestTrade && (
          <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-950/60 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                <Award className="w-4 h-4" /> Best Performing Trade
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                +{formatCurrency(bestTrade.netPnL, bestTrade.tradeCurrency)}
              </span>
            </div>
            <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {bestTrade.symbol} ({bestTrade.direction.toUpperCase()}) · {bestTrade.strategyName || 'Discretionary'}
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 italic">
              "{bestTrade.notes?.positives || bestTrade.notes?.thesis || 'Great discipline.'}"
            </p>
          </div>
        )}

        {worstTrade && worstTrade.netPnL < 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-950/60 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                <AlertTriangle className="w-4 h-4" /> Worst Performing Trade
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                {formatCurrency(worstTrade.netPnL, worstTrade.tradeCurrency)}
              </span>
            </div>
            <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {worstTrade.symbol} ({worstTrade.direction.toUpperCase()}) · {worstTrade.strategyName || 'Discretionary'}
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 italic">
              "{worstTrade.notes?.lessonsLearned || worstTrade.notes?.negatives || 'Need tighter risk control.'}"
            </p>
          </div>
        )}
      </div>

      {/* User Reflection Workspace */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4 text-xs">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase">
          Structured Trader Reflection
        </h4>

        <div>
          <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
            1. What went exceptionally well during this cycle?
          </label>
          <textarea
            rows={3}
            value={weeklyWhatWentWell}
            onChange={(e) => setWeeklyWhatWentWell(e.target.value)}
            className="w-full p-2.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          />
        </div>

        <div>
          <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
            2. What mistakes, emotions, or rule breaches caused damage?
          </label>
          <textarea
            rows={3}
            value={weeklyWhatWentWrong}
            onChange={(e) => setWeeklyWhatWentWrong(e.target.value)}
            className="w-full p-2.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          />
        </div>

        <div>
          <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
            3. What is your single primary improvement commitment for the upcoming cycle?
          </label>
          <textarea
            rows={3}
            value={weeklyActionPlan}
            onChange={(e) => setWeeklyActionPlan(e.target.value)}
            className="w-full p-2.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          />
        </div>
      </div>
    </div>
  );
};
