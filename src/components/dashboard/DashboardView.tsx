import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Percent,
  Activity,
  Award,
  Flame,
  ShieldCheck,
  Calendar as CalendarIcon,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Brain,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  X,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Trade, TradingAccount, Strategy, User } from '../../types/trade';
import { PortfolioStatistics } from '../../utils/calculations';
import { calculateProfitabilityScore, calculateDisciplineScore, calculateConsistencyScore } from '../../utils/scoring';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { UserAvatar } from '../common/UserAvatar';

interface DashboardViewProps {
  user: User | null;
  stats: PortfolioStatistics;
  trades: Trade[];
  accounts: TradingAccount[];
  strategies: Strategy[];
  reportingCurrency: string;
  totalReportingBalance: number;
  privacyMode: boolean;
  onTogglePrivacyMode: () => void;
  onOpenAddTrade: () => void;
  onViewTrade: (trade: Trade) => void;
  onOpenQuickAI: (prompt?: string) => void;
  onOpenCalendarDate: (dateStr: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  stats,
  trades,
  accounts,
  strategies,
  reportingCurrency,
  totalReportingBalance,
  privacyMode,
  onTogglePrivacyMode,
  onOpenAddTrade,
  onViewTrade,
  onOpenQuickAI,
  onOpenCalendarDate,
}) => {
  // Real-time ticking clock & timezone
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeZone = user?.preferences?.timeZone || 'Asia/Kolkata';
  const timeFormat = user?.preferences?.timeFormat || '12h';

  // Format real-time string
  const formattedTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: timeFormat === '12h',
      }).format(currentTime);
    } catch {
      return currentTime.toLocaleTimeString();
    }
  }, [currentTime, timeZone, timeFormat]);

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(currentTime);
    } catch {
      return currentTime.toDateString();
    }
  }, [currentTime, timeZone]);

  // Greeting based on local hour
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  // Chart modes
  const [chartMetric, setChartMetric] = useState<'equity' | 'pnl' | 'drawdown' | 'r'>('equity');
  const [chartTimeframe, setChartTimeframe] = useState<'1W' | '1M' | '3M' | 'YTD' | 'ALL'>('ALL');

  // Score transparency modal
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

  // Widget customizer modal
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [widgets, setWidgets] = useState(
    user?.preferences?.dashboardWidgets || {
      balance: true,
      profitabilityScore: true,
      disciplineScore: true,
      currentStreak: true,
      secondaryMetrics: true,
      performanceChart: true,
      aiInsight: true,
      needsAttention: true,
      calendar: true,
      todayStats: true,
      strategyEdge: true,
      recentTrades: true,
    }
  );

  // Closed trades
  const closedTrades = useMemo(() => {
    return trades
      .filter((t) => t.status === 'closed' || (t.status !== 'open' && t.exitPrice !== undefined))
      .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());
  }, [trades]);

  // Scores
  const profitabilityAnalysis = useMemo(
    () => calculateProfitabilityScore(stats, trades),
    [stats, trades]
  );
  const disciplineAnalysis = useMemo(() => calculateDisciplineScore(trades), [trades]);
  const consistencyScore = useMemo(
    () => calculateConsistencyScore(stats, trades),
    [stats, trades]
  );

  // Starting balance
  const totalStartingBalance = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (a.startingBalance || 0), 0);
  }, [accounts]);

  // Overall percentage return
  const overallReturnPct = useMemo(() => {
    if (totalStartingBalance <= 0) return 0;
    return Number(((stats.netPnL / totalStartingBalance) * 100).toFixed(2));
  }, [stats.netPnL, totalStartingBalance]);

  // Today's Performance
  const todayDateStr = currentTime.toISOString().split('T')[0];
  const todayTrades = useMemo(() => {
    return trades.filter((t) => (t.exitDate || t.entryDate).startsWith(todayDateStr));
  }, [trades, todayDateStr]);

  const todayStats = useMemo(() => {
    const net = todayTrades.reduce((sum, t) => sum + (t.netPnLReporting ?? t.netPnL), 0);
    const totalR = todayTrades.reduce((sum, t) => sum + (t.actualRMultiple || 0), 0);
    const wins = todayTrades.filter((t) => t.netPnL > 0.0001).length;
    return {
      tradesCount: todayTrades.length,
      netPnL: net,
      totalR: Number(totalR.toFixed(2)),
      wins,
    };
  }, [todayTrades]);

  // Performance Chart Data
  const chartData = useMemo(() => {
    let runningBalance = totalStartingBalance;
    let runningPnL = 0;
    let runningR = 0;
    let peakBalance = runningBalance;

    const points: any[] = [{ date: 'Start', balance: runningBalance, pnl: 0, drawdown: 0, r: 0 }];

    closedTrades.forEach((t) => {
      const pnl = t.netPnLReporting !== undefined ? t.netPnLReporting : t.netPnL;
      runningBalance += pnl;
      runningPnL += pnl;
      runningR += t.actualRMultiple || 0;

      if (runningBalance > peakBalance) peakBalance = runningBalance;
      const dd = peakBalance > 0 ? ((peakBalance - runningBalance) / peakBalance) * 100 : 0;

      points.push({
        date: formatDate(t.exitDate || t.entryDate, 'YYYY-MM-DD'),
        balance: Number(runningBalance.toFixed(2)),
        pnl: Number(runningPnL.toFixed(2)),
        drawdown: Number(-dd.toFixed(2)),
        r: Number(runningR.toFixed(2)),
      });
    });

    return points;
  }, [closedTrades, totalStartingBalance]);

  // "Needs Attention" flags (Section 26)
  const attentionItems = useMemo(() => {
    const items: { label: string; details: string; severity: 'high' | 'medium' }[] = [];

    if (stats.currentStreak.type === 'loss' && stats.currentStreak.count >= 2) {
      items.push({
        label: `Active Losing Streak: ${stats.currentStreak.count} trades`,
        details: 'Review execution quality and verify whether stop losses are being respected.',
        severity: 'high',
      });
    }

    const recentFomo = trades.slice(0, 5).filter((t) => (t.notes?.mistakes || []).includes('FOMO'));
    if (recentFomo.length >= 1) {
      items.push({
        label: `${recentFomo.length} recent FOMO trades detected`,
        details: 'Emotional chasing of moves outside of planned playbook criteria.',
        severity: 'high',
      });
    }

    if (stats.maxDrawdownPercentage >= 5) {
      items.push({
        label: `Current Drawdown: ${stats.maxDrawdownPercentage}% from peak`,
        details: 'Preserve capital by reducing position sizing until equity stabilizes.',
        severity: 'medium',
      });
    }

    if (stats.ruleAdherenceRate < 80) {
      items.push({
        label: `Discipline rate dipped to ${stats.ruleAdherenceRate}%`,
        details: 'Rules checklist was omitted on several recent trades.',
        severity: 'medium',
      });
    }

    return items;
  }, [stats, trades]);

  // Helper for masking numbers in Privacy Mode
  const mask = (valueText: string) => {
    if (!privacyMode) return valueText;
    return '••••••';
  };

  return (
    <div className="space-y-6">
      {/* 1. DASHBOARD HEADER (Section 19) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="xl" className="border-2 border-emerald-500" />
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
              <span className="truncate max-w-[240px] sm:max-w-none">{greeting}, {user?.name || 'Trader'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold hidden sm:inline-block">
                Active Session
              </span>
            </h2>
            <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 font-mono text-[11px]">
              <span>{formattedDate}</span>
              <span>·</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formattedTime}</span>
              <span>·</span>
              <span className="text-zinc-400">{timeZone}</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Privacy Mode Toggle */}
          <button
            onClick={onTogglePrivacyMode}
            title={privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode (Mask Balances)'}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              privacyMode
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            {privacyMode ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-zinc-500" />}
            <span className="hidden sm:inline">{privacyMode ? 'Private' : 'Public'}</span>
          </button>

          {/* Ask AI Global Shortcut */}
          <button
            onClick={() => onOpenQuickAI()}
            className="p-2 sm:px-3 sm:py-2 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {/* Customise Dashboard Button */}
          <button
            onClick={() => setIsCustomizeOpen(true)}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
            title="Customise Dashboard Widgets"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. ROW 1: LARGE BALANCE & SCORES (Sections 20, 21, 22, 23) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Large Balance Card */}
        {widgets.balance && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider truncate">Current Portfolio Balance</span>
                <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                {mask(formatCurrency(totalReportingBalance, reportingCurrency))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center gap-2 text-zinc-500">
                <span className="shrink-0">Starting Balance:</span>
                <span className="text-zinc-800 dark:text-zinc-200 text-right truncate">
                  {mask(formatCurrency(totalStartingBalance, reportingCurrency))}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-zinc-500 shrink-0">Net Trading P&amp;L:</span>
                <span className={`text-right truncate font-bold ${stats.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {mask(formatCurrency(stats.netPnL, reportingCurrency, { showSign: true }))}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 text-zinc-500">
                <span className="shrink-0">Overall Return:</span>
                <span className={`text-right truncate font-semibold ${overallReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {overallReturnPct >= 0 ? '+' : ''}{overallReturnPct}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Profitability Score Card */}
        {widgets.profitabilityScore && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Profitability Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
                    {profitabilityAnalysis.isCalculable ? `${profitabilityAnalysis.overallScore}` : '0'}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">/ 100</span>
                </div>
              </div>
              <button
                onClick={() => setIsScoreModalOpen(true)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                title="View Score Calculation Transparency"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {profitabilityAnalysis.status}
                </span>
                <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                  {trades.length === 0 ? '0 trades' : `${trades.length} trades`}
                </span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${profitabilityAnalysis.overallScore}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 line-clamp-1">
                Multi-factor: profit factor, expectancy, drawdown &amp; consistency.
              </p>
            </div>
          </div>
        )}

        {/* Current Streak Card */}
        {widgets.currentStreak && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">Current Streak</span>
                <Flame className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-2xl sm:text-3xl font-extrabold font-mono truncate ${
                    stats.currentStreak.type === 'win'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : stats.currentStreak.type === 'loss'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {stats.currentStreak.count > 0 ? (
                    <>
                      {stats.currentStreak.type === 'win' ? '🔥 ' : ''}
                      {stats.currentStreak.count} {stats.currentStreak.type === 'win' ? 'Wins' : 'Losses'}
                    </>
                  ) : (
                    'Neutral (0)'
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 gap-2 text-xs font-mono text-zinc-500">
              <div className="min-w-0">
                <span className="text-[10px] uppercase text-zinc-400 block leading-tight mb-0.5 truncate">Best Win Streak</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block truncate">{stats.bestStreak.win} in a row</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase text-zinc-400 block leading-tight mb-0.5 truncate">Worst Loss Streak</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block truncate">{stats.bestStreak.loss} in a row</span>
              </div>
            </div>
          </div>
        )}

        {/* Discipline Score Card */}
        {widgets.disciplineScore && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Discipline Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
                    {disciplineAnalysis.isCalculable ? `${disciplineAnalysis.overallScore}` : '0'}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">/ 100</span>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {disciplineAnalysis.status}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                  Separate from P&amp;L
                </span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${disciplineAnalysis.overallScore}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 line-clamp-1">
                Measures adherence to stop loss, trade count limits &amp; playbook checklists.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. ROW 2: SECONDARY PRIMARY METRICS */}
      {widgets.secondaryMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs text-xs min-w-0">
            <span className="text-zinc-400 block text-[10px] uppercase font-mono mb-1 truncate">Net Realised P&amp;L</span>
            <div
              className={`font-mono text-base font-bold truncate ${
                stats.netPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {mask(formatCurrency(stats.netPnL, reportingCurrency, { showSign: true }))}
            </div>
            <span className="text-[10px] text-zinc-400 block truncate">{stats.closedTrades} closed trades</span>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs text-xs min-w-0">
            <span className="text-zinc-400 block text-[10px] uppercase font-mono mb-1 truncate">Win Rate</span>
            <div className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {stats.winRate}%
            </div>
            <span className="text-[10px] text-zinc-400 block truncate">{stats.winningTrades}W · {stats.losingTrades}L</span>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs text-xs min-w-0">
            <span className="text-zinc-400 block text-[10px] uppercase font-mono mb-1 truncate">Profit Factor</span>
            <div className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {stats.profitFactor}
            </div>
            <span className="text-[10px] text-zinc-400 block truncate">{stats.expectancy > 0 ? `+${stats.expectancy}` : stats.expectancy} exp</span>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs text-xs min-w-0">
            <span className="text-zinc-400 block text-[10px] uppercase font-mono mb-1 truncate">Average R</span>
            <div className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {stats.averageR > 0 ? `+${stats.averageR}R` : `${stats.averageR}R`}
            </div>
            <span className="text-[10px] text-zinc-400 block truncate">Payoff multiple</span>
          </div>

          <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs text-xs col-span-2 sm:col-span-1 min-w-0">
            <span className="text-zinc-400 block text-[10px] uppercase font-mono mb-1 truncate">Max Drawdown</span>
            <div className="font-mono text-base font-bold text-rose-600 dark:text-rose-400 truncate">
              {mask(formatCurrency(stats.maxDrawdownAmount, reportingCurrency))}
            </div>
            <span className="text-[10px] text-zinc-400 block truncate">({stats.maxDrawdownPercentage}%)</span>
          </div>
        </div>
      )}

      {/* 4. ROW 3: PERFORMANCE CHART & AI COACH INSIGHT (Sections 25 & 27) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Large Account Performance Chart (2 Cols) */}
        {widgets.performanceChart && (
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Account Performance Trajectory</h3>
                <p className="text-xs text-zinc-500">Visualizing equity, cumulative returns, or R-multiples over time.</p>
              </div>

              {/* Metric Selectors */}
              <div className="flex flex-wrap items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-md text-xs font-medium">
                <button
                  onClick={() => setChartMetric('equity')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    chartMetric === 'equity' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Equity
                </button>
                <button
                  onClick={() => setChartMetric('pnl')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    chartMetric === 'pnl' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  P&amp;L
                </button>
                <button
                  onClick={() => setChartMetric('r')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    chartMetric === 'r' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  R-Multiple
                </button>
                <button
                  onClick={() => setChartMetric('drawdown')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    chartMetric === 'drawdown' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Drawdown
                </button>
              </div>
            </div>

            {/* Chart Container */}
            <div className="h-72 w-full">
              {chartData.length <= 1 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                  Insufficient trade history to plot chart. Add closed trades to visualize curve.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartMetric === 'drawdown' ? '#f43f5e' : '#10b981'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartMetric === 'drawdown' ? '#f43f5e' : '#10b981'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v) =>
                        privacyMode
                          ? '•••'
                          : chartMetric === 'r'
                          ? `${v}R`
                          : chartMetric === 'drawdown'
                          ? `${v}%`
                          : formatCurrency(v, reportingCurrency, { compact: true })
                      }
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        privacyMode
                          ? '••••••'
                          : chartMetric === 'r'
                          ? `${val}R`
                          : chartMetric === 'drawdown'
                          ? `${val}%`
                          : formatCurrency(Number(val), reportingCurrency),
                        chartMetric.toUpperCase(),
                      ]}
                      contentStyle={{
                        backgroundColor: 'rgba(24, 24, 27, 0.95)',
                        borderColor: '#3f3f46',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={chartMetric === 'equity' ? 'balance' : chartMetric}
                      stroke={chartMetric === 'drawdown' ? '#f43f5e' : '#10b981'}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#curveGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* AI Coach Insight Card (Section 25) */}
        {widgets.aiInsight && (
          <div className="bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-zinc-900 border border-purple-200 dark:border-purple-800/60 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  AI Coach Insight
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Journal Grounded</span>
              </div>

              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {trades.length === 0
                  ? 'Ready to track your statistical edge and psychology.'
                  : 'Trades following all playbook checklist rules produced superior risk-adjusted returns.'}
              </h4>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {trades.length === 0
                  ? 'Everything is initialized at zero. As you add trading accounts and record executions, your AI Coach will automatically detect behavioral patterns, common mistakes, and rule compliance.'
                  : 'Your journal proves that procedural compliance directly drives your payoff expectancy. Maintain strict stop losses and verify your playbook checklist before entering.'}
              </p>
            </div>

            <div className="pt-3 border-t border-purple-100 dark:border-purple-900/40 flex items-center gap-2">
              <button
                onClick={() => onOpenQuickAI(trades.length === 0 ? 'How should I structure my trading journal and risk rules?' : 'Why did my low-discipline trades produce lower average R?')}
                className="flex-1 py-1.5 px-3 rounded-lg bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-700 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 transition-colors text-center"
              >
                {trades.length === 0 ? 'Getting Started' : 'Ask Why'}
              </button>
              <button
                onClick={() => onOpenQuickAI(trades.length === 0 ? 'Help me set up my risk rules and playbook' : 'Analyse my checklist adherence vs R-multiple results')}
                className="flex-1 py-1.5 px-3 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition-colors text-center"
              >
                Ask Coach
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. ROW 4: NEEDS ATTENTION, CALENDAR, TODAY'S STATS (Sections 26, 28, 29) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Needs Attention Card (Section 26) */}
        {widgets.needsAttention && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Needs Attention ({attentionItems.length})
            </h4>

            {attentionItems.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All risk boundaries intact. No urgent process alerts.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {attentionItems.map((item, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-xs space-y-0.5 ${
                      item.severity === 'high'
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                        : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <span className="font-bold block">{item.label}</span>
                    <p className="text-[11px] opacity-90 leading-tight">{item.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Today's Performance (Section 29) */}
        {widgets.todayStats && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
                Today's Session
              </h4>
              <span className="text-[11px] font-mono text-zinc-400">
                {todayStats.tradesCount} / 3 Daily Max
              </span>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Net P&amp;L</span>
                <span
                  className={`text-base font-bold ${
                    todayStats.netPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                  }`}
                >
                  {mask(formatCurrency(todayStats.netPnL, reportingCurrency, { showSign: true }))}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Total R Multiple</span>
                <span
                  className={`text-base font-bold ${
                    todayStats.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                  }`}
                >
                  {todayStats.totalR > 0 ? `+${todayStats.totalR}R` : `${todayStats.totalR}R`}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-zinc-500">
                <span>Discipline Compliance:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {todayTrades.length > 0 ? `${stats.ruleAdherenceRate}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                <span>Session Status:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {todayTrades.length > 0 ? 'Active Trades' : 'No trades today'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Quick Actions */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider mb-1">
              Quick Journal Action
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Execution excellence begins with complete trade logging before market memory fades.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={onOpenAddTrade}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>+ Record New Trade</span>
            </button>
            <button
              onClick={() => onOpenQuickAI('Review today’s trades and discipline')}
              className="w-full py-2 px-3 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span>Review Session with AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. ROW 5: STRATEGY PERFORMANCE & RECENT TRADES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Strategy Playbook Edge */}
        {widgets.strategyEdge && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
              Playbook Strategy Edge
            </h4>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {strategies.map((strat) => {
                const sTrades = trades.filter((t) => t.strategyId === strat.id || t.strategyName === strat.name);
                const sNet = sTrades.reduce((sum, t) => sum + (t.netPnLReporting ?? t.netPnL), 0);
                const wins = sTrades.filter((t) => t.netPnL > 0.0001).length;
                const winRate = sTrades.length > 0 ? Math.round((wins / sTrades.length) * 100) : 0;

                return (
                  <div key={strat.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{strat.name}</span>
                      <span className="text-[11px] text-zinc-400">
                        {sTrades.length} trades · {winRate}% win rate · Min 1:{strat.minRR} R:R
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        sNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                      }`}
                    >
                      {mask(formatCurrency(sNet, reportingCurrency, { showSign: true }))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Trades List */}
        {widgets.recentTrades && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
                Recent Ledger Activity
              </h4>
              <button
                onClick={onOpenAddTrade}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                + Add Trade
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {trades.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => onViewTrade(t)}
                  className="py-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono font-bold text-xs ${
                        t.direction === 'long' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                      }`}
                    >
                      {t.direction.toUpperCase()}
                    </span>
                    <div>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mr-2">{t.symbol}</span>
                      <span className="text-[11px] text-zinc-400">{formatDate(t.entryDate, 'YYYY-MM-DD')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    {t.actualRMultiple !== undefined && t.plannedRiskAmount && t.plannedRiskAmount > 0 && (
                      <span className={t.actualRMultiple > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {t.actualRMultiple > 0 ? `+${t.actualRMultiple}R` : `${t.actualRMultiple}R`}
                      </span>
                    )}
                    <span className={`font-bold ${t.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {mask(formatCurrency(t.netPnL, t.tradeCurrency, { showSign: true }))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SCORE TRANSPARENCY MODAL (Section 59) */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-xs text-zinc-900 dark:text-zinc-100 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold">How is my Profitability Score calculated?</h3>
              </div>
              <button onClick={() => setIsScoreModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-zinc-500 leading-relaxed">
              This score normalises multi-factor statistics so that no single lucky outlier trade can distort your rating. It measures edge, payoff asymmetry, capital preservation, and equity retracements.
            </p>

            <div className="space-y-2.5 pt-2">
              {profitabilityAnalysis.components.map((c) => (
                <div key={c.name} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>{c.name} (Weight: {c.weight}%)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{c.score} / 100</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{c.description}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[11px] text-zinc-400">
              <span>Overall Score: <strong className="text-zinc-900 dark:text-zinc-100">{profitabilityAnalysis.overallScore}/100</strong></span>
              <button
                onClick={() => setIsScoreModalOpen(false)}
                className="px-4 py-1.5 font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE DASHBOARD MODAL (Section 36) */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold">Customise Dashboard Widgets</h3>
              <button onClick={() => setIsCustomizeOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {Object.entries(widgets).map(([key, val]) => (
                <label key={key} className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) => setWidgets({ ...widgets, [key]: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                </label>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
              >
                Save Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
