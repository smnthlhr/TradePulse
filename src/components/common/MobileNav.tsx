import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  Brain,
  Menu,
  X,
  ReceiptText,
  BookOpenText,
  WalletCards,
  BookMarked,
  BarChart3,
  ShieldAlert,
  Target,
  FileCheck2,
  Settings,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddTrade: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab, onOpenAddTrade }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const moreItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'trades', label: 'Trades Ledger', icon: <ReceiptText className="w-5 h-5" /> },
    { id: 'journal', label: 'Daily Journal', icon: <BookOpenText className="w-5 h-5" /> },
    { id: 'accounts', label: 'Accounts', icon: <WalletCards className="w-5 h-5" /> },
    { id: 'playbook', label: 'Playbook', icon: <BookMarked className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'rules', label: 'Discipline Rules', icon: <ShieldAlert className="w-5 h-5" /> },
    { id: 'goals', label: 'Goals', icon: <Target className="w-5 h-5" /> },
    { id: 'reviews', label: 'Periodic Reviews', icon: <FileCheck2 className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Bottom Sticky Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-3 py-1 flex items-center justify-around h-16 safe-area-pb">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium transition-colors ${
            currentTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium transition-colors ${
            currentTab === 'calendar' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span>Calendar</span>
        </button>

        {/* Center Add Trade */}
        <button
          onClick={onOpenAddTrade}
          className="flex flex-col items-center justify-center -translate-y-3"
          aria-label="Add Trade"
        >
          <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 active:scale-95 transition-transform">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 leading-none">+ Trade</span>
        </button>

        {/* AI Coach */}
        <button
          onClick={() => onSelectTab('ai_coach')}
          className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium transition-colors ${
            currentTab === 'ai_coach' ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Brain className="w-5 h-5 mb-0.5 text-purple-500" />
          <span>AI Coach</span>
        </button>

        {/* More Drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium transition-colors ${
            drawerOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>

      {/* Mobile More Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Trading Modules</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setDrawerOpen(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                    currentTab === item.id
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="text-emerald-600 dark:text-emerald-400">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
