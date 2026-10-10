import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  X,
} from 'lucide-react';
import { PersonalRule } from '../../types/trade';

interface RulesViewProps {
  rules: PersonalRule[];
  disciplineScore: number;
  onSaveRule: (rule: PersonalRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
}

export const RulesView: React.FC<RulesViewProps> = ({
  rules,
  disciplineScore,
  onSaveRule,
  onDeleteRule,
  onToggleRule,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PersonalRule | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PersonalRule['category']>('max_trades_day');
  const [value, setValue] = useState<number>(3);
  const [unit, setUnit] = useState<PersonalRule['unit']>('trades');
  const [warningMessage, setWarningMessage] = useState('');
  const [description, setDescription] = useState('');

  const openAddModal = () => {
    setEditingRule(null);
    setTitle('');
    setCategory('max_trades_day');
    setValue(3);
    setUnit('trades');
    setWarningMessage('Daily trade limit reached. Overtrading damages performance.');
    setDescription('Limit maximum new setups to 3 per trading session.');
    setIsModalOpen(true);
  };

  const openEditModal = (rule: PersonalRule) => {
    setEditingRule(rule);
    setTitle(rule.title);
    setCategory(rule.category);
    setValue(rule.value);
    setUnit(rule.unit);
    setWarningMessage(rule.warningMessage);
    setDescription(rule.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const ruleToSave: PersonalRule = {
      id: editingRule ? editingRule.id : `rule_${Date.now()}`,
      userId: 'user_primary',
      title: title.trim(),
      category,
      value,
      unit,
      enabled: editingRule ? editingRule.enabled : true,
      warningMessage: warningMessage.trim(),
      description: description.trim(),
    };

    onSaveRule(ruleToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Trading Rules &amp; Discipline System
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Define your personal risk boundaries. The system warns you whenever you deviate from your own process.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Personal Rule</span>
        </button>
      </div>

      {/* Discipline Score Indicator */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center justify-between shadow-xs">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase font-mono text-zinc-400">Process Adherence Score</span>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{disciplineScore}%</span>
            <span className="text-xs font-normal text-zinc-500">
              ({disciplineScore >= 80 ? 'High Process Discipline' : disciplineScore >= 60 ? 'Moderate Adherence' : 'Frequent Process Violations'})
            </span>
          </div>
        </div>
        <div className="w-32 bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              disciplineScore >= 80 ? 'bg-emerald-500' : disciplineScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, disciplineScore))}%` }}
          />
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white dark:bg-zinc-900 border rounded-lg p-4 shadow-xs space-y-3 transition-all ${
              rule.enabled
                ? 'border-zinc-200 dark:border-zinc-800'
                : 'border-zinc-200 dark:border-zinc-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    rule.enabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{rule.title}</h4>
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">
                    Configured limit: {rule.value} {rule.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => onToggleRule(rule.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <button
                  onClick={() => openEditModal(rule)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteRule(rule.id)}
                  className="p-1 text-rose-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {rule.description && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {rule.description}
              </p>
            )}

            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                <strong>Warning Trigger: </strong> {rule.warningMessage}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingRule ? 'Edit Personal Rule' : 'Create Personal Trading Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Rule Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Stop Trading After 2 Consecutive Losses"
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="max_trades_day">Max Trades Per Day</option>
                    <option value="max_daily_loss">Max Daily Loss (%)</option>
                    <option value="max_risk_trade">Max Risk Per Trade (%)</option>
                    <option value="min_rr">Minimum Planned R:R</option>
                    <option value="max_position_size">Max Position Sizing</option>
                    <option value="trading_hours">Avoid Trading Hours</option>
                    <option value="custom">Custom Rule</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Limit Value *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={value}
                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Warning Message</label>
                <input
                  type="text"
                  required
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  placeholder="Message displayed when this rule is breached"
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Description / Rationale</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why does this rule exist in your trading business plan?"
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
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
