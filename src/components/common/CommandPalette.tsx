import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Brain,
  Calendar,
  LayoutDashboard,
  Download,
  Eye,
  EyeOff,
  Moon,
  Sun,
  X,
  ReceiptText,
  BookOpenText,
  WalletCards,
  BookMarked,
} from 'lucide-react';
import { Trade, Strategy, TradingAccount } from '../../types/trade';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string, payload?: any) => void;
  trades: Trade[];
  strategies: Strategy[];
  accounts: TradingAccount[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  trades,
  strategies,
  accounts,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // toggle
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const actions = [
    { id: 'add_trade', label: 'Add New Trade', shortcut: 'N', icon: <Plus className="w-4 h-4 text-emerald-500" /> },
    { id: 'ai_coach', label: 'Ask AI Trading Coach', shortcut: 'A', icon: <Brain className="w-4 h-4 text-purple-500" /> },
    { id: 'calendar', label: 'Open Performance Calendar', shortcut: 'C', icon: <Calendar className="w-4 h-4 text-blue-500" /> },
    { id: 'dashboard', label: 'Go to Dashboard', shortcut: 'D', icon: <LayoutDashboard className="w-4 h-4 text-indigo-500" /> },
    { id: 'journal', label: 'Open Daily Journal', shortcut: 'J', icon: <BookOpenText className="w-4 h-4 text-amber-500" /> },
    { id: 'trades', label: 'Open Trades Ledger', shortcut: '', icon: <ReceiptText className="w-4 h-4 text-zinc-400" /> },
    { id: 'export', label: 'Export Trades (.xlsx / .csv)', shortcut: '', icon: <Download className="w-4 h-4 text-teal-500" /> },
    { id: 'toggle_privacy', label: 'Toggle Privacy Mode (Mask Balances)', shortcut: '', icon: <EyeOff className="w-4 h-4 text-zinc-400" /> },
    { id: 'toggle_theme', label: 'Toggle Dark / Light Mode', shortcut: '', icon: <Sun className="w-4 h-4 text-amber-400" /> },
  ];

  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const matchedTrades = trades
    .filter((t) => t.symbol.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  const matchedStrategies = strategies
    .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in fade-in-50 zoom-in-95 duration-100">
        {/* Search Input */}
        <div className="relative border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search symbols, strategies, accounts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3 text-xs">
          {/* Quick Actions */}
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-400 px-3 block mb-1">
              Quick Actions
            </span>
            <div className="space-y-0.5">
              {filteredActions.map((act) => (
                <button
                  key={act.id}
                  onClick={() => {
                    onSelectAction(act.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {act.icon}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{act.label}</span>
                  </div>
                  {act.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400">
                      {act.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Matched Trades */}
          {matchedTrades.length > 0 && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase text-zinc-400 px-3 block mb-1">
                Matching Trades
              </span>
              <div className="space-y-0.5">
                {matchedTrades.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectAction('view_trade', t);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{t.symbol}</span>
                      <span className="text-zinc-400 uppercase text-[10px]">
                        ({t.direction} · {t.productType})
                      </span>
                    </div>
                    <span
                      className={`font-mono font-semibold ${
                        t.netPnL > 0 ? 'text-emerald-500' : t.netPnL < 0 ? 'text-rose-500' : 'text-zinc-400'
                      }`}
                    >
                      {t.netPnL >= 0 ? '+' : ''}
                      {t.netPnL}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Strategies */}
          {matchedStrategies.length > 0 && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase text-zinc-400 px-3 block mb-1">
                Playbook Strategies
              </span>
              <div className="space-y-0.5">
                {matchedStrategies.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectAction('view_strategy', s);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookMarked className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">Min 1:{s.minRR}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
