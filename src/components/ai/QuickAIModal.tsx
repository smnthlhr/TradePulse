import React, { useState } from 'react';
import { Brain, X, Send, Sparkles, RefreshCw } from 'lucide-react';
import { User, Trade, TradingAccount, Strategy } from '../../types/trade';
import { PortfolioStatistics } from '../../utils/calculations';

interface QuickAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextPage: string;
  user: User | null;
  trades: Trade[];
  accounts: TradingAccount[];
  strategies: Strategy[];
  stats: PortfolioStatistics;
  reportingCurrency: string;
  activeTrade?: Trade | null;
}

export const QuickAIModal: React.FC<QuickAIModalProps> = ({
  isOpen,
  onClose,
  contextPage,
  user,
  trades,
  accounts,
  strategies,
  stats,
  reportingCurrency,
  activeTrade,
}) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Contextual initial prompt suggestions based on current screen
  const getContextualPrompts = () => {
    if (activeTrade) {
      return [
        `Review trade ${activeTrade.symbol}`,
        `Why did trade ${activeTrade.symbol} lose?`,
        `Was the stop loss on ${activeTrade.symbol} valid?`,
      ];
    }
    switch (contextPage) {
      case 'calendar':
        return ['Analyse this month’s daily consistency', 'What is my best day of the week?', 'Review today’s trading'];
      case 'trades':
        return ['Analyse my last 10 trades', 'What mistake is costing me most?', 'Compare my long vs short trades'];
      case 'playbook':
        return ['Which strategy has highest expectancy?', 'How can I refine my entry rules?', 'Checklist discipline audit'];
      case 'dashboard':
      default:
        return ['What should I focus on improving today?', 'Are my drawdowns under control?', 'Review this week’s discipline'];
    }
  };

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || query).trim();
    if (!promptText) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          context: {
            page: contextPage,
            activeTrade: activeTrade || undefined,
            statsSummary: {
              netPnL: stats.netPnL,
              winRate: stats.winRate,
              profitFactor: stats.profitFactor,
              averageR: stats.averageR,
              ruleAdherenceRate: stats.ruleAdherenceRate,
              totalTrades: stats.totalTrades,
            },
            currency: reportingCurrency,
          },
          coachingStyle: user?.preferences?.coachingStyle || 'balanced',
        }),
      });

      const data = await res.json();
      setResponse(data.response || data.error || 'AI analysis complete.');
    } catch {
      setResponse('AI Coach is temporarily unavailable. Your trading data is safe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in fade-in-50 zoom-in-95 duration-150 max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs uppercase tracking-wider font-mono block">Quick AI Coach</span>
              <span className="text-[11px] text-zinc-400 capitalize">Context: {contextPage} view</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Response */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Contextual Chips */}
          <div className="flex flex-wrap gap-1.5">
            {getContextualPrompts().map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(p);
                  handleSend(p);
                }}
                disabled={loading}
                className="px-2.5 py-1 text-[11px] rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {loading && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Analyzing journal context…</span>
            </div>
          )}

          {response && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 whitespace-pre-wrap leading-relaxed text-[13px] animate-in fade-in">
              {response}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your journal or performance..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="flex-1 p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <span>Ask</span>
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
