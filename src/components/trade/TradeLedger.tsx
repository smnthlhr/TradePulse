import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Download,
  Plus,
  Star,
} from 'lucide-react';
import { Trade, TradingAccount, Strategy } from '../../types/trade';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import { formatDate } from '../../utils/date';

interface TradeLedgerProps {
  trades: Trade[];
  accounts: TradingAccount[];
  strategies: Strategy[];
  reportingCurrency: string;
  onOpenAddTrade: () => void;
  onViewTrade: (trade: Trade) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onRequestDeleteTrade?: (trade: Trade) => void;
}

type SortField = 'date' | 'symbol' | 'direction' | 'netPnL' | 'actualR' | 'quantity' | 'entryPrice';
type SortOrder = 'asc' | 'desc';

export const TradeLedger: React.FC<TradeLedgerProps> = ({
  trades,
  accounts,
  strategies,
  reportingCurrency,
  onOpenAddTrade,
  onViewTrade,
  onEditTrade,
  onDeleteTrade,
  onRequestDeleteTrade,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'long' | 'short'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'breakeven'>('all');
  const [filterOutcome, setFilterOutcome] = useState<'all' | 'win' | 'loss'>('all');
  const [filterStrategy, setFilterStrategy] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const accountMap = useMemo(() => {
    const map = new Map<string, TradingAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Filtering and Sorting
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSymbol = trade.symbol.toLowerCase().includes(q);
        const matchesStrategy = (trade.strategyName || '').toLowerCase().includes(q);
        const matchesNotes = (trade.notes?.thesis || '').toLowerCase().includes(q);
        const matchesTags = trade.tags.some((t) => t.toLowerCase().includes(q));
        const matchesMistakes = (trade.notes?.mistakes || []).some((m) => m.toLowerCase().includes(q));
        if (!matchesSymbol && !matchesStrategy && !matchesNotes && !matchesTags && !matchesMistakes) {
          return false;
        }
      }

      // Direction
      if (filterDirection !== 'all' && trade.direction !== filterDirection) return false;

      // Status
      if (filterStatus !== 'all' && trade.status !== filterStatus) return false;

      // Outcome
      if (filterOutcome === 'win' && trade.netPnL <= 0) return false;
      if (filterOutcome === 'loss' && trade.netPnL >= 0) return false;

      // Strategy
      if (filterStrategy !== 'all' && trade.strategyId !== filterStrategy) return false;

      // Account
      if (filterAccount !== 'all' && trade.accountId !== filterAccount) return false;

      return true;
    });
  }, [trades, searchQuery, filterDirection, filterStatus, filterOutcome, filterStrategy, filterAccount]);

  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'date':
          valA = new Date(a.entryDate).getTime();
          valB = new Date(b.entryDate).getTime();
          break;
        case 'symbol':
          valA = a.symbol;
          valB = b.symbol;
          break;
        case 'direction':
          valA = a.direction;
          valB = b.direction;
          break;
        case 'netPnL':
          valA = a.netPnL;
          valB = b.netPnL;
          break;
        case 'actualR':
          valA = a.actualRMultiple || 0;
          valB = b.actualRMultiple || 0;
          break;
        case 'quantity':
          valA = a.quantity;
          valB = b.quantity;
          break;
        case 'entryPrice':
          valA = a.entryPrice;
          valB = b.entryPrice;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTrades, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedTrades.length / pageSize) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTrades.slice(start, start + pageSize);
  }, [sortedTrades, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterDirection('all');
    setFilterStatus('all');
    setFilterOutcome('all');
    setFilterStrategy('all');
    setFilterAccount('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 sm:p-4 space-y-3">
        {/* Search & Top Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search symbols, tags, strategies, mistakes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
            >
              Reset Filters
            </button>
            <button
              onClick={onOpenAddTrade}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-md shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Trade</span>
            </button>
          </div>
        </div>

        {/* Filter Badges / Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase">Side:</span>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs cursor-pointer"
            >
              <option value="all">All</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs cursor-pointer"
            >
              <option value="all">All</option>
              <option value="closed">Closed</option>
              <option value="open">Open</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase">Result:</span>
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value as any)}
              className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs cursor-pointer"
            >
              <option value="all">All</option>
              <option value="win">Profitable</option>
              <option value="loss">Loss</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase">Strategy:</span>
            <select
              value={filterStrategy}
              onChange={(e) => setFilterStrategy(e.target.value)}
              className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs cursor-pointer"
            >
              <option value="all">All Strategies</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase">Account:</span>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs cursor-pointer"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-zinc-400 ml-auto font-mono text-[11px]">
            Showing {filteredTrades.length} of {trades.length} trades
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 select-none">
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-3 px-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Symbol</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap">Side / Type</th>
                <th
                  onClick={() => handleSort('entryPrice')}
                  className="py-3 px-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Entry / Exit</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('quantity')}
                  className="py-3 px-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Stop / Target</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Planned R:R</th>
                <th
                  onClick={() => handleSort('actualR')}
                  className="py-3 px-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Actual R</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('netPnL')}
                  className="py-3 px-3.5 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Net P&amp;L</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap">Strategy / Playbook</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Ratings</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No trades found</p>
                      <p className="text-xs text-zinc-500">
                        {trades.length === 0
                          ? 'Your journal is currently empty. Record your first trade to begin tracking analytics.'
                          : 'No trades match the current search filters. Try resetting the filters.'}
                      </p>
                      {trades.length === 0 && (
                        <button
                          onClick={onOpenAddTrade}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 transition-colors"
                        >
                          Record First Trade
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((t) => {
                  const acc = accountMap.get(t.accountId);
                  const isProfitable = t.netPnL > 0.0001;
                  const isLoss = t.netPnL < -0.0001;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onViewTrade(t)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        <div>{formatDate(t.entryDate, 'YYYY-MM-DD')}</div>
                        <div className="text-[10px] text-zinc-400">
                          {acc?.name || 'Account'}
                        </div>
                      </td>

                      {/* Symbol */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          {t.symbol}
                        </div>
                        {t.assetName && (
                          <div className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                            {t.assetName}
                          </div>
                        )}
                      </td>

                      {/* Side / Type */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold text-[11px] uppercase flex items-center gap-0.5 ${
                              t.direction === 'long'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {t.direction === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {t.direction}
                          </span>
                          <span className="text-[11px] text-zinc-400">·</span>
                          <span className="text-[11px] text-zinc-500">{t.productType}</span>
                        </div>
                        {t.status === 'open' && (
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-medium">
                            Active Open
                          </span>
                        )}
                      </td>

                      {/* Entry / Exit */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right font-mono text-xs">
                        <div className="text-zinc-800 dark:text-zinc-200">
                          {formatCurrency(t.entryPrice, t.tradeCurrency)}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {t.exitPrice !== undefined
                            ? formatCurrency(t.exitPrice, t.tradeCurrency)
                            : 'Open'}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right font-mono text-xs text-zinc-800 dark:text-zinc-200">
                        {t.quantity}
                      </td>

                      {/* Stop / Target */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right font-mono text-[11px]">
                        <div className="text-rose-500">
                          {t.stopLossPrice ? formatCurrency(t.stopLossPrice, t.tradeCurrency) : '—'}
                        </div>
                        <div className="text-emerald-500">
                          {t.targetPrice ? formatCurrency(t.targetPrice, t.tradeCurrency) : '—'}
                        </div>
                      </td>

                      {/* Planned R:R */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-center font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {t.plannedRR ? `1:${t.plannedRR}` : '—'}
                      </td>

                      {/* Actual R */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-center font-mono text-xs">
                        {t.actualRMultiple !== undefined && t.plannedRiskAmount && t.plannedRiskAmount > 0 ? (
                          <span
                            className={`font-semibold ${
                              t.actualRMultiple > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : t.actualRMultiple < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-zinc-500'
                            }`}
                          >
                            {t.actualRMultiple > 0 ? '+' : ''}
                            {t.actualRMultiple}R
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Net P&L */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right font-mono text-xs">
                        <div
                          className={`font-bold ${
                            isProfitable
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isLoss
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-zinc-500'
                          }`}
                        >
                          {formatCurrency(t.netPnL, t.tradeCurrency, { showSign: true })}
                        </div>
                        {t.pnlPercentage !== 0 && (
                          <div className="text-[10px] text-zinc-400">
                            {t.pnlPercentage > 0 ? '+' : ''}
                            {t.pnlPercentage}%
                          </div>
                        )}
                      </td>

                      {/* Strategy */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-xs text-zinc-700 dark:text-zinc-300">
                        <div>{t.strategyName || 'Discretionary'}</div>
                        {t.disciplineScore !== undefined && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                            {t.disciplineScore}% rules
                          </div>
                        )}
                      </td>

                      {/* Ratings */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                            {t.ratings?.executionQuality ?? '—'}/5
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-2.5 px-3.5 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onViewTrade(t)}
                            title="View Trade Details"
                            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditTrade(t)}
                            title="Edit Trade"
                            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (onRequestDeleteTrade) {
                                onRequestDeleteTrade(t);
                              } else {
                                onDeleteTrade(t.id);
                              }
                            }}
                            title="Delete Trade"
                            className="p-1 text-rose-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedTrades.length > pageSize && (
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
