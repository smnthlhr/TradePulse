import React from 'react';
import {
  LayoutDashboard,
  Brain,
  CalendarDays,
  ReceiptText,
  BookOpenText,
  WalletCards,
  BookMarked,
  BarChart3,
  ShieldAlert,
  Target,
  FileCheck2,
  Settings,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export type NavTab =
  | 'dashboard'
  | 'ai_coach'
  | 'calendar'
  | 'trades'
  | 'journal'
  | 'accounts'
  | 'playbook'
  | 'analytics'
  | 'rules'
  | 'goals'
  | 'reviews'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  totalReportingBalance: number;
  reportingCurrency: string;
  disciplineRate: number;
  privacyMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  totalReportingBalance,
  reportingCurrency,
  disciplineRate,
  privacyMode,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; isSpecial?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'ai_coach',
      label: 'AI Trading Coach',
      icon: <Brain className="w-4 h-4 text-purple-500" />,
      isSpecial: true,
    },
    { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'trades', label: 'Trades Ledger', icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'journal', label: 'Daily Journal', icon: <BookOpenText className="w-4 h-4" /> },
    { id: 'accounts', label: 'Accounts', icon: <WalletCards className="w-4 h-4" /> },
    { id: 'playbook', label: 'Playbook', icon: <BookMarked className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'rules', label: 'Discipline & Rules', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'goals', label: 'Goals', icon: <Target className="w-4 h-4" /> },
    { id: 'reviews', label: 'Periodic Reviews', icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-3 min-h-[calc(100vh-4rem)]">
      {/* Navigation List */}
      <nav className="space-y-0.5 flex-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white dark:text-zinc-900' : 'text-zinc-400 dark:text-zinc-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.isSpecial && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Portfolio Stats Footer */}
      <div className="pt-3 mt-auto border-t border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-0.5 truncate">
            Total Capital
          </span>
          <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {privacyMode ? '••••••' : formatCurrency(totalReportingBalance, reportingCurrency)}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
            <span>Discipline Rate</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{disciplineRate}%</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                disciplineRate >= 80 ? 'bg-emerald-500' : disciplineRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, disciplineRate))}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
