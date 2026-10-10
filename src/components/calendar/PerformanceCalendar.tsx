import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Flame,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Plus,
  CheckCircle,
  XCircle,
  X,
  Star,
} from 'lucide-react';
import { Trade, DailyJournalEntry, TradingAccount } from '../../types/trade';
import { formatCurrency } from '../../utils/currency';
import { getDaysInMonth, getMonthName, formatDate } from '../../utils/date';

interface PerformanceCalendarProps {
  trades: Trade[];
  accounts: TradingAccount[];
  dailyJournals: DailyJournalEntry[];
  reportingCurrency: string;
  onSaveDailyJournal: (entry: DailyJournalEntry) => void;
  onViewTrade: (trade: Trade) => void;
  onOpenAddTrade: () => void;
}

export const PerformanceCalendar: React.FC<PerformanceCalendarProps> = ({
  trades,
  accounts,
  dailyJournals,
  reportingCurrency,
  onSaveDailyJournal,
  onViewTrade,
  onOpenAddTrade,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'heatmap'>('calendar');
  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

  // Aggregate trades by date string (YYYY-MM-DD)
  const dailyTradeMap = useMemo(() => {
    const map = new Map<string, { trades: Trade[]; netPnL: number; wins: number; losses: number; count: number }>();
    trades.forEach((t) => {
      // Use exit date for closed trades realized PnL, or entry date
      const d = (t.exitDate || t.entryDate).split('T')[0];
      const existing = map.get(d) || { trades: [], netPnL: 0, wins: 0, losses: 0, count: 0 };
      existing.trades.push(t);
      existing.count++;
      const pnl = t.netPnLReporting !== undefined ? t.netPnLReporting : t.netPnL;
      existing.netPnL += pnl;
      if (pnl > 0.0001) existing.wins++;
      else if (pnl < -0.0001) existing.losses++;
      map.set(d, existing);
    });
    return map;
  }, [trades]);

  // Journal map
  const journalMap = useMemo(() => {
    const map = new Map<string, DailyJournalEntry>();
    dailyJournals.forEach((j) => map.set(j.date, j));
    return map;
  }, [dailyJournals]);

  // Calendar grid padding (first day of week)
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Current selected day details
  const selectedDayData = selectedDayString ? dailyTradeMap.get(selectedDayString) : null;
  const selectedDayJournal = selectedDayString ? journalMap.get(selectedDayString) : null;

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    let monthPnL = 0;
    let monthTrades = 0;
    let winningDays = 0;
    let losingDays = 0;

    daysInMonth.forEach((d) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const dayData = dailyTradeMap.get(dateStr);
      if (dayData && dayData.count > 0) {
        monthPnL += dayData.netPnL;
        monthTrades += dayData.count;
        if (dayData.netPnL > 0) winningDays++;
        else if (dayData.netPnL < 0) losingDays++;
      }
    });

    return {
      monthPnL,
      monthTrades,
      winningDays,
      losingDays,
    };
  }, [daysInMonth, dailyTradeMap]);

  return (
    <div className="space-y-4">
      {/* Calendar Header & Month Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {getMonthName(month)} {year}
            </h3>
            <span className="text-xs text-zinc-500">
              Monthly P&amp;L:{' '}
              <strong
                className={
                  monthlyStats.monthPnL > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : monthlyStats.monthPnL < 0
                    ? 'text-rose-600'
                    : 'text-zinc-500'
                }
              >
                {formatCurrency(monthlyStats.monthPnL, reportingCurrency, { showSign: true })}
              </strong>{' '}
              · {monthlyStats.monthTrades} trades · {monthlyStats.winningDays} Green / {monthlyStats.losingDays} Red days
            </span>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-md text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Monthly Calendar
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'heatmap'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Annual Heatmap
          </button>
        </div>
      </div>

      {/* MONTHLY CALENDAR GRID */}
      {viewMode === 'calendar' ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              {/* Day of week headers */}
              <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-center py-2 text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {/* Blank leading days */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`blank-${i}`} className="min-h-[96px] bg-zinc-50/30 dark:bg-zinc-950/20 p-2" />
                ))}

                {/* Actual Month Days */}
                {daysInMonth.map((dateObj) => {
                  const dayNum = dateObj.getDate();
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const dateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
                  const dayData = dailyTradeMap.get(dateStr);
                  const journal = journalMap.get(dateStr);

                  const hasTrades = dayData && dayData.count > 0;
                  const isProfit = hasTrades && dayData.netPnL > 0.0001;
                  const isLoss = hasTrades && dayData.netPnL < -0.0001;
                  const isBreakeven = hasTrades && !isProfit && !isLoss;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDayString(dateStr)}
                      className={`min-h-[96px] p-2 flex flex-col justify-between cursor-pointer transition-all hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 group relative ${
                        isProfit
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/15'
                          : isLoss
                          ? 'bg-rose-50/50 dark:bg-rose-950/15'
                          : isBreakeven
                          ? 'bg-zinc-100/50 dark:bg-zinc-900/50'
                          : ''
                      }`}
                    >
                      {/* Date & Indicators */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-semibold ${
                            hasTrades
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-400 dark:text-zinc-600'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {journal && (
                          <span title="Daily Journal Entry" className="text-emerald-600 dark:text-emerald-400">
                            <BookOpen className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* Day Performance Stats */}
                      {hasTrades ? (
                        <div className="my-auto space-y-0.5">
                          <div
                            className={`font-mono text-xs sm:text-sm font-bold tracking-tight truncate ${
                              isProfit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isLoss
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-zinc-500'
                            }`}
                          >
                            {formatCurrency(dayData.netPnL, reportingCurrency, { showSign: true, compact: true })}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-x-1 leading-tight mt-0.5">
                            <span className="truncate">{dayData.count} {dayData.count === 1 ? 'trade' : 'trades'}</span>
                            <span className="shrink-0 font-medium font-mono">{dayData.wins}W·{dayData.losses}L</span>
                          </div>
                        </div>
                      ) : (
                        <div className="my-auto text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-zinc-400">+ Journal</span>
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-zinc-400">
                        {/* Quiet bottom separator */}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ANNUAL HEATMAP VIEW */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono uppercase">
              2026 Trading Activity Heatmap
            </h4>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono text-[11px]">
              <span>Loss</span>
              <div className="w-3 h-3 rounded bg-rose-500" />
              <div className="w-3 h-3 rounded bg-rose-300" />
              <div className="w-3 h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="w-3 h-3 rounded bg-emerald-300" />
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Profit</span>
            </div>
          </div>

          <div className="overflow-x-auto py-2">
            <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
              {Array.from({ length: 365 }).map((_, idx) => {
                const date = new Date(year, 0, idx + 1);
                const pad = (n: number) => String(n).padStart(2, '0');
                const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                const dayData = dailyTradeMap.get(dateStr);

                let bgClass = 'bg-zinc-100 dark:bg-zinc-800/60';
                if (dayData && dayData.count > 0) {
                  if (dayData.netPnL > 3000) bgClass = 'bg-emerald-600';
                  else if (dayData.netPnL > 0) bgClass = 'bg-emerald-400';
                  else if (dayData.netPnL < -3000) bgClass = 'bg-rose-600';
                  else bgClass = 'bg-rose-400';
                }

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDayString(dateStr)}
                    title={`${dateStr}: ${dayData ? formatCurrency(dayData.netPnL, reportingCurrency) : 'No trades'}`}
                    className={`w-3.5 h-3.5 rounded-xs ${bgClass} cursor-pointer hover:ring-2 hover:ring-zinc-400 transition-all`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DAILY REVIEW DRAWER / MODAL */}
      {selectedDayString && (
        <DailyReviewModal
          dateStr={selectedDayString}
          trades={selectedDayData ? selectedDayData.trades : []}
          journal={selectedDayJournal}
          reportingCurrency={reportingCurrency}
          onClose={() => setSelectedDayString(null)}
          onSaveJournal={onSaveDailyJournal}
          onViewTrade={onViewTrade}
          onOpenAddTrade={onOpenAddTrade}
        />
      )}
    </div>
  );
};

// Daily Review Modal Component
interface DailyReviewModalProps {
  dateStr: string;
  trades: Trade[];
  journal?: DailyJournalEntry | null;
  reportingCurrency: string;
  onClose: () => void;
  onSaveJournal: (entry: DailyJournalEntry) => void;
  onViewTrade: (trade: Trade) => void;
  onOpenAddTrade: () => void;
}

const DailyReviewModal: React.FC<DailyReviewModalProps> = ({
  dateStr,
  trades,
  journal,
  reportingCurrency,
  onClose,
  onSaveJournal,
  onViewTrade,
  onOpenAddTrade,
}) => {
  // Journal Form state
  const [preMarketOutlook, setPreMarketOutlook] = useState(journal?.preMarketOutlook || '');
  const [keyLevels, setKeyLevels] = useState(journal?.keyLevels || '');
  const [watchlist, setWatchlist] = useState(journal?.watchlist || '');
  const [tradingPlan, setTradingPlan] = useState(journal?.tradingPlan || '');
  const [personalFocus, setPersonalFocus] = useState(journal?.personalFocus || '');

  const [eodWhatWorked, setEodWhatWorked] = useState(journal?.eodWhatWorked || '');
  const [eodWhatFailed, setEodWhatFailed] = useState(journal?.eodWhatFailed || '');
  const [eodRulesFollowed, setEodRulesFollowed] = useState(journal?.eodRulesFollowed ?? true);
  const [eodKeyLesson, setEodKeyLesson] = useState(journal?.eodKeyLesson || '');
  const [eodTomorrowImprovement, setEodTomorrowImprovement] = useState(journal?.eodTomorrowImprovement || '');
  const [dayRating, setDayRating] = useState<number>(journal?.dayRating || 4);

  const totalPnL = trades.reduce((sum, t) => sum + (t.netPnLReporting ?? t.netPnL), 0);
  const wins = trades.filter((t) => t.netPnL > 0.0001).length;
  const losses = trades.filter((t) => t.netPnL < -0.0001).length;

  const handleSave = () => {
    const entry: DailyJournalEntry = {
      id: journal?.id || `journal_${dateStr}`,
      userId: 'user_primary',
      date: dateStr,
      preMarketOutlook,
      keyLevels,
      watchlist,
      tradingPlan,
      personalFocus,
      eodWhatWorked,
      eodWhatFailed,
      eodRulesFollowed,
      eodKeyLesson,
      eodTomorrowImprovement,
      dayRating,
      updatedAt: new Date().toISOString(),
    };
    onSaveJournal(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in fade-in-50 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 shrink-0">
          <div>
            <h3 className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
              Daily Review &amp; Journal: {dateStr}
            </h3>
            <p className="text-xs text-zinc-500">
              Pre-market preparation, trades review, and end-of-day discipline reflections.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Day's Trading Outcome Header */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-zinc-400 block text-[10px] font-mono uppercase">Net Session P&amp;L</span>
              <span
                className={`text-lg font-bold font-mono ${
                  totalPnL > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : totalPnL < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-600'
                }`}
              >
                {formatCurrency(totalPnL, reportingCurrency, { showSign: true })}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 block text-[10px] font-mono uppercase">Trades Taken</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {trades.length} ({wins}W / {losses}L)
              </span>
            </div>

            <div className="flex items-center gap-1 text-amber-400">
              <span className="text-zinc-400 text-[10px] font-mono uppercase block mr-1">Session Rating:</span>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDayRating(s)}
                  className={`p-0.5 ${s <= dayRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}`}
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Trades taken during this day */}
          {trades.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
                Trades Executed Today ({trades.length})
              </span>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden text-xs">
                {trades.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onViewTrade(t)}
                    className="p-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold ${
                          t.direction === 'long' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                        }`}
                      >
                        {t.direction.toUpperCase()}
                      </span>
                      <span className="font-mono font-semibold">{t.symbol}</span>
                      <span className="text-[11px] text-zinc-400">({t.strategyName || 'Discretionary'})</span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        t.netPnL > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : t.netPnL < 0
                          ? 'text-rose-600'
                          : 'text-zinc-500'
                      }`}
                    >
                      {formatCurrency(t.netPnL, t.tradeCurrency, { showSign: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-Market Plan Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
              Pre-Market Plan &amp; Preparation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Market Outlook &amp; Context</label>
                <textarea
                  rows={2}
                  value={preMarketOutlook}
                  onChange={(e) => setPreMarketOutlook(e.target.value)}
                  placeholder="Gap up/down, trend direction, macro catalysts..."
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Important Levels &amp; Pivots</label>
                <textarea
                  rows={2}
                  value={keyLevels}
                  onChange={(e) => setKeyLevels(e.target.value)}
                  placeholder="Support, resistance, VWAP, previous day high/low..."
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Focus Watchlist</label>
                <input
                  type="text"
                  value={watchlist}
                  onChange={(e) => setWatchlist(e.target.value)}
                  placeholder="e.g. RELIANCE, INFY, NIFTY 22500 CE"
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Personal Focus / Rule for Today</label>
                <input
                  type="text"
                  value={personalFocus}
                  onChange={(e) => setPersonalFocus(e.target.value)}
                  placeholder="e.g. Max 2 trades, wait for 15m candle close"
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* End-Of-Day Review Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
              End-Of-Day Review &amp; Discipline Reflection
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">What Worked Well?</label>
                <textarea
                  rows={2}
                  value={eodWhatWorked}
                  onChange={(e) => setEodWhatWorked(e.target.value)}
                  placeholder="Good execution, patience, respecting stops..."
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">What Failed or Went Wrong?</label>
                <textarea
                  rows={2}
                  value={eodWhatFailed}
                  onChange={(e) => setEodWhatFailed(e.target.value)}
                  placeholder="FOMO entry, moved stop, chopped by lunch noise..."
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Key Lesson for Today</label>
                <input
                  type="text"
                  value={eodKeyLesson}
                  onChange={(e) => setEodKeyLesson(e.target.value)}
                  placeholder="One actionable takeaway"
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">Tomorrow's Improvement Goal</label>
                <input
                  type="text"
                  value={eodTomorrowImprovement}
                  onChange={(e) => setEodTomorrowImprovement(e.target.value)}
                  placeholder="Specific behavior to practice tomorrow"
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200 pt-1">
              <input
                type="checkbox"
                checked={eodRulesFollowed}
                onChange={(e) => setEodRulesFollowed(e.target.checked)}
                className="rounded text-emerald-600 border-zinc-300"
              />
              <span>I strictly followed all my personal rules and trading plans today.</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onOpenAddTrade}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Record Trade for this Date
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
            >
              Save Journal Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
