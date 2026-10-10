import React, { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  TrendingUp,
  X,
} from 'lucide-react';
import { TradingGoal, Trade } from '../../types/trade';

interface GoalsViewProps {
  goals: TradingGoal[];
  trades: Trade[];
  onSaveGoal: (goal: TradingGoal) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  trades,
  onSaveGoal,
  onDeleteGoal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TradingGoal | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metricType, setMetricType] = useState<TradingGoal['metricType']>('stop_loss_discipline');
  const [targetValue, setTargetValue] = useState<number>(90);
  const [period, setPeriod] = useState<TradingGoal['period']>('month');

  const openAddModal = () => {
    setEditingGoal(null);
    setTitle('Follow Stop Loss on 90% of Trades');
    setDescription('Cut losses strictly without hesitating or moving hard stops.');
    setMetricType('stop_loss_discipline');
    setTargetValue(90);
    setPeriod('month');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const goalToSave: TradingGoal = {
      id: editingGoal ? editingGoal.id : `goal_${Date.now()}`,
      userId: 'user_primary',
      title: title.trim(),
      description: description.trim(),
      metricType,
      targetValue,
      period,
      createdAt: editingGoal ? editingGoal.createdAt : new Date().toISOString(),
    };

    onSaveGoal(goalToSave);
    setIsModalOpen(false);
  };

  // Helper to calculate current progress for each goal metric
  const calculateGoalProgress = (goal: TradingGoal) => {
    if (trades.length === 0) return 0;

    switch (goal.metricType) {
      case 'stop_loss_discipline': {
        const tradesWithStop = trades.filter((t) => t.stopLossPrice && t.stopLossPrice > 0).length;
        return Math.round((tradesWithStop / trades.length) * 100);
      }
      case 'avg_rr': {
        const validR = trades.filter((t) => t.plannedRR && t.plannedRR > 0);
        if (validR.length === 0) return 0;
        const sum = validR.reduce((s, t) => s + (t.plannedRR || 0), 0);
        return Number((sum / validR.length).toFixed(1));
      }
      case 'fomo_reduction': {
        const fomoTrades = trades.filter((t) => (t.notes?.mistakes || []).includes('FOMO')).length;
        return fomoTrades;
      }
      case 'win_rate': {
        const closed = trades.filter((t) => t.status === 'closed');
        if (closed.length === 0) return 0;
        const wins = closed.filter((t) => t.netPnL > 0.0001).length;
        return Math.round((wins / closed.length) * 100);
      }
      case 'journal_completion': {
        const journaled = trades.filter((t) => t.notes?.thesis || t.notes?.lessonsLearned).length;
        return Math.round((journaled / trades.length) * 100);
      }
      default:
        return 75;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Process-Oriented Trading Goals
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Focus on execution excellence rather than arbitrary P&amp;L chasing. Great habits produce long-term consistency.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Process Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const currentVal = calculateGoalProgress(goal);
          const isPercent = goal.metricType === 'stop_loss_discipline' || goal.metricType === 'journal_completion' || goal.metricType === 'win_rate';
          const isMet = isPercent ? currentVal >= goal.targetValue : goal.metricType === 'fomo_reduction' ? currentVal <= goal.targetValue : currentVal >= goal.targetValue;

          return (
            <div
              key={goal.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{goal.title}</h4>
                    {isMet && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> On Track
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">
                    Period: {goal.period} · Target: {goal.targetValue}{isPercent ? '%' : ''}
                  </span>
                </div>

                <button
                  onClick={() => onDeleteGoal(goal.id)}
                  className="p-1 text-rose-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {goal.description}
              </p>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">Current Progress:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {currentVal}{isPercent ? '%' : ''} / {goal.targetValue}{isPercent ? '%' : ''}
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isMet ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        goal.targetValue > 0 ? (currentVal / goal.targetValue) * 100 : 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Create Process Goal
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Process Metric</label>
                  <select
                    value={metricType}
                    onChange={(e) => setMetricType(e.target.value as any)}
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="stop_loss_discipline">Hard Stop Placed Rate (%)</option>
                    <option value="avg_rr">Average Planned R:R Ratio</option>
                    <option value="fomo_reduction">Maximum FOMO Trades Count</option>
                    <option value="journal_completion">Daily Journal Completion (%)</option>
                    <option value="win_rate">Target Win Rate (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Target Value *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={targetValue}
                    onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Time Horizon</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="quarter">Quarterly</option>
                  <option value="year">Annual</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Description / Rules</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="How will you enforce this standard?"
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
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
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
