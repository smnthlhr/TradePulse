import React, { useState, useMemo } from 'react';
import {
  BookOpenText,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Star,
  Search,
  Eye,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Smile,
  ArrowRight,
  Maximize2,
  Camera,
} from 'lucide-react';
import { DailyJournalEntry, Trade, TradingAccount } from '../../types/trade';
import { toInputDate, formatDate } from '../../utils/date';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import { calculateTrade } from '../../utils/calculations';

interface DailyJournalViewProps {
  dailyJournals: DailyJournalEntry[];
  trades: Trade[];
  accounts?: TradingAccount[];
  reportingCurrency?: string;
  onSaveDailyJournal: (entry: DailyJournalEntry) => void;
  onDeleteDailyJournal: (journalId: string) => void;
  onViewTrade?: (trade: Trade) => void;
  onEditTrade?: (trade: Trade) => void;
  onRequestDeleteTrade?: (trade: Trade) => void;
  onDeleteTrade?: (tradeId: string) => void;
  onOpenAddTrade?: (date?: string) => void;
}

export const DailyJournalView: React.FC<DailyJournalViewProps> = ({
  dailyJournals,
  trades,
  accounts = [],
  reportingCurrency = 'USD',
  onSaveDailyJournal,
  onDeleteDailyJournal,
  onViewTrade,
  onEditTrade,
  onRequestDeleteTrade,
  onDeleteTrade,
  onOpenAddTrade,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Discover all unique dates across trades and daily journal entries
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();

    trades.forEach((t) => {
      const d = t.tradeDate || (t.entryDate ? t.entryDate.split('T')[0] : '');
      if (d) dateSet.add(d);
    });

    dailyJournals.forEach((j) => {
      if (j.date) dateSet.add(j.date);
    });

    // Also include today's date if empty
    if (dateSet.size === 0) {
      dateSet.add(toInputDate(new Date()));
    }

    // Sort descending (latest date first)
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
  }, [trades, dailyJournals]);

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return allDates[0] || toInputDate(new Date());
  });

  // Ensure selectedDate remains valid if dates change
  const activeDate = allDates.includes(selectedDate) ? selectedDate : (allDates[0] || toInputDate(new Date()));

  // Active daily journal entry for this date (if any)
  const currentJournal = useMemo(() => {
    return dailyJournals.find((j) => j.date === activeDate) || null;
  }, [dailyJournals, activeDate]);

  // Trades on active date
  const dayTrades = useMemo(() => {
    return trades.filter((t) => {
      const d = t.tradeDate || (t.entryDate ? t.entryDate.split('T')[0] : '');
      return d === activeDate;
    });
  }, [trades, activeDate]);

  // Daily Summary Metrics (Section 5)
  const dailySummary = useMemo(() => {
    const totalTrades = dayTrades.length;
    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    let totalGrossPnL = 0;
    let totalNetPnL = 0;
    let totalCharges = 0;
    let plannedRRSamples: number[] = [];
    let actualRRSamples: number[] = [];
    let disciplineScores: number[] = [];
    const emotionFrequency: Record<string, number> = {};

    dayTrades.forEach((t) => {
      const pnl = t.netPnL !== undefined ? t.netPnL : 0;
      const gross = t.grossPnL !== undefined ? t.grossPnL : pnl;
      const fees = t.charges !== undefined ? t.charges : (t.totalFees || 0);

      totalGrossPnL += gross;
      totalNetPnL += pnl;
      totalCharges += fees;

      if (pnl > 0.0001) wins++;
      else if (pnl < -0.0001) losses++;
      else breakeven++;

      // Planned RR
      if (t.plannedRR && t.plannedRR > 0) {
        plannedRRSamples.push(t.plannedRR);
      }
      // Actual RR
      if (t.actualRR && t.actualRR > 0) {
        actualRRSamples.push(t.actualRR);
      } else if (t.actualRMultiple && t.actualRMultiple > 0) {
        actualRRSamples.push(t.actualRMultiple);
      }

      // Discipline score
      if (t.disciplineScore !== undefined) {
        disciplineScores.push(t.disciplineScore);
      }

      // Emotions
      const tradeEmotions = t.emotions || t.psychology?.emotions || [];
      tradeEmotions.forEach((e) => {
        emotionFrequency[e] = (emotionFrequency[e] || 0) + 1;
      });
    });

    const avgPlannedRR = plannedRRSamples.length > 0
      ? plannedRRSamples.reduce((s, v) => s + v, 0) / plannedRRSamples.length
      : null;

    const avgActualRR = actualRRSamples.length > 0
      ? actualRRSamples.reduce((s, v) => s + v, 0) / actualRRSamples.length
      : null;

    const avgDiscipline = disciplineScores.length > 0
      ? Math.round(disciplineScores.reduce((s, v) => s + v, 0) / disciplineScores.length)
      : null;

    const sortedEmotions = Object.entries(emotionFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    return {
      totalTrades,
      wins,
      losses,
      breakeven,
      winRate: totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0,
      totalGrossPnL,
      totalNetPnL,
      totalCharges,
      avgPlannedRR: avgPlannedRR ? `1:${avgPlannedRR.toFixed(1)}` : '—',
      avgActualRR: avgActualRR ? `1:${avgActualRR.toFixed(1)}` : '—',
      avgDiscipline: avgDiscipline !== null ? `${avgDiscipline}%` : '—',
      mainEmotions: sortedEmotions.slice(0, 5),
    };
  }, [dayTrades]);

  // Edit / Form state for Daily Reflection
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const [reflectionDate, setReflectionDate] = useState(activeDate);

  // Reflection Fields (Section 6 & pre-market)
  const [preMarketOutlook, setPreMarketOutlook] = useState('');
  const [keyLevels, setKeyLevels] = useState('');
  const [watchlist, setWatchlist] = useState('');
  const [whatWentWellToday, setWhatWentWellToday] = useState('');
  const [whatWentWrongToday, setWhatWentWrongToday] = useState('');
  const [bestTradeOfTheDay, setBestTradeOfTheDay] = useState('');
  const [worstTradeOfTheDay, setWorstTradeOfTheDay] = useState('');
  const [mainMistake, setMainMistake] = useState('');
  const [mainLesson, setMainLesson] = useState('');
  const [planForNextSession, setPlanForNextSession] = useState('');
  const [eodRulesFollowed, setEodRulesFollowed] = useState(true);
  const [dayRating, setDayRating] = useState(4);

  // Open edit modal / form loaded with selected day's journal
  const openEditReflection = () => {
    setReflectionDate(activeDate);
    if (currentJournal) {
      setPreMarketOutlook(currentJournal.preMarketOutlook || '');
      setKeyLevels(currentJournal.keyLevels || '');
      setWatchlist(currentJournal.watchlist || '');
      setWhatWentWellToday(currentJournal.whatWentWellToday || currentJournal.eodWhatWorked || '');
      setWhatWentWrongToday(currentJournal.whatWentWrongToday || currentJournal.eodWhatFailed || '');
      setBestTradeOfTheDay(currentJournal.bestTradeOfTheDay || '');
      setWorstTradeOfTheDay(currentJournal.worstTradeOfTheDay || '');
      setMainMistake(currentJournal.mainMistake || '');
      setMainLesson(currentJournal.mainLesson || currentJournal.eodKeyLesson || '');
      setPlanForNextSession(currentJournal.planForNextSession || currentJournal.eodTomorrowImprovement || '');
      setEodRulesFollowed(currentJournal.eodRulesFollowed ?? true);
      setDayRating(currentJournal.dayRating || 4);
    } else {
      setPreMarketOutlook('');
      setKeyLevels('');
      setWatchlist('');
      setWhatWentWellToday('');
      setWhatWentWrongToday('');
      setBestTradeOfTheDay('');
      setWorstTradeOfTheDay('');
      setMainMistake('');
      setMainLesson('');
      setPlanForNextSession('');
      setEodRulesFollowed(true);
      setDayRating(4);
    }
    setIsEditingReflection(true);
  };

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: DailyJournalEntry = {
      id: currentJournal ? currentJournal.id : `journal_${reflectionDate}`,
      userId: 'user_primary',
      date: reflectionDate,
      preMarketOutlook: preMarketOutlook.trim() || undefined,
      keyLevels: keyLevels.trim() || undefined,
      watchlist: watchlist.trim() || undefined,
      // Section 6 Fields
      whatWentWellToday: whatWentWellToday.trim() || undefined,
      whatWentWrongToday: whatWentWrongToday.trim() || undefined,
      bestTradeOfTheDay: bestTradeOfTheDay.trim() || undefined,
      worstTradeOfTheDay: worstTradeOfTheDay.trim() || undefined,
      mainMistake: mainMistake.trim() || undefined,
      mainLesson: mainLesson.trim() || undefined,
      planForNextSession: planForNextSession.trim() || undefined,
      // Backward compatibility aliases
      eodWhatWorked: whatWentWellToday.trim() || undefined,
      eodWhatFailed: whatWentWrongToday.trim() || undefined,
      eodKeyLesson: mainLesson.trim() || undefined,
      eodTomorrowImprovement: planForNextSession.trim() || undefined,
      eodRulesFollowed,
      dayRating,
      updatedAt: new Date().toISOString(),
    };

    onSaveDailyJournal(entry);
    setSelectedDate(reflectionDate);
    setIsEditingReflection(false);
  };

  // Filter sidebar dates by search
  const filteredDates = useMemo(() => {
    if (!searchQuery.trim()) return allDates;
    const q = searchQuery.toLowerCase();
    return allDates.filter((date) => {
      if (date.includes(q)) return true;
      const j = dailyJournals.find((entry) => entry.date === date);
      if (j) {
        if ((j.mainLesson || j.eodKeyLesson || '').toLowerCase().includes(q)) return true;
        if ((j.preMarketOutlook || '').toLowerCase().includes(q)) return true;
        if ((j.watchlist || '').toLowerCase().includes(q)) return true;
      }
      const tradesForDate = trades.filter(
        (t) => (t.tradeDate || t.entryDate.split('T')[0]) === date
      );
      if (tradesForDate.some((t) => t.symbol.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [allDates, dailyJournals, trades, searchQuery]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar: Dates Navigation */}
      <div className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <BookOpenText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Trading Days &amp; Journal
          </h3>
          <button
            onClick={() => {
              const today = toInputDate(new Date());
              setSelectedDate(today);
              openEditReflection();
            }}
            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Day Entry
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search dates, symbols, lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Date Cards List */}
        <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-1">
          {filteredDates.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
              No dates match your search
            </div>
          ) : (
            filteredDates.map((date) => {
              const isSelected = activeDate === date;
              const dateTrades = trades.filter(
                (t) => (t.tradeDate || t.entryDate.split('T')[0]) === date
              );
              const journal = dailyJournals.find((j) => j.date === date);

              // Calculate Net PnL for this date
              const dayNetPnL = dateTrades.reduce((acc, t) => acc + (t.netPnL || 0), 0);
              const isProfit = dayNetPnL > 0.0001;
              const isLoss = dayNetPnL < -0.0001;

              return (
                <div
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setIsEditingReflection(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs">
                      {formatDate(date, 'DD MMMM YYYY')}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        dateTrades.length > 0
                          ? isProfit
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : isLoss
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                      }`}
                    >
                      {dateTrades.length > 0
                        ? formatCurrency(dayNetPnL, reportingCurrency)
                        : 'No trades'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-zinc-500">
                    <span>
                      {dateTrades.length} {dateTrades.length === 1 ? 'trade' : 'trades'}
                      {dateTrades.length > 0 && (
                        <span className="text-[10px] text-zinc-400 ml-1">
                          ({dateTrades.map((t) => t.symbol).slice(0, 3).join(', ')}
                          {dateTrades.length > 3 ? '…' : ''})
                        </span>
                      )}
                    </span>
                    {journal && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Journaled
                      </span>
                    )}
                  </div>

                  {journal && (journal.mainLesson || journal.eodKeyLesson) && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-1 italic">
                      "{journal.mainLesson || journal.eodKeyLesson}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Detailed View / Edit Panel */}
      <div className="lg:col-span-8 space-y-6">
        {/* Header Bar */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {formatDate(activeDate, 'DD MMMM YYYY')}
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {dayTrades.length} {dayTrades.length === 1 ? 'trade executed' : 'trades executed'} on this date
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openEditReflection}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {currentJournal ? 'Edit Daily Reflection' : 'Add Daily Reflection'}
            </button>

            {onOpenAddTrade && (
              <button
                onClick={() => onOpenAddTrade(activeDate)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Record Trade for this Day
              </button>
            )}
          </div>
        </div>

        {/* 1. Daily Summary Card (Section 5) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
              Daily Summary · {formatDate(activeDate, 'DD MMMM YYYY')}
            </h3>
            {currentJournal && currentJournal.dayRating && (
              <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                <span>Rating:</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= currentJournal.dayRating! ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Trades & Win/Loss */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg">
              <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-0.5">Trades / Outcomes</span>
              <div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {dailySummary.totalTrades}
                <span className="text-xs font-normal text-zinc-500 ml-1.5">
                  ({dailySummary.wins}W · {dailySummary.losses}L · {dailySummary.breakeven}BE)
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Win Rate: <span className="font-semibold">{dailySummary.winRate}%</span>
              </div>
            </div>

            {/* Net P&L */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg">
              <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-0.5">Net P&amp;L</span>
              <div
                className={`text-base font-bold font-mono ${
                  dailySummary.totalNetPnL > 0.0001
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : dailySummary.totalNetPnL < -0.0001
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {dailySummary.totalNetPnL > 0.0001 ? '+' : ''}
                {formatCurrency(dailySummary.totalNetPnL, reportingCurrency)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Charges: {formatCurrency(dailySummary.totalCharges, reportingCurrency)}
              </div>
            </div>

            {/* Average Planned & Actual RR */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg">
              <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-0.5">Risk-to-Reward</span>
              <div className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-normal">Planned:</span>
                  <span className="text-blue-600 dark:text-blue-400">{dailySummary.avgPlannedRR}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-normal">Actual:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{dailySummary.avgActualRR}</span>
                </div>
              </div>
            </div>

            {/* Discipline & Emotions */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg">
              <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-0.5">Discipline &amp; State</span>
              <div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {dailySummary.avgDiscipline}
              </div>
              <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                {dailySummary.mainEmotions.length > 0 ? (
                  dailySummary.mainEmotions.join(', ')
                ) : (
                  'No emotions tagged'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Grouped Individual Trades (Section 5) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Executed Trades for {formatDate(activeDate, 'DD MMMM YYYY')}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {dayTrades.length}
              </span>
            </h3>
          </div>

          {dayTrades.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-400 text-xs space-y-2">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">No trades recorded on this date.</p>
              <p>You can record a trade for this date or review your daily notes and pre-market preparation.</p>
              {onOpenAddTrade && (
                <button
                  onClick={() => onOpenAddTrade(activeDate)}
                  className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Trade
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayTrades.map((t, idx) => {
                const acc = accounts.find((a) => a.id === t.accountId);
                const isProfitable = (t.netPnL || 0) > 0.0001;
                const isLoss = (t.netPnL || 0) < -0.0001;
                const chartImg = t.chartScreenshot || (t.screenshots && t.screenshots[0]?.url);

                return (
                  <div
                    key={t.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    {/* Header: Trade # – SYMBOL + Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          Trade {idx + 1}
                        </span>
                        <h4 className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          {t.symbol}
                        </h4>
                        <span
                          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                            t.direction === 'long'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {t.direction}
                        </span>
                        {t.productType && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {t.productType}
                          </span>
                        )}
                        {acc && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            · {acc.name}
                          </span>
                        )}
                      </div>

                      {/* View / Edit / Delete Trade Actions (Section 5) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onViewTrade && (
                          <button
                            onClick={() => onViewTrade(t)}
                            title="View Trade Details"
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        )}
                        {onEditTrade && (
                          <button
                            onClick={() => onEditTrade(t)}
                            title="Edit Trade"
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (onRequestDeleteTrade) {
                              onRequestDeleteTrade(t);
                            } else if (onDeleteTrade) {
                              onDeleteTrade(t.id);
                            }
                          }}
                          title="Delete Trade"
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>

                    {/* Trade Parameters & Financials Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-mono text-zinc-400">Qty / Size</span>
                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {t.quantity}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-mono text-zinc-400">Entry &rarr; Exit</span>
                        <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px]">
                          {formatCurrency(t.entryPrice, t.tradeCurrency)} &rarr;{' '}
                          {t.exitPrice !== undefined
                            ? formatCurrency(t.exitPrice, t.tradeCurrency)
                            : 'Open'}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-mono text-zinc-400">Net P&amp;L</span>
                        <span
                          className={`font-mono font-bold ${
                            isProfitable
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isLoss
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {isProfitable ? '+' : ''}
                          {formatCurrency(t.netPnL || 0, t.tradeCurrency)}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-mono text-zinc-400">Planned / Actual RR</span>
                        <span className="font-mono text-zinc-800 dark:text-zinc-200">
                          {t.plannedRRText || (t.plannedRR ? `1:${t.plannedRR}` : '—')} /{' '}
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {t.actualRR ? `1:${t.actualRR}` : t.actualRMultiple ? `${t.actualRMultiple.toFixed(1)}R` : '—'}
                          </span>
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-mono text-zinc-400">Discipline Score</span>
                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {t.disciplineScore !== undefined ? `${t.disciplineScore}%` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-mono text-zinc-400">Confidence</span>
                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {t.confidenceScore ? `${t.confidenceScore}/10` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Trade Emotions / Checklist tags */}
                    {((t.emotions && t.emotions.length > 0) || (t.tags && t.tags.length > 0)) && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">Emotions:</span>
                        {(t.emotions || t.tags || []).map((emo, eIdx) => (
                          <span
                            key={eIdx}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                          >
                            {emo}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Trade Lessons Learned & What Can I Improve? */}
                    {(t.lessonLearned || t.whatCanIImprove || t.notesText) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                        {t.lessonLearned && (
                          <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40">
                            <span className="block text-[10px] uppercase font-mono font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                              Lesson Learned
                            </span>
                            <p className="text-zinc-800 dark:text-zinc-200 line-clamp-2">
                              {t.lessonLearned}
                            </p>
                          </div>
                        )}
                        {t.whatCanIImprove && (
                          <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40">
                            <span className="block text-[10px] uppercase font-mono font-bold text-blue-700 dark:text-blue-400 mb-0.5">
                              What Can I Improve?
                            </span>
                            <p className="text-zinc-800 dark:text-zinc-200 line-clamp-2">
                              {t.whatCanIImprove}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chart Screenshot Thumbnail */}
                    {chartImg && (
                      <div className="pt-1">
                        <div
                          onClick={() => setSelectedImage(chartImg)}
                          className="inline-flex items-center gap-2 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 group"
                        >
                          <Camera className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                          <span>View Chart Screenshot</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. End-of-Day Reflection & Pre-Market Outlook (Section 6) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Daily Reflection &amp; Session Review
              </h3>
              <p className="text-xs text-zinc-500">
                End-of-day review fields and notes for continuous trader improvement.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openEditReflection}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {currentJournal ? 'Edit Reflection' : 'Write Reflection'}
              </button>

              {currentJournal && (
                <button
                  onClick={() => {
                    if (confirm('Delete this daily reflection entry? (This will NOT delete any trades for this day.)')) {
                      onDeleteDailyJournal(currentJournal.id);
                    }
                  }}
                  title="Delete Reflection Only"
                  className="p-1.5 text-rose-500 hover:text-rose-700 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {currentJournal ? (
            <div className="space-y-4 text-xs">
              {/* Star Rating & Rule Adherence */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-100 dark:border-zinc-800 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Session Rating:</span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= (currentJournal.dayRating ?? 4)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-300 dark:text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold ${
                      currentJournal.eodRulesFollowed ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {currentJournal.eodRulesFollowed
                      ? '✓ Rules & Boundaries Respected'
                      : '⚠ Rules Breached / Emotional Trading'}
                  </span>
                </div>
              </div>

              {/* Section 6 Structured Reflection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* What Went Well Today? */}
                {(currentJournal.whatWentWellToday || currentJournal.eodWhatWorked) && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 space-y-1">
                    <span className="font-bold uppercase font-mono text-[10px] text-emerald-700 dark:text-emerald-400 block">
                      What went well today?
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {currentJournal.whatWentWellToday || currentJournal.eodWhatWorked}
                    </p>
                  </div>
                )}

                {/* What Went Wrong Today? */}
                {(currentJournal.whatWentWrongToday || currentJournal.eodWhatFailed) && (
                  <div className="p-3.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 space-y-1">
                    <span className="font-bold uppercase font-mono text-[10px] text-rose-700 dark:text-rose-400 block">
                      What went wrong today?
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {currentJournal.whatWentWrongToday || currentJournal.eodWhatFailed}
                    </p>
                  </div>
                )}

                {/* Best Trade of the Day */}
                {currentJournal.bestTradeOfTheDay && (
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="font-bold uppercase font-mono text-[10px] text-zinc-500 block">
                      Best trade of the day
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {currentJournal.bestTradeOfTheDay}
                    </p>
                  </div>
                )}

                {/* Worst Trade of the Day */}
                {currentJournal.worstTradeOfTheDay && (
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="font-bold uppercase font-mono text-[10px] text-zinc-500 block">
                      Worst trade of the day
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {currentJournal.worstTradeOfTheDay}
                    </p>
                  </div>
                )}

                {/* Main Mistake */}
                {currentJournal.mainMistake && (
                  <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 space-y-1">
                    <span className="font-bold uppercase font-mono text-[10px] text-amber-700 dark:text-amber-400 block">
                      Main mistake
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {currentJournal.mainMistake}
                    </p>
                  </div>
                )}

                {/* Main Lesson */}
                {(currentJournal.mainLesson || currentJournal.eodKeyLesson) && (
                  <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 space-y-1">
                    <span className="font-bold uppercase font-mono text-[10px] text-blue-700 dark:text-blue-400 block">
                      Main lesson
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {currentJournal.mainLesson || currentJournal.eodKeyLesson}
                    </p>
                  </div>
                )}

                {/* Plan for Next Session */}
                {(currentJournal.planForNextSession || currentJournal.eodTomorrowImprovement) && (
                  <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/40 md:col-span-2 space-y-1">
                    <span className="font-bold uppercase font-mono text-[10px] text-purple-700 dark:text-purple-400 block">
                      Plan for next session
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {currentJournal.planForNextSession || currentJournal.eodTomorrowImprovement}
                    </p>
                  </div>
                )}
              </div>

              {/* Pre-Market Outlook if saved */}
              {(currentJournal.preMarketOutlook || currentJournal.keyLevels || currentJournal.watchlist) && (
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 font-bold block">
                    Pre-Market Preparation
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentJournal.preMarketOutlook && (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 block mb-0.5">Market Outlook:</span>
                        <p className="text-zinc-600 dark:text-zinc-400">{currentJournal.preMarketOutlook}</p>
                      </div>
                    )}
                    {currentJournal.keyLevels && (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 block mb-0.5">Key Levels:</span>
                        <p className="text-zinc-600 dark:text-zinc-400">{currentJournal.keyLevels}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">
                No daily reflection has been recorded for this date yet.
              </p>
              <button
                onClick={openEditReflection}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                + Write what went well, mistakes, and lessons
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Reflection Modal */}
      {isEditingReflection && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 my-8 text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {currentJournal ? `Edit Daily Reflection (${reflectionDate})` : `New Daily Reflection (${reflectionDate})`}
                </h4>
                <p className="text-xs text-zinc-500">
                  Record end-of-day observations, lessons learned, and execution discipline.
                </p>
              </div>
              <button
                onClick={() => setIsEditingReflection(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveReflection} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={reflectionDate}
                    onChange={(e) => setReflectionDate(e.target.value)}
                    className="w-full p-2 font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Session Rating (1–5)
                  </label>
                  <div className="flex items-center gap-1.5 mt-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDayRating(s)}
                        className={`p-1 ${s <= dayRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                    <span className="text-xs font-mono text-zinc-500 ml-2">{dayRating} / 5</span>
                  </div>
                </div>
              </div>

              {/* Section 6 Reflection Fields */}
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="font-bold uppercase font-mono text-[11px] text-emerald-600 dark:text-emerald-400 block">
                  End-of-Day Reflection (Optional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      What went well today?
                    </label>
                    <textarea
                      rows={2}
                      value={whatWentWellToday}
                      onChange={(e) => setWhatWentWellToday(e.target.value)}
                      placeholder="e.g. Followed trading plan, respected stop loss..."
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      What went wrong today?
                    </label>
                    <textarea
                      rows={2}
                      value={whatWentWrongToday}
                      onChange={(e) => setWhatWentWrongToday(e.target.value)}
                      placeholder="e.g. Hesitated on the best setup, over-leveraged..."
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Best trade of the day
                    </label>
                    <input
                      type="text"
                      value={bestTradeOfTheDay}
                      onChange={(e) => setBestTradeOfTheDay(e.target.value)}
                      placeholder="e.g. NIFTY 1:3 RR clean breakout"
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Worst trade of the day
                    </label>
                    <input
                      type="text"
                      value={worstTradeOfTheDay}
                      onChange={(e) => setWorstTradeOfTheDay(e.target.value)}
                      placeholder="e.g. Chased RELIANCE after second green candle"
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Main mistake
                    </label>
                    <input
                      type="text"
                      value={mainMistake}
                      onChange={(e) => setMainMistake(e.target.value)}
                      placeholder="e.g. Entering before candle close"
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Main lesson
                    </label>
                    <input
                      type="text"
                      value={mainLesson}
                      onChange={(e) => setMainLesson(e.target.value)}
                      placeholder="e.g. Patience pays in high-volatility sessions"
                      className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Plan for next session
                  </label>
                  <input
                    type="text"
                    value={planForNextSession}
                    onChange={(e) => setPlanForNextSession(e.target.value)}
                    placeholder="e.g. Wait strictly for 15-min confirmation, risk max 1% per setup"
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>

                {/* Pre-Market preparation (Optional) */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="font-bold uppercase font-mono text-[11px] text-zinc-500 block mb-2">
                    Pre-Market Prep (Optional)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-500 block mb-1">Market Outlook</label>
                      <input
                        type="text"
                        value={preMarketOutlook}
                        onChange={(e) => setPreMarketOutlook(e.target.value)}
                        placeholder="Gap up/down, trend, sentiment..."
                        className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-500 block mb-1">Key Levels / Watchlist</label>
                      <input
                        type="text"
                        value={keyLevels}
                        onChange={(e) => setKeyLevels(e.target.value)}
                        placeholder="NIFTY 25000, BANKNIFTY 52000..."
                        className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Rules Followed Switch */}
                <label className="flex items-center gap-2 cursor-pointer font-semibold pt-2 text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={eodRulesFollowed}
                    onChange={(e) => setEodRulesFollowed(e.target.checked)}
                    className="rounded text-emerald-600 border-zinc-300 focus:ring-emerald-500"
                  />
                  <span>I respected all risk boundaries and discipline rules today.</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingReflection(false)}
                  className="px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
                >
                  Save Reflection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expanded Chart Image Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={selectedImage}
            alt="Expanded Chart"
            className="max-w-full max-h-[95vh] rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};
