import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  ShieldCheck,
  TrendingUp,
  Percent,
  CheckSquare,
  Edit2,
  Trash2,
  X,
  Target,
} from 'lucide-react';
import { Strategy, Trade, StrategyRule } from '../../types/trade';
import { calculatePortfolioStats } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';

interface PlaybookViewProps {
  strategies: Strategy[];
  trades: Trade[];
  reportingCurrency: string;
  onSaveStrategy: (strategy: Strategy) => void;
  onDeleteStrategy: (strategyId: string) => void;
}

export const PlaybookView: React.FC<PlaybookViewProps> = ({
  strategies,
  trades,
  reportingCurrency,
  onSaveStrategy,
  onDeleteStrategy,
}) => {
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entryCriteria, setEntryCriteria] = useState('');
  const [stopLossRules, setStopLossRules] = useState('');
  const [targetRules, setTargetRules] = useState('');
  const [minRR, setMinRR] = useState<number>(2.0);
  const [preferredConditions, setPreferredConditions] = useState('');
  const [checklist, setChecklist] = useState<StrategyRule[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  const openCreateModal = () => {
    setEditingStrategy(null);
    setName('');
    setDescription('');
    entryCriteria: setEntryCriteria('');
    setStopLossRules('');
    setTargetRules('');
    setMinRR(2.0);
    setPreferredConditions('');
    setChecklist([
      { id: 'c1', label: 'Higher timeframe trend aligned', isRequired: true },
      { id: 'c2', label: 'Volume confirmation on trigger candle', isRequired: true },
      { id: 'c3', label: 'Calculated stop loss identified before entry', isRequired: true },
      { id: 'c4', label: 'Minimum 1:2 R:R available', isRequired: true },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (strat: Strategy) => {
    setEditingStrategy(strat);
    setName(strat.name);
    setDescription(strat.description);
    setEntryCriteria(strat.entryCriteria);
    setStopLossRules(strat.stopLossRules);
    setTargetRules(strat.targetRules);
    setMinRR(strat.minRR);
    setPreferredConditions(strat.preferredMarketConditions || '');
    setChecklist(strat.checklist || []);
    setIsModalOpen(true);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([
      ...checklist,
      { id: `rule_${Date.now()}`, label: newChecklistText.trim(), isRequired: true },
    ]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const stratToSave: Strategy = {
      id: editingStrategy ? editingStrategy.id : `strat_${Date.now()}`,
      userId: 'user_primary',
      name: name.trim(),
      description: description.trim(),
      entryCriteria: entryCriteria.trim(),
      stopLossRules: stopLossRules.trim(),
      targetRules: targetRules.trim(),
      minRR,
      preferredMarketConditions: preferredConditions.trim() || undefined,
      checklist,
      color: '#3b82f6',
      createdAt: editingStrategy ? editingStrategy.createdAt : new Date().toISOString(),
    };

    onSaveStrategy(stratToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Trading Playbook &amp; Strategies
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Define your repeatable setups, execution criteria, checklist rules, and audit edge statistics.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Strategy Setup</span>
        </button>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strat) => {
          const stratTrades = trades.filter((t) => t.strategyId === strat.id || t.strategyName === strat.name);
          const stats = calculatePortfolioStats(stratTrades);

          return (
            <div
              key={strat.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{strat.name}</h4>
                    <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                      Target R:R: 1:{strat.minRR}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(strat)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {strategies.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete strategy "${strat.name}"?`)) {
                            onDeleteStrategy(strat.id);
                          }
                        }}
                        className="p-1 text-rose-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {strat.description}
                </p>

                {/* Performance Cluster */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-md border border-zinc-100 dark:border-zinc-800/80 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block truncate">Win Rate</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                      {stats.winRate}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block truncate">Net P&amp;L</span>
                    <span
                      className={`font-mono font-bold block truncate ${
                        stats.netPnL > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : stats.netPnL < 0
                          ? 'text-rose-600'
                          : 'text-zinc-500'
                      }`}
                    >
                      {formatCurrency(stats.netPnL, reportingCurrency, { compact: true })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block truncate">Trades</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                      {stats.totalTrades}
                    </span>
                  </div>
                </div>

                {/* Entry & Risk rules summary */}
                <div className="space-y-1.5 text-xs">
                  <div>
                    <strong className="text-[11px] text-zinc-400 font-mono uppercase block">Entry Trigger:</strong>
                    <span className="text-zinc-700 dark:text-zinc-300 text-[11px] line-clamp-2">
                      {strat.entryCriteria}
                    </span>
                  </div>
                  <div>
                    <strong className="text-[11px] text-zinc-400 font-mono uppercase block">Stop Loss Rule:</strong>
                    <span className="text-zinc-700 dark:text-zinc-300 text-[11px] line-clamp-1">
                      {strat.stopLossRules}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checklist count badge */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>{strat.checklist?.length || 0} Rule Checklist Items</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {stats.ruleAdherenceRate}% Process Adherence
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* STRATEGY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingStrategy ? 'Edit Strategy Playbook' : 'Create Strategy Playbook'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Strategy Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Trend Continuation Pullback"
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Minimum Desired R:R *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    required
                    value={minRR}
                    onChange={(e) => setMinRR(parseFloat(e.target.value) || 2.0)}
                    className="w-full p-2 font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Strategy Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of setup thesis, edge, and when to look for this setup..."
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Entry Criteria *</label>
                  <textarea
                    rows={2}
                    required
                    value={entryCriteria}
                    onChange={(e) => setEntryCriteria(e.target.value)}
                    placeholder="Exact trigger condition (e.g. 5m hammer candle closing above 20 EMA)..."
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Stop Loss Rules *</label>
                  <textarea
                    rows={2}
                    required
                    value={stopLossRules}
                    onChange={(e) => setStopLossRules(e.target.value)}
                    placeholder="Where does stop loss get placed? (e.g. 2 ticks below swing low)..."
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Target Rules *</label>
                  <textarea
                    rows={2}
                    required
                    value={targetRules}
                    onChange={(e) => setTargetRules(e.target.value)}
                    placeholder="Where is profit taken? (e.g. 2R target or key resistance)..."
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Preferred Market Conditions</label>
                  <textarea
                    rows={2}
                    value={preferredConditions}
                    onChange={(e) => setPreferredConditions(e.target.value)}
                    placeholder="Trending, High Volatility, Range Bound, etc."
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
                  Setup Execution Checklist ({checklist.length} items)
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {checklist.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    >
                      <span>{c.label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(c.id)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Add new rule (e.g. Volume > 20-period moving average)"
                    className="flex-1 p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                  >
                    Add Rule
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                >
                  Save Strategy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
