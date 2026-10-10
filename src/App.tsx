import React, { useState, useEffect, useMemo } from 'react';
import {
  Trade,
  TradingAccount,
  AccountTransaction,
  Strategy,
  PersonalRule,
  TradingGoal,
  DailyJournalEntry,
  User,
  UserPreferences,
} from './types/trade';
import { storageService, generateSampleData } from './services/storage';
import { authService } from './services/authService';
import { calculatePortfolioStats, calculateTrade } from './utils/calculations';
import { convertCurrency } from './utils/currency';

// Common Components
import { Navbar } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { MobileNav } from './components/common/MobileNav';
import { DiagnosticsModal } from './components/common/DiagnosticsModal';
import { CommandPalette } from './components/common/CommandPalette';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';
import { ConfirmDeleteTradeModal } from './components/common/ConfirmDeleteTradeModal';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { AICoachView } from './components/ai/AICoachView';
import { QuickAIModal } from './components/ai/QuickAIModal';
import { FloatingAIAssistant } from './components/ai/FloatingAIAssistant';
import { PerformanceCalendar } from './components/calendar/PerformanceCalendar';
import { TradeLedger } from './components/trade/TradeLedger';
import { AddTradeModal } from './components/trade/AddTradeModal';
import { TradeDetailsModal } from './components/trade/TradeDetailsModal';
import { AccountsView } from './components/accounts/AccountsView';
import { PlaybookView } from './components/playbook/PlaybookView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { RulesView } from './components/rules/RulesView';
import { GoalsView } from './components/rules/GoalsView';
import { DailyJournalView } from './components/journal/DailyJournalView';
import { WeeklyMonthlyReview } from './components/reviews/WeeklyMonthlyReview';
import { ExportImportModal } from './components/export/ExportImportModal';
import { SettingsView } from './components/settings/SettingsView';
import { OnboardingModal } from './components/onboarding/OnboardingModal';

export default function App() {
  // Current Authenticated User & Preferences
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [reportingCurrency, setReportingCurrency] = useState('INR');
  const [privacyMode, setPrivacyMode] = useState(false);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  // Central Application Data State
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [rules, setRules] = useState<PersonalRule[]>([]);
  const [goals, setGoals] = useState<TradingGoal[]>([]);
  const [dailyJournals, setDailyJournals] = useState<DailyJournalEntry[]>([]);

  // Modals & Panels State
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [inspectingTrade, setInspectingTrade] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGoogleAuthOpen, setIsGoogleAuthOpen] = useState(false);
  const [isQuickAIOpen, setIsQuickAIOpen] = useState(false);
  const [quickAIInitialPrompt, setQuickAIInitialPrompt] = useState<string | undefined>(undefined);

  // Initialize storage & theme on mount
  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    const initialCurrency = user?.preferences?.defaultCurrency || 'INR';
    setReportingCurrency(initialCurrency);

    const initialTheme = user?.preferences?.theme || 'dark';
    setTheme(initialTheme);

    const initialPrivacy = user?.preferences?.privacyMode || false;
    setPrivacyMode(initialPrivacy);

    // Purge any old v1 sample records so user begins cleanly from zero
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('tradepulse_v1_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    const data = storageService.init(user?.id || 'user_primary', initialCurrency);
    setAccounts(data.accounts);
    setTransactions(data.transactions);
    setTrades(data.trades);
    setStrategies(data.strategies);
    setRules(data.rules);
    setGoals(data.goals);
    setDailyJournals(data.dailyJournals);

    if (user && !user.preferences.onboardingCompleted) {
      setIsOnboardingOpen(true);
    }
  }, []);

  // Update HTML class for dark/light/system mode
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  // Global Keyboard Shortcuts (Section 55: N, C, D, J, A, Ctrl+K)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing into input/textarea/select
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // Command Palette (Cmd/Ctrl + K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Single Key Nav Shortcuts
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          setEditingTrade(null);
          setIsAddTradeOpen(true);
          break;
        case 'c':
          e.preventDefault();
          setCurrentTab('calendar');
          break;
        case 'd':
          e.preventDefault();
          setCurrentTab('dashboard');
          break;
        case 'j':
          e.preventDefault();
          setCurrentTab('journal');
          break;
        case 'a':
          e.preventDefault();
          setCurrentTab('ai_coach');
          break;
        case 'escape':
          setIsCommandPaletteOpen(false);
          setIsQuickAIOpen(false);
          setIsGoogleAuthOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Handle Theme Toggle (Cycles Dark -> Light -> System)
  const toggleTheme = () => {
    const newTheme: 'dark' | 'light' | 'system' =
      theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(newTheme);
    const updated = authService.updatePreferences({ theme: newTheme });
    setCurrentUser(updated);
  };

  // Handle Privacy Mode Toggle (Section 37)
  const togglePrivacyMode = () => {
    const newPriv = !privacyMode;
    setPrivacyMode(newPriv);
    authService.updatePreferences({ privacyMode: newPriv });
  };

  // Sync central storage and recalculate account balances
  const syncAndPersist = (
    updatedAccounts: TradingAccount[],
    updatedTrades: Trade[],
    updatedTx = transactions,
    updatedStrat = strategies,
    updatedRules = rules,
    updatedGoals = goals,
    updatedJournals = dailyJournals
  ) => {
    const userId = currentUser?.id || 'user_primary';
    const storeData = storageService.getData(userId, reportingCurrency);

    storeData.accounts = updatedAccounts;
    storeData.trades = updatedTrades;
    storeData.transactions = updatedTx;
    storeData.strategies = updatedStrat;
    storeData.rules = updatedRules;
    storeData.goals = updatedGoals;
    storeData.dailyJournals = updatedJournals;

    storageService.saveData(userId, storeData);
    const refreshed = storageService.recalculateBalances(userId, reportingCurrency);

    setAccounts([...refreshed.accounts]);
    setTrades([...refreshed.trades]);
    setTransactions([...refreshed.transactions]);
    setStrategies([...refreshed.strategies]);
    setRules([...refreshed.rules]);
    setGoals([...refreshed.goals]);
    setDailyJournals([...refreshed.dailyJournals]);
  };

  // Change reporting currency handler
  const handleChangeReportingCurrency = (newCurr: string) => {
    setReportingCurrency(newCurr);
    authService.updatePreferences({ defaultCurrency: newCurr });
    const userId = currentUser?.id || 'user_primary';
    const refreshed = storageService.recalculateBalances(userId, newCurr);
    setAccounts([...refreshed.accounts]);
    setTrades([...refreshed.trades]);
  };

  // Filtered trades by account & date
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) {
        return false;
      }
      if (dateRange !== 'all') {
        const tradeDate = new Date(t.entryDate);
        const now = new Date();

        if (dateRange === 'today') {
          const isToday =
            tradeDate.getDate() === now.getDate() &&
            tradeDate.getMonth() === now.getMonth() &&
            tradeDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateRange === 'this_week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          if (tradeDate < oneWeekAgo) return false;
        } else if (dateRange === 'this_month') {
          const isThisMonth =
            tradeDate.getMonth() === now.getMonth() &&
            tradeDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (dateRange === 'last_month') {
          const lastMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (tradeDate.getMonth() !== lastMonthIndex || tradeDate.getFullYear() !== targetYear) {
            return false;
          }
        } else if (dateRange === 'ytd') {
          if (tradeDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [trades, selectedAccountId, dateRange]);

  // Aggregate Portfolio Statistics
  const portfolioStats = useMemo(() => {
    return calculatePortfolioStats(filteredTrades);
  }, [filteredTrades]);

  // Total Portfolio reporting balance
  const totalReportingBalance = useMemo(() => {
    const fxRates = storageService.getData(currentUser?.id || 'user_primary').fxRates;
    return accounts.reduce((sum, acc) => {
      const conv = convertCurrency(acc.currentBalance, acc.baseCurrency, reportingCurrency, fxRates);
      return sum + conv.convertedAmount;
    }, 0);
  }, [accounts, reportingCurrency, currentUser]);

  // Save Trade Handler
  const handleSaveTrade = (tradeToSave: Trade) => {
    const calc = calculateTrade(tradeToSave);
    const enrichedTrade: Trade = {
      ...tradeToSave,
      grossPnL: calc.grossPnL,
      netPnL: calc.netPnL,
      charges: calc.charges,
      totalFees: calc.charges,
      amountTraded: calc.amountTraded,
      amountInvested: calc.amountTraded,
      pnlPercentage: calc.returnPercentage,
      netPnLReporting: calc.netPnL,
    };

    const existingIndex = trades.findIndex((t) => t.id === enrichedTrade.id);
    let updatedTrades: Trade[];
    if (existingIndex >= 0) {
      updatedTrades = [...trades];
      updatedTrades[existingIndex] = enrichedTrade;
    } else {
      updatedTrades = [enrichedTrade, ...trades];
    }
    syncAndPersist(accounts, updatedTrades);
  };

  // Duplicate Trade Handler
  const handleDuplicateTrade = (tradeToDup: Trade) => {
    const duplicated: Trade = {
      ...tradeToDup,
      id: `trade_${Date.now()}`,
      status: 'open',
      exitPrice: undefined,
      exitDate: undefined,
      grossPnL: 0,
      netPnL: -(tradeToDup.charges ?? tradeToDup.totalFees ?? 0),
      actualRMultiple: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    syncAndPersist(accounts, [duplicated, ...trades]);
    setInspectingTrade(null);
  };

  // Delete Trade Handler
  const handleDeleteTrade = (tradeId: string) => {
    const updatedTrades = trades.filter((t) => t.id !== tradeId);
    syncAndPersist(accounts, updatedTrades);
  };

  const handleConfirmDeleteTrade = () => {
    if (!tradeToDelete) return;
    const id = tradeToDelete.id;
    setTradeToDelete(null);
    if (inspectingTrade?.id === id) {
      setInspectingTrade(null);
    }
    handleDeleteTrade(id);
  };

  // Accounts CRUD
  const handleSaveAccount = (accountToSave: TradingAccount) => {
    const idx = accounts.findIndex((a) => a.id === accountToSave.id);
    let updated: TradingAccount[];
    if (idx >= 0) {
      updated = [...accounts];
      updated[idx] = accountToSave;
    } else {
      updated = [...accounts, accountToSave];
    }
    syncAndPersist(updated, trades);
  };

  const handleDeleteTradingAccount = (accId: string, deleteTrades = false) => {
    const updatedAccounts = accounts.filter((a) => a.id !== accId);
    const updatedTrades = deleteTrades ? trades.filter((t) => t.accountId !== accId) : trades;
    const updatedTransactions = transactions.filter((tx) => tx.accountId !== accId);

    if (selectedAccountId === accId) {
      setSelectedAccountId('all');
    }

    syncAndPersist(updatedAccounts, updatedTrades, updatedTransactions);
  };

  const handleSaveTransaction = (tx: AccountTransaction) => {
    const updatedTx = [tx, ...transactions];
    syncAndPersist(accounts, trades, updatedTx);
  };

  // Strategy CRUD
  const handleSaveStrategy = (strat: Strategy) => {
    const idx = strategies.findIndex((s) => s.id === strat.id);
    let updated: Strategy[];
    if (idx >= 0) {
      updated = [...strategies];
      updated[idx] = strat;
    } else {
      updated = [...strategies, strat];
    }
    syncAndPersist(accounts, trades, transactions, updated);
  };

  const handleDeleteStrategy = (stratId: string) => {
    const updated = strategies.filter((s) => s.id !== stratId);
    syncAndPersist(accounts, trades, transactions, updated);
  };

  // Personal Rules CRUD
  const handleSaveRule = (rule: PersonalRule) => {
    const idx = rules.findIndex((r) => r.id === rule.id);
    let updated: PersonalRule[];
    if (idx >= 0) {
      updated = [...rules];
      updated[idx] = rule;
    } else {
      updated = [...rules, rule];
    }
    syncAndPersist(accounts, trades, transactions, strategies, updated);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updated = rules.filter((r) => r.id !== ruleId);
    syncAndPersist(accounts, trades, transactions, strategies, updated);
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r));
    syncAndPersist(accounts, trades, transactions, strategies, updated);
  };

  // Goals CRUD
  const handleSaveGoal = (goal: TradingGoal) => {
    const idx = goals.findIndex((g) => g.id === goal.id);
    let updated: TradingGoal[];
    if (idx >= 0) {
      updated = [...goals];
      updated[idx] = goal;
    } else {
      updated = [...goals, goal];
    }
    syncAndPersist(accounts, trades, transactions, strategies, rules, updated);
  };

  const handleDeleteGoal = (goalId: string) => {
    const updated = goals.filter((g) => g.id !== goalId);
    syncAndPersist(accounts, trades, transactions, strategies, rules, updated);
  };

  // Daily Journal CRUD
  const handleSaveDailyJournal = (entry: DailyJournalEntry) => {
    const idx = dailyJournals.findIndex((j) => j.id === entry.id || j.date === entry.date);
    let updated: DailyJournalEntry[];
    if (idx >= 0) {
      updated = [...dailyJournals];
      updated[idx] = entry;
    } else {
      updated = [entry, ...dailyJournals];
    }
    syncAndPersist(accounts, trades, transactions, strategies, rules, goals, updated);
  };

  const handleDeleteDailyJournal = (journalId: string) => {
    const updated = dailyJournals.filter((j) => j.id !== journalId);
    syncAndPersist(accounts, trades, transactions, strategies, rules, goals, updated);
  };

  // Import Trades
  const handleImportTrades = (importedList: Partial<Trade>[]) => {
    const fullTrades: Trade[] = importedList.map((imp, idx) => ({
      id: imp.id || `trade_imp_${Date.now()}_${idx}`,
      userId: currentUser?.id || 'user_primary',
      accountId: imp.accountId || accounts[0]?.id || 'acc_main',
      symbol: imp.symbol || 'ASSET',
      assetClass: imp.assetClass || 'equity',
      direction: imp.direction || 'long',
      productType: imp.productType || 'Delivery',
      status: imp.status || 'closed',
      entryDate: imp.entryDate || new Date().toISOString(),
      exitDate: imp.exitDate,
      entryPrice: imp.entryPrice || 0,
      exitPrice: imp.exitPrice,
      quantity: imp.quantity || 1,
      totalFees: imp.totalFees || 0,
      grossPnL: imp.grossPnL || 0,
      netPnL: imp.netPnL || 0,
      pnlPercentage: imp.pnlPercentage || 0,
      plannedRiskAmount: imp.plannedRiskAmount,
      plannedRewardAmount: imp.plannedRewardAmount,
      plannedRR: imp.plannedRR,
      actualRMultiple: imp.actualRMultiple,
      stopLossPrice: imp.stopLossPrice,
      targetPrice: imp.targetPrice,
      strategyName: imp.strategyName,
      screenshots: [],
      tags: imp.tags || [],
      tradeCurrency: imp.tradeCurrency || reportingCurrency,
      reportingCurrency,
      fxRateUsed: 1.0,
      netPnLReporting: imp.netPnL || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    syncAndPersist(accounts, [...fullTrades, ...trades]);
  };

  // Reset to sample demonstration records
  const handleResetSampleData = () => {
    const userId = currentUser?.id || 'user_primary';
    const sample = generateSampleData(userId, reportingCurrency);
    storageService.saveData(userId, sample);
    const refreshed = storageService.recalculateBalances(userId, reportingCurrency);
    setAccounts([...refreshed.accounts]);
    setTrades([...refreshed.trades]);
    setDailyJournals([...refreshed.dailyJournals]);
    setStrategies([...refreshed.strategies]);
  };

  // Clear all data
  const handleClearAllData = () => {
    const userId = currentUser?.id || 'user_primary';
    storageService.clearAllData(userId);
    setAccounts([]);
    setTrades([]);
    setTransactions([]);
    setDailyJournals([]);
  };

  // Delete Account (Section 64)
  const handleDeleteUserAccount = () => {
    const userId = currentUser?.id || 'user_primary';
    authService.deleteAccount(userId);
    storageService.clearAllData(userId);
    localStorage.removeItem(`tradepulse_ai_conversations_${userId}`);
    localStorage.removeItem(`tradepulse_ai_messages_${userId}`);
    setCurrentUser(null);
    setIsGoogleAuthOpen(true);
  };

  // Command Palette Action Dispatcher
  const handleCommandAction = (actionId: string, payload?: any) => {
    switch (actionId) {
      case 'add_trade':
        setEditingTrade(null);
        setIsAddTradeOpen(true);
        break;
      case 'ai_coach':
        setCurrentTab('ai_coach');
        break;
      case 'calendar':
        setCurrentTab('calendar');
        break;
      case 'dashboard':
        setCurrentTab('dashboard');
        break;
      case 'journal':
        setCurrentTab('journal');
        break;
      case 'trades':
        setCurrentTab('trades');
        break;
      case 'export':
        setIsExportImportOpen(true);
        break;
      case 'toggle_privacy':
        togglePrivacyMode();
        break;
      case 'toggle_theme':
        toggleTheme();
        break;
      case 'view_trade':
        if (payload) setInspectingTrade(payload);
        break;
      case 'view_strategy':
        setCurrentTab('playbook');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20">
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        dateRange={dateRange}
        onChangeDateRange={setDateRange}
        reportingCurrency={reportingCurrency}
        onChangeReportingCurrency={handleChangeReportingCurrency}
        theme={theme}
        onToggleTheme={toggleTheme}
        privacyMode={privacyMode}
        onTogglePrivacyMode={togglePrivacyMode}
        onOpenAddTrade={() => {
          setEditingTrade(null);
          setIsAddTradeOpen(true);
        }}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenSettings={() => setCurrentTab('settings')}
        onOpenQuickAI={() => {
          setQuickAIInitialPrompt(undefined);
          setIsQuickAIOpen(true);
        }}
        onOpenAICoach={() => setCurrentTab('ai_coach')}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenGoogleAuth={() => setIsGoogleAuthOpen(true)}
        onSignOut={() => {
          authService.logout();
          setCurrentUser(null);
          setIsGoogleAuthOpen(true);
        }}
        onRunDiagnostics={() => setIsDiagnosticsOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          totalReportingBalance={totalReportingBalance}
          reportingCurrency={reportingCurrency}
          disciplineRate={portfolioStats.ruleAdherenceRate}
          privacyMode={privacyMode}
        />

        {/* Content View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              user={currentUser}
              stats={portfolioStats}
              trades={filteredTrades}
              accounts={accounts}
              strategies={strategies}
              reportingCurrency={reportingCurrency}
              totalReportingBalance={totalReportingBalance}
              privacyMode={privacyMode}
              onTogglePrivacyMode={togglePrivacyMode}
              onOpenAddTrade={() => {
                setEditingTrade(null);
                setIsAddTradeOpen(true);
              }}
              onViewTrade={(t) => setInspectingTrade(t)}
              onOpenQuickAI={(prompt) => {
                setQuickAIInitialPrompt(prompt);
                setIsQuickAIOpen(true);
              }}
              onOpenCalendarDate={(dateStr) => {
                setCurrentTab('calendar');
              }}
            />
          )}

          {currentTab === 'ai_coach' && (
            <AICoachView
              user={currentUser}
              trades={filteredTrades}
              accounts={accounts}
              strategies={strategies}
              rules={rules}
              dailyJournals={dailyJournals}
              stats={portfolioStats}
              reportingCurrency={reportingCurrency}
              onViewTrade={(t) => setInspectingTrade(t)}
            />
          )}

          {currentTab === 'calendar' && (
            <PerformanceCalendar
              trades={filteredTrades}
              accounts={accounts}
              dailyJournals={dailyJournals}
              reportingCurrency={reportingCurrency}
              onSaveDailyJournal={handleSaveDailyJournal}
              onViewTrade={(t) => setInspectingTrade(t)}
              onOpenAddTrade={() => {
                setEditingTrade(null);
                setIsAddTradeOpen(true);
              }}
            />
          )}

          {currentTab === 'trades' && (
            <TradeLedger
              trades={filteredTrades}
              accounts={accounts}
              strategies={strategies}
              reportingCurrency={reportingCurrency}
              onOpenAddTrade={() => {
                setEditingTrade(null);
                setIsAddTradeOpen(true);
              }}
              onViewTrade={(t) => setInspectingTrade(t)}
              onEditTrade={(t) => {
                setEditingTrade(t);
                setIsAddTradeOpen(true);
              }}
              onRequestDeleteTrade={(t) => setTradeToDelete(t)}
              onDeleteTrade={handleDeleteTrade}
            />
          )}

          {currentTab === 'journal' && (
            <DailyJournalView
              dailyJournals={dailyJournals}
              trades={trades}
              accounts={accounts}
              reportingCurrency={reportingCurrency}
              onSaveDailyJournal={handleSaveDailyJournal}
              onDeleteDailyJournal={handleDeleteDailyJournal}
              onViewTrade={(t) => setInspectingTrade(t)}
              onEditTrade={(t) => {
                setEditingTrade(t);
                setIsAddTradeOpen(true);
              }}
              onRequestDeleteTrade={(t) => setTradeToDelete(t)}
              onDeleteTrade={handleDeleteTrade}
              onOpenAddTrade={(date) => {
                setEditingTrade(null);
                setIsAddTradeOpen(true);
              }}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountsView
              accounts={accounts}
              transactions={transactions}
              trades={trades}
              reportingCurrency={reportingCurrency}
              onSaveAccount={handleSaveAccount}
              onDeleteAccount={handleDeleteTradingAccount}
              onSaveTransaction={handleSaveTransaction}
            />
          )}

          {currentTab === 'playbook' && (
            <PlaybookView
              strategies={strategies}
              trades={trades}
              reportingCurrency={reportingCurrency}
              onSaveStrategy={handleSaveStrategy}
              onDeleteStrategy={handleDeleteStrategy}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView
              stats={portfolioStats}
              trades={filteredTrades}
              strategies={strategies}
              reportingCurrency={reportingCurrency}
            />
          )}

          {currentTab === 'rules' && (
            <RulesView
              rules={rules}
              disciplineScore={portfolioStats.ruleAdherenceRate}
              onSaveRule={handleSaveRule}
              onDeleteRule={handleDeleteRule}
              onToggleRule={handleToggleRule}
            />
          )}

          {currentTab === 'goals' && (
            <GoalsView
              goals={goals}
              trades={trades}
              onSaveGoal={handleSaveGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {currentTab === 'reviews' && (
            <WeeklyMonthlyReview
              trades={filteredTrades}
              strategies={strategies}
              reportingCurrency={reportingCurrency}
            />
          )}

          {currentTab === 'settings' && currentUser && (
            <SettingsView
              preferences={currentUser.preferences}
              onUpdatePreferences={(updated) => {
                const refreshedUser = authService.updatePreferences(updated);
                setCurrentUser(refreshedUser);
                if (updated.defaultCurrency) {
                  handleChangeReportingCurrency(updated.defaultCurrency);
                }
              }}
              onResetSampleData={handleResetSampleData}
              onClearAllData={handleClearAllData}
              onDeleteAccount={handleDeleteUserAccount}
              onSignOut={() => {
                authService.logout();
                setCurrentUser(null);
                setIsGoogleAuthOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAddTrade={() => {
          setEditingTrade(null);
          setIsAddTradeOpen(true);
        }}
      />

      {/* Add / Edit Trade Modal */}
      <AddTradeModal
        isOpen={isAddTradeOpen}
        onClose={() => {
          setIsAddTradeOpen(false);
          setEditingTrade(null);
        }}
        onSaveTrade={handleSaveTrade}
        onSaveAccount={handleSaveAccount}
        accounts={accounts}
        strategies={strategies}
        editingTrade={editingTrade}
        reportingCurrency={reportingCurrency}
      />

      {/* Inspect Full Trade Journal Modal */}
      {inspectingTrade && (
        <TradeDetailsModal
          trade={inspectingTrade}
          account={accounts.find((a) => a.id === inspectingTrade.accountId)}
          reportingCurrency={reportingCurrency}
          onClose={() => setInspectingTrade(null)}
          onEdit={(t) => {
            setInspectingTrade(null);
            setEditingTrade(t);
            setIsAddTradeOpen(true);
          }}
          onDelete={handleDeleteTrade}
          onAskAICoach={(t, question) => {
            setInspectingTrade(null);
            setCurrentTab('ai_coach');
          }}
        />
      )}

      {/* Export / Import Spreadsheet Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        trades={filteredTrades}
        accounts={accounts}
        strategies={strategies}
        stats={portfolioStats}
        reportingCurrency={reportingCurrency}
        onImportTrades={handleImportTrades}
        onRestoreBackup={() => {
          const userId = currentUser?.id || 'user_primary';
          const data = storageService.getData(userId, reportingCurrency);
          setAccounts(data.accounts);
          setTrades(data.trades);
          setStrategies(data.strategies);
          setRules(data.rules);
          setGoals(data.goals);
          setDailyJournals(data.dailyJournals);
        }}
      />

      {/* Mathematical Calculations Diagnostic Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* Quick Contextual AI Modal */}
      <QuickAIModal
        isOpen={isQuickAIOpen}
        onClose={() => setIsQuickAIOpen(false)}
        contextPage={currentTab}
        user={currentUser}
        trades={filteredTrades}
        accounts={accounts}
        strategies={strategies}
        stats={portfolioStats}
        reportingCurrency={reportingCurrency}
        activeTrade={inspectingTrade}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={handleCommandAction}
        trades={filteredTrades}
        strategies={strategies}
        accounts={accounts}
      />

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={isGoogleAuthOpen}
        onClose={() => setIsGoogleAuthOpen(false)}
        onLoginSuccess={(signedInUser) => {
          setCurrentUser(signedInUser);
          if (!signedInUser.preferences.onboardingCompleted) {
            setIsOnboardingOpen(true);
          }
        }}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={(prefs) => {
          const refreshed = authService.updatePreferences(prefs);
          setCurrentUser(refreshed);
          if (prefs.defaultCurrency) {
            handleChangeReportingCurrency(prefs.defaultCurrency);
          }
          setIsOnboardingOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteTradeModal
        isOpen={!!tradeToDelete}
        trade={tradeToDelete}
        accountName={tradeToDelete ? accounts.find((a) => a.id === tradeToDelete.accountId)?.name : undefined}
        onClose={() => setTradeToDelete(null)}
        onConfirm={handleConfirmDeleteTrade}
      />

      {/* Global Floating AI Coach & Live Voice Assistant */}
      <FloatingAIAssistant
        user={currentUser}
        trades={filteredTrades}
        accounts={accounts}
        strategies={strategies}
        rules={rules}
        dailyJournals={dailyJournals}
        stats={portfolioStats}
        reportingCurrency={reportingCurrency}
        contextPage={currentTab}
        onOpenTradeModal={() => {
          setEditingTrade(null);
          setIsAddTradeOpen(true);
        }}
      />
    </div>
  );
}
