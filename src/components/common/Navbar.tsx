import React, { useState } from 'react';
import {
  Plus,
  Moon,
  Sun,
  ShieldCheck,
  TrendingUp,
  Download,
  SlidersHorizontal,
  ChevronDown,
  User as UserIcon,
  Search,
  Brain,
  Eye,
  EyeOff,
  LogOut,
  Sparkles,
  Laptop,
} from 'lucide-react';
import { TradingAccount, User } from '../../types/trade';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  user: User | null;
  accounts: TradingAccount[];
  selectedAccountId: string; // 'all' or accountId
  onSelectAccount: (id: string) => void;
  dateRange: string;
  onChangeDateRange: (range: string) => void;
  reportingCurrency: string;
  onChangeReportingCurrency: (currency: string) => void;
  theme: 'dark' | 'light' | 'system';
  onToggleTheme: () => void;
  privacyMode: boolean;
  onTogglePrivacyMode: () => void;
  onOpenAddTrade: () => void;
  onOpenExportImport: () => void;
  onOpenSettings: () => void;
  onOpenQuickAI: () => void;
  onOpenAICoach: () => void;
  onOpenCommandPalette: () => void;
  onOpenGoogleAuth: () => void;
  onSignOut: () => void;
  onRunDiagnostics: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  accounts,
  selectedAccountId,
  onSelectAccount,
  dateRange,
  onChangeDateRange,
  reportingCurrency,
  onChangeReportingCurrency,
  theme,
  onToggleTheme,
  privacyMode,
  onTogglePrivacyMode,
  onOpenAddTrade,
  onOpenExportImport,
  onOpenSettings,
  onOpenQuickAI,
  onOpenAICoach,
  onOpenCommandPalette,
  onOpenGoogleAuth,
  onSignOut,
  onRunDiagnostics,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Brand & Account Filter */}
      <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-5 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 shrink-0">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 block leading-tight">TradePulse</span>
            <span className="text-[10px] block font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium leading-none mt-0.5">
              Journal &amp; Coach
            </span>
          </div>
        </div>

        {/* Global Command / Search Palette Trigger (Ctrl+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 transition-colors shrink-0"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] whitespace-nowrap">Search &amp; Commands</span>
          <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
            ⌘K
          </kbd>
        </button>

        {/* Account Selector */}
        <div className="relative shrink min-w-0">
          <select
            value={selectedAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            className="text-xs font-medium pl-2.5 pr-7 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer max-w-[130px] sm:max-w-[190px] truncate"
          >
            <option value="all">All Accounts ({accounts.length})</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.baseCurrency})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Reporting Currency selector */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="text-[11px] font-mono uppercase text-zinc-400">FX Base:</span>
          <select
            value={reportingCurrency}
            onChange={(e) => onChangeReportingCurrency(e.target.value)}
            className="text-xs font-mono font-medium px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 cursor-pointer focus:outline-none"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Privacy Mode Toggle */}
        <button
          onClick={onTogglePrivacyMode}
          title={privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode (Mask Balances)'}
          className={`p-1.5 rounded-md border text-xs transition-colors shrink-0 ${
            privacyMode
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
          }`}
        >
          {privacyMode ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Global Ask AI Button */}
        <button
          onClick={onOpenQuickAI}
          title="Ask AI Trading Coach"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
        >
          <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        {/* Diagnostics Button */}
        <button
          onClick={onRunDiagnostics}
          title="Run financial calculation regression test suite"
          className="hidden 2xl:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 shrink-0"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Math Tests</span>
        </button>

        {/* Export / Import Button */}
        <button
          onClick={onOpenExportImport}
          title="Export Excel/CSV or Import Spreadsheet"
          className="p-1.5 sm:px-2.5 sm:py-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 shrink-0"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">Export</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title={`Current theme: ${theme}. Click to change.`}
          className="p-1.5 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors shrink-0"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : theme === 'light' ? (
            <Moon className="w-4 h-4 text-zinc-700" />
          ) : (
            <Laptop className="w-4 h-4 text-purple-500" />
          )}
        </button>

        {/* Add Trade Primary CTA */}
        <button
          onClick={onOpenAddTrade}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-md shadow-xs transition-all focus:outline-none shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
          <span className="whitespace-nowrap">Add Trade</span>
        </button>

        {/* Profile Avatar / Google Sign-In Menu (Section 54) */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition-all"
          >
            <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="md" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div
              onClick={() => setProfileDropdownOpen(false)}
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-100"
            >
              <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate">{user?.name || 'Trader'}</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate font-mono">
                  {user?.email || 'mr.somnath2020@gmail.com'}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold mt-1 inline-block">
                  Google Signed In
                </span>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={onOpenSettings}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-between"
                >
                  <span>User Settings</span>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                <button
                  onClick={onOpenAICoach}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-purple-700 dark:text-purple-300 font-medium flex items-center justify-between"
                >
                  <span>AI Coach Settings</span>
                  <Brain className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onOpenExportImport}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-between"
                >
                  <span>Export Journal Data</span>
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                <button
                  onClick={onOpenGoogleAuth}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  Switch Google Account
                </button>

                <div className="pt-1 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={onSignOut}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
