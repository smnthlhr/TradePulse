import {
  Trade,
  TradingAccount,
  AccountTransaction,
  Strategy,
  PersonalRule,
  TradingGoal,
  DailyJournalEntry,
  UserPreferences,
  User,
} from '../types/trade';
import { convertCurrency, DEFAULT_FX_RATES_TO_USD } from '../utils/currency';
import { calculateTrade } from '../utils/calculations';

const STORAGE_KEY_PREFIX = 'tradepulse_v2_';

export interface BackupFileStructure {
  backupVersion: number;
  appVersion: string;
  exportedAt: string;
  settings?: any;
  accounts: TradingAccount[];
  trades: Trade[];
  journalEntries: DailyJournalEntry[];
  strategies: Strategy[];
  rules: PersonalRule[];
  goals: TradingGoal[];
  transactions: AccountTransaction[];
  fxRates?: Record<string, number>;
}

export interface StorageData {
  currentUser: User | null;
  accounts: TradingAccount[];
  transactions: AccountTransaction[];
  trades: Trade[];
  strategies: Strategy[];
  rules: PersonalRule[];
  goals: TradingGoal[];
  dailyJournals: DailyJournalEntry[];
  fxRates: Record<string, number>;
}

export function getZeroInitialData(userId: string): StorageData {
  return {
    currentUser: null,
    accounts: [],
    transactions: [],
    trades: [],
    strategies: DEFAULT_STRATEGIES,
    rules: DEFAULT_RULES,
    goals: DEFAULT_GOALS,
    dailyJournals: [],
    fxRates: DEFAULT_FX_RATES_TO_USD,
  };
}

// Default initial strategies
export const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'strat_breakout',
    userId: 'default_user',
    name: 'Opening Range Breakout',
    description: 'High momentum breakout of the 15-minute or 30-minute opening range with volume confirmation.',
    entryCriteria: 'Break and close beyond the ORB high/low with >1.5x relative volume.',
    stopLossRules: 'Midpoint of opening range candle or VWAP.',
    targetRules: '2x the opening range width or minimum 1:2 R:R.',
    minRR: 2.0,
    preferredMarketConditions: 'High volatility, trending open, positive index breadth.',
    checklist: [
      { id: 'c1', label: '15-min range defined clearly', isRequired: true },
      { id: 'c2', label: 'Volume spike on breakout candle', isRequired: true },
      { id: 'c3', label: 'Market trend aligned with trade direction', isRequired: true },
      { id: 'c4', label: 'Calculated stop loss placed before entry', isRequired: true },
      { id: 'c5', label: 'Minimum 1:2 R:R potential verified', isRequired: true },
      { id: 'c6', label: 'No high-impact economic news within 15 mins', isRequired: false },
    ],
    color: '#3b82f6',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'strat_pullback',
    userId: 'default_user',
    name: 'Trend Pullback & VWAP Bounce',
    description: 'Buying pullbacks to dynamic support (20 EMA / VWAP) in an established strong trend.',
    entryCriteria: 'Price touches 20 EMA or VWAP with bullish reversal hammer / engulfing candle.',
    stopLossRules: 'Below the swing low or invalidation wick of trigger candle.',
    targetRules: 'Previous swing high or trailing stop on EMA break.',
    minRR: 2.5,
    preferredMarketConditions: 'Clean trending market, higher highs and higher lows.',
    checklist: [
      { id: 'p1', label: 'Higher timeframe trend is clearly up', isRequired: true },
      { id: 'p2', label: 'Pullback occurred on declining volume', isRequired: true },
      { id: 'p3', label: 'Reversal candlestick confirmed at support level', isRequired: true },
      { id: 'p4', label: 'Risk to reward exceeds 1:2.5', isRequired: true },
      { id: 'p5', label: 'Position size calibrated to 1% account risk', isRequired: true },
    ],
    color: '#10b981',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'strat_reversal',
    userId: 'default_user',
    name: 'Key Level Liquidity Sweep',
    description: 'Fading false breakouts at prominent daily/weekly support or resistance zones.',
    entryCriteria: 'Price sweeps previous high/low, rejects immediately, and closes back inside the range.',
    stopLossRules: 'Above the sweep high or below the sweep low with small buffer.',
    targetRules: 'Opposing range boundary or POC / VWAP.',
    minRR: 3.0,
    preferredMarketConditions: 'Range-bound market or extended exhaustive moves.',
    checklist: [
      { id: 'r1', label: 'Key HTF level identified prior to session', isRequired: true },
      { id: 'r2', label: 'Sweep candle shows clear rejection wick', isRequired: true },
      { id: 'r3', label: 'Delta divergence or exhaustion volume', isRequired: false },
      { id: 'r4', label: 'Strict stop above the extreme point', isRequired: true },
      { id: 'r5', label: 'R:R is minimum 1:3', isRequired: true },
    ],
    color: '#8b5cf6',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// Default Personal Rules
export const DEFAULT_RULES: PersonalRule[] = [
  {
    id: 'rule_1',
    userId: 'default_user',
    title: 'Maximum 3 Trades Per Day',
    category: 'max_trades_day',
    value: 3,
    unit: 'trades',
    enabled: true,
    warningMessage: 'Daily trade limit reached. Overtrading leads to emotional decision making.',
    description: 'Stop taking new setups once 3 trades are executed for the day.',
  },
  {
    id: 'rule_2',
    userId: 'default_user',
    title: 'Max Daily Loss Limit (2% of Account)',
    category: 'max_daily_loss',
    value: 2,
    unit: 'percent',
    enabled: true,
    warningMessage: 'Maximum daily loss exceeded. Walk away from the screen immediately.',
    description: 'Protect capital by stopping trading after losing 2% in a single session.',
  },
  {
    id: 'rule_3',
    userId: 'default_user',
    title: 'Minimum Planned R:R of 1:2',
    category: 'min_rr',
    value: 2.0,
    unit: 'ratio',
    enabled: true,
    warningMessage: 'Planned Risk-to-Reward is below your configured minimum (1:2).',
    description: 'Never enter a trade with an asymmetrical payoff less than 2x your risk.',
  },
  {
    id: 'rule_4',
    userId: 'default_user',
    title: 'Always Place Stop Loss on Entry',
    category: 'custom',
    value: 1,
    unit: 'ratio',
    enabled: true,
    warningMessage: 'Trade entered without predefined hard stop loss.',
    description: 'Every trade must have a calculated hard stop loss order.',
  },
];

// Default Goals
export const DEFAULT_GOALS: TradingGoal[] = [
  {
    id: 'goal_1',
    userId: 'default_user',
    title: 'Follow Stop Loss on 90% of Trades',
    description: 'Never move a stop loss further away from entry or remove it.',
    metricType: 'stop_loss_discipline',
    targetValue: 90,
    period: 'month',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'goal_2',
    userId: 'default_user',
    title: 'Maintain Average R:R Above 2.0',
    description: 'Let winners run to target levels and cut losers strictly at 1R.',
    metricType: 'avg_rr',
    targetValue: 2.0,
    period: 'month',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'goal_3',
    userId: 'default_user',
    title: 'Zero FOMO / Revenge Trades',
    description: 'Only enter setups that pass 100% of the playbook checklist.',
    metricType: 'fomo_reduction',
    targetValue: 0,
    period: 'month',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'goal_4',
    userId: 'default_user',
    title: 'Complete Daily Journal Every Session',
    description: 'Document pre-market thesis and end-of-day reviews.',
    metricType: 'journal_completion',
    targetValue: 95,
    period: 'month',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// Initial Realistic Sample Trades for high-value preview
export function generateSampleData(userId: string, defaultCurrency: string): StorageData {
  const account1: TradingAccount = {
    id: 'acc_main',
    userId,
    name: 'Zerodha Pro Equity',
    brokerName: 'Zerodha',
    nickname: 'Primary Live',
    accountType: 'Live',
    startingBalance: 500000,
    currentBalance: 500000,
    baseCurrency: defaultCurrency,
    openingDate: '2026-01-01T00:00:00.000Z',
    color: '#0284c7',
    notes: 'Main swing and intraday equity ledger.',
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const account2: TradingAccount = {
    id: 'acc_prop',
    userId,
    name: 'FTMO Funded 100K',
    brokerName: 'FTMO',
    nickname: 'Prop Challenge',
    accountType: 'Funded',
    startingBalance: 100000,
    currentBalance: 100000,
    baseCurrency: 'USD',
    openingDate: '2026-01-15T00:00:00.000Z',
    color: '#8b5cf6',
    notes: 'Forex and Indices funded evaluation account.',
    isArchived: false,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  };

  const sampleTrades: Trade[] = [
    {
      id: 'trade_sample_1',
      userId,
      accountId: 'acc_main',
      symbol: 'RELIANCE',
      assetName: 'Reliance Industries',
      assetClass: 'equity',
      direction: 'long',
      productType: 'Intraday',
      status: 'closed',
      entryDate: '2026-03-02T09:35',
      exitDate: '2026-03-02T14:45',
      entryPrice: 2840,
      exitPrice: 2895,
      quantity: 100,
      stopLossPrice: 2820,
      targetPrice: 2890,
      plannedRiskAmount: 2000,
      plannedRiskPerUnit: 20,
      plannedRewardAmount: 5000,
      plannedRR: 2.5,
      totalFees: 120,
      grossPnL: 5500,
      netPnL: 5380,
      pnlPercentage: 1.89,
      pnlPerUnit: 55,
      actualRMultiple: 2.69,
      holdingPeriodMinutes: 310,
      amountInvested: 284000,
      strategyId: 'strat_breakout',
      strategyName: 'Opening Range Breakout',
      checklistResponses: { c1: true, c2: true, c3: true, c4: true, c5: true, c6: true },
      rulesFollowedCount: 6,
      rulesTotalCount: 6,
      disciplineScore: 100,
      ratings: { setupQuality: 5, executionQuality: 5 },
      notes: {
        thesis: 'Clean 15-minute range breakout above VWAP with surging volume on Nifty support bounce.',
        positives: 'Waited for candle close before entering; stuck strictly to planned target.',
        negatives: 'None, textbook execution.',
        mistakes: [],
        lessonsLearned: 'Patience pays. Waiting for volume confirmation prevented false breaks.',
        nextTime: 'Repeat this exact discipline on future ORBs.',
      },
      psychology: {
        confidence: 5,
        fear: 1,
        greed: 1,
        stress: 1,
        patience: 5,
        focus: 5,
        emotions: ['Calm', 'Confident'],
      },
      screenshots: [
        {
          id: 'sc_1',
          url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
          caption: 'Breakout above opening range on 5m chart with volume spike',
          category: 'entry',
          createdAt: '2026-03-02T09:40',
        },
      ],
      tags: ['#Breakout', '#CleanSetup', '#VWAP'],
      tradeCurrency: defaultCurrency,
      reportingCurrency: defaultCurrency,
      fxRateUsed: 1.0,
      netPnLReporting: 5380,
      createdAt: '2026-03-02T15:00:00.000Z',
      updatedAt: '2026-03-02T15:00:00.000Z',
    },
    {
      id: 'trade_sample_2',
      userId,
      accountId: 'acc_main',
      symbol: 'TCS',
      assetName: 'Tata Consultancy Services',
      assetClass: 'equity',
      direction: 'long',
      productType: 'Intraday',
      status: 'closed',
      entryDate: '2026-03-03T10:15',
      exitDate: '2026-03-03T11:45',
      entryPrice: 3950,
      exitPrice: 3925,
      quantity: 50,
      stopLossPrice: 3925,
      targetPrice: 4010,
      plannedRiskAmount: 1250,
      plannedRiskPerUnit: 25,
      plannedRewardAmount: 3000,
      plannedRR: 2.4,
      totalFees: 85,
      grossPnL: -1250,
      netPnL: -1335,
      pnlPercentage: -0.68,
      pnlPerUnit: -25,
      actualRMultiple: -1.07,
      holdingPeriodMinutes: 90,
      amountInvested: 197500,
      strategyId: 'strat_pullback',
      strategyName: 'Trend Pullback & VWAP Bounce',
      checklistResponses: { p1: true, p2: true, p3: true, p4: true, p5: true },
      rulesFollowedCount: 5,
      rulesTotalCount: 5,
      disciplineScore: 100,
      ratings: { setupQuality: 4, executionQuality: 5 },
      notes: {
        thesis: 'Pullback into 20 EMA, but IT sector faced broader index pressure and failed.',
        positives: 'Respected hard stop loss immediately without hesitation.',
        negatives: 'Ignored IT sectoral weakness.',
        mistakes: [],
        lessonsLearned: 'Standard 1R loss handled calmly without emotion or revenge trading.',
        nextTime: 'Check sectoral index relative strength prior to individual stock pullback entry.',
      },
      psychology: {
        confidence: 4,
        fear: 2,
        greed: 1,
        stress: 2,
        patience: 4,
        focus: 4,
        emotions: ['Calm'],
      },
      screenshots: [],
      tags: ['#Pullback', '#DisciplinedLoss'],
      tradeCurrency: defaultCurrency,
      reportingCurrency: defaultCurrency,
      fxRateUsed: 1.0,
      netPnLReporting: -1335,
      createdAt: '2026-03-03T12:00:00.000Z',
      updatedAt: '2026-03-03T12:00:00.000Z',
    },
    {
      id: 'trade_sample_3',
      userId,
      accountId: 'acc_main',
      symbol: 'INFY',
      assetName: 'Infosys Limited',
      assetClass: 'equity',
      direction: 'short',
      productType: 'Intraday',
      status: 'closed',
      entryDate: '2026-03-04T11:20',
      exitDate: '2026-03-04T14:10',
      entryPrice: 1820,
      exitPrice: 1785,
      quantity: 120,
      stopLossPrice: 1835,
      targetPrice: 1780,
      plannedRiskAmount: 1800,
      plannedRiskPerUnit: 15,
      plannedRewardAmount: 4800,
      plannedRR: 2.67,
      totalFees: 110,
      grossPnL: 4200,
      netPnL: 4090,
      pnlPercentage: 1.87,
      pnlPerUnit: 35,
      actualRMultiple: 2.27,
      holdingPeriodMinutes: 170,
      amountInvested: 218400,
      strategyId: 'strat_reversal',
      strategyName: 'Key Level Liquidity Sweep',
      checklistResponses: { r1: true, r2: true, r3: true, r4: true, r5: true },
      rulesFollowedCount: 5,
      rulesTotalCount: 5,
      disciplineScore: 100,
      ratings: { setupQuality: 5, executionQuality: 4 },
      notes: {
        thesis: 'Liquidity sweep above previous day high with strong rejection candle.',
        positives: 'Great read of resistance level rejection.',
        negatives: 'Exited slightly ahead of final target at 1780 due to lunch-hour chop.',
        mistakes: ['Early exit'],
        lessonsLearned: 'Trust the target when market structure has not been invalidated.',
        nextTime: 'Use trailing stop on 15m rather than exiting early.',
      },
      psychology: {
        confidence: 4,
        fear: 1,
        greed: 2,
        stress: 2,
        patience: 3,
        focus: 4,
        emotions: ['Impatient'],
      },
      screenshots: [],
      tags: ['#Short', '#LiquiditySweep'],
      tradeCurrency: defaultCurrency,
      reportingCurrency: defaultCurrency,
      fxRateUsed: 1.0,
      netPnLReporting: 4090,
      createdAt: '2026-03-04T15:00:00.000Z',
      updatedAt: '2026-03-04T15:00:00.000Z',
    },
    {
      id: 'trade_sample_4',
      userId,
      accountId: 'acc_main',
      symbol: 'HDFCBANK',
      assetName: 'HDFC Bank Ltd',
      assetClass: 'equity',
      direction: 'long',
      productType: 'Intraday',
      status: 'closed',
      entryDate: '2026-03-05T09:45',
      exitDate: '2026-03-05T10:30',
      entryPrice: 1720,
      exitPrice: 1705,
      quantity: 150,
      stopLossPrice: 1705,
      targetPrice: 1760,
      plannedRiskAmount: 2250,
      plannedRiskPerUnit: 15,
      plannedRewardAmount: 6000,
      plannedRR: 2.67,
      totalFees: 130,
      grossPnL: -2250,
      netPnL: -2380,
      pnlPercentage: -0.92,
      pnlPerUnit: -15,
      actualRMultiple: -1.06,
      holdingPeriodMinutes: 45,
      amountInvested: 258000,
      strategyId: 'strat_breakout',
      strategyName: 'Opening Range Breakout',
      checklistResponses: { c1: true, c2: false, c3: true, c4: true, c5: true, c6: true },
      rulesFollowedCount: 5,
      rulesTotalCount: 6,
      disciplineScore: 83.3,
      ratings: { setupQuality: 2, executionQuality: 4 },
      notes: {
        thesis: 'Chased candle before 15-minute close without volume confirmation.',
        positives: 'Cut immediately when stop hit.',
        negatives: 'FOMO jumped into candle prematurely.',
        mistakes: ['FOMO', 'Early entry', 'Ignored setup'],
        lessonsLearned: 'Never compromise on volume confirmation filter.',
        nextTime: 'Sit on hands until the candle actually closes.',
      },
      psychology: {
        confidence: 3,
        fear: 3,
        greed: 4,
        stress: 4,
        patience: 1,
        focus: 2,
        emotions: ['FOMO', 'Impatient'],
      },
      screenshots: [],
      tags: ['#Mistake', '#FOMO'],
      tradeCurrency: defaultCurrency,
      reportingCurrency: defaultCurrency,
      fxRateUsed: 1.0,
      netPnLReporting: -2380,
      createdAt: '2026-03-05T11:00:00.000Z',
      updatedAt: '2026-03-05T11:00:00.000Z',
    },
    {
      id: 'trade_sample_5',
      userId,
      accountId: 'acc_main',
      symbol: 'TATAMOTORS',
      assetName: 'Tata Motors Limited',
      assetClass: 'equity',
      direction: 'long',
      productType: 'Intraday',
      status: 'closed',
      entryDate: '2026-03-06T10:00',
      exitDate: '2026-03-06T15:15',
      entryPrice: 960,
      exitPrice: 995,
      quantity: 150,
      stopLossPrice: 945,
      targetPrice: 995,
      plannedRiskAmount: 2250,
      plannedRiskPerUnit: 15,
      plannedRewardAmount: 5250,
      plannedRR: 2.33,
      totalFees: 125,
      grossPnL: 5250,
      netPnL: 5125,
      pnlPercentage: 3.56,
      pnlPerUnit: 35,
      actualRMultiple: 2.28,
      holdingPeriodMinutes: 315,
      amountInvested: 144000,
      strategyId: 'strat_pullback',
      strategyName: 'Trend Pullback & VWAP Bounce',
      checklistResponses: { p1: true, p2: true, p3: true, p4: true, p5: true },
      rulesFollowedCount: 5,
      rulesTotalCount: 5,
      disciplineScore: 100,
      ratings: { setupQuality: 5, executionQuality: 5 },
      notes: {
        thesis: 'Morning pullback tested previous day high and bounced strongly on above-average volume.',
        positives: 'Held entire position right to final target.',
        negatives: 'None.',
        mistakes: [],
        lessonsLearned: 'Staying in winners is the highest leverage skill in trading.',
        nextTime: 'Keep this relaxed execution posture.',
      },
      psychology: {
        confidence: 5,
        fear: 1,
        greed: 1,
        stress: 1,
        patience: 5,
        focus: 5,
        emotions: ['Calm', 'Confident'],
      },
      screenshots: [],
      tags: ['#A+Setup', '#Pullback'],
      tradeCurrency: defaultCurrency,
      reportingCurrency: defaultCurrency,
      fxRateUsed: 1.0,
      netPnLReporting: 5125,
      createdAt: '2026-03-06T15:30:00.000Z',
      updatedAt: '2026-03-06T15:30:00.000Z',
    },
    {
      id: 'trade_sample_6',
      userId,
      accountId: 'acc_main',
      symbol: 'SBIN',
      assetName: 'State Bank of India',
      assetClass: 'equity',
      direction: 'long',
      productType: 'Intraday',
      status: 'open',
      entryDate: '2026-03-09T09:40',
      entryPrice: 780,
      quantity: 100,
      stopLossPrice: 768,
      targetPrice: 808,
      plannedRiskAmount: 1200,
      plannedRiskPerUnit: 12,
      plannedRewardAmount: 2800,
      plannedRR: 2.33,
      totalFees: 30,
      grossPnL: 0,
      netPnL: -30,
      pnlPercentage: 0,
      actualRMultiple: 0,
      amountInvested: 78000,
      strategyId: 'strat_breakout',
      strategyName: 'Opening Range Breakout',
      checklistResponses: { c1: true, c2: true, c3: true, c4: true, c5: true, c6: true },
      rulesFollowedCount: 6,
      rulesTotalCount: 6,
      disciplineScore: 100,
      ratings: { setupQuality: 4, executionQuality: 4 },
      notes: {
        thesis: 'Fresh breakout above resistance level with strong public sector banking breadth.',
        mistakes: [],
      },
      screenshots: [],
      tags: ['#OpenTrade', '#Banking'],
      tradeCurrency: defaultCurrency,
      reportingCurrency: defaultCurrency,
      fxRateUsed: 1.0,
      netPnLReporting: -30,
      createdAt: '2026-03-09T09:45:00.000Z',
      updatedAt: '2026-03-09T09:45:00.000Z',
    },
  ];

  // Calculate account 1 current balance
  const totalNet = sampleTrades
    .filter((t) => t.accountId === 'acc_main')
    .reduce((sum, t) => sum + t.netPnL, 0);
  account1.currentBalance = account1.startingBalance + totalNet;

  const sampleDailyJournals: DailyJournalEntry[] = [
    {
      id: 'journal_2026-03-02',
      userId,
      date: '2026-03-02',
      preMarketOutlook: 'Nifty gap up following US rally. Watching Reliance and IT names for ORB setups.',
      keyLevels: 'Nifty 22,450 support, 22,600 resistance. Reliance 2,820 key pivot.',
      watchlist: 'RELIANCE, TCS, INFY, TATAMOTORS',
      tradingPlan: 'Only take 2 setups max. Focus on high relative volume breakout.',
      personalFocus: 'Breathe before pressing buy. Wait for 15-minute bar close.',
      eodWhatWorked: 'Reliance ORB worked with textbook precision. 1:2.6R target captured.',
      eodWhatFailed: 'Nothing significant failed today.',
      eodRulesFollowed: true,
      eodKeyLesson: 'High volume breakouts have follow-through.',
      eodTomorrowImprovement: 'Maintain identical selectivity tomorrow.',
      dayRating: 5,
      updatedAt: '2026-03-02T16:00:00.000Z',
    },
    {
      id: 'journal_2026-03-05',
      userId,
      date: '2026-03-05',
      preMarketOutlook: 'Range-bound open expected. Caution on banking names near resistance.',
      keyLevels: 'BankNifty 47,800 major resistance.',
      watchlist: 'HDFCBANK, ICICIBANK',
      tradingPlan: 'Wait for midday continuation or fade extremes.',
      personalFocus: 'Do not chase first 10 minutes.',
      eodWhatWorked: 'Cut HDFCBANK loss immediately without moving stop.',
      eodWhatFailed: 'Jumped in before bar closed (FOMO).',
      eodRulesFollowed: false,
      eodKeyLesson: 'FOMO trades will consistently produce sub-par R multiples.',
      eodTomorrowImprovement: 'Hands off keyboard for the first 15 minutes.',
      dayRating: 2,
      updatedAt: '2026-03-05T16:00:00.000Z',
    },
  ];

  return {
    currentUser: null,
    accounts: [account1, account2],
    transactions: [],
    trades: sampleTrades,
    strategies: DEFAULT_STRATEGIES.map((s) => ({ ...s, userId })),
    rules: DEFAULT_RULES.map((r) => ({ ...r, userId })),
    goals: DEFAULT_GOALS.map((g) => ({ ...g, userId })),
    dailyJournals: sampleDailyJournals,
    fxRates: DEFAULT_FX_RATES_TO_USD,
  };
}

class StorageService {
  private cache: StorageData | null = null;

  public init(userId = 'default_user', defaultCurrency = 'INR'): StorageData {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}data_${userId}`);
      if (raw) {
        this.cache = JSON.parse(raw);
        // Ensure all arrays exist
        if (this.cache) {
          if (!this.cache.accounts) this.cache.accounts = [];
          if (!this.cache.trades) this.cache.trades = [];
          if (!this.cache.strategies) this.cache.strategies = DEFAULT_STRATEGIES;
          if (!this.cache.rules) this.cache.rules = DEFAULT_RULES;
          if (!this.cache.goals) this.cache.goals = DEFAULT_GOALS;
          if (!this.cache.transactions) this.cache.transactions = [];
          if (!this.cache.dailyJournals) this.cache.dailyJournals = [];
          if (!this.cache.fxRates) this.cache.fxRates = DEFAULT_FX_RATES_TO_USD;
          return this.cache;
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    }

    // First time init: start clean at zero (no accounts, no trades, zero balances)
    const initialData = getZeroInitialData(userId);
    this.saveData(userId, initialData);
    this.cache = initialData;
    return initialData;
  }

  public getData(userId = 'default_user', defaultCurrency = 'INR'): StorageData {
    if (!this.cache) {
      return this.init(userId, defaultCurrency);
    }
    return this.cache;
  }

  public saveData(userId: string, data: StorageData): void {
    try {
      this.cache = data;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}data_${userId}`, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving data to localStorage:', e);
    }
  }

  // Recalculates all account balances from starting balance + transactions + net realized PnL
  public recalculateBalances(userId: string, reportingCurrency: string): StorageData {
    const data = this.getData(userId, reportingCurrency);

    data.accounts.forEach((acc) => {
      // 1. Calculate transactions total (deposits +, withdrawals -, adjustments +)
      const accTx = data.transactions.filter((tx) => tx.accountId === acc.id);
      let txNet = 0;
      accTx.forEach((tx) => {
        if (tx.type === 'deposit') txNet += tx.amount;
        else if (tx.type === 'withdrawal') txNet -= tx.amount;
        else if (tx.type === 'adjustment') txNet += tx.amount;
      });

      // 2. Realised trades PnL using calculateTrade as source of truth
      const accTrades = data.trades.filter((t) => t.accountId === acc.id);
      let tradesNet = 0;
      accTrades.forEach((t) => {
        const calc = calculateTrade(t);
        tradesNet += calc.netPnL || 0;
      });

      acc.currentBalance = Number((acc.startingBalance + txNet + tradesNet).toFixed(2));
    });

    // 3. Update trades reporting PnL based on current FX rates and calculateTrade
    data.trades.forEach((t) => {
      const calc = calculateTrade(t);
      t.grossPnL = calc.grossPnL;
      t.netPnL = calc.netPnL;
      t.totalFees = calc.charges;
      t.charges = calc.charges;
      t.amountInvested = calc.amountTraded;
      t.amountTraded = calc.amountTraded;
      t.pnlPercentage = calc.returnPercentage;

      const conv = convertCurrency(calc.netPnL, t.tradeCurrency || reportingCurrency, reportingCurrency, data.fxRates);
      t.reportingCurrency = reportingCurrency;
      t.fxRateUsed = conv.rateUsed;
      t.netPnLReporting = conv.convertedAmount;
    });

    this.saveData(userId, data);
    return data;
  }

  public exportBackupJSON(userId: string): string {
    const data = this.getData(userId);
    const backup: BackupFileStructure = {
      backupVersion: 1,
      appVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      accounts: data.accounts || [],
      trades: data.trades || [],
      journalEntries: data.dailyJournals || [],
      strategies: data.strategies || [],
      rules: data.rules || [],
      goals: data.goals || [],
      transactions: data.transactions || [],
      fxRates: data.fxRates || DEFAULT_FX_RATES_TO_USD,
    };
    return JSON.stringify(backup, null, 2);
  }

  public validateBackupJSON(jsonString: string): {
    isValid: boolean;
    error?: string;
    preview?: {
      exportedAt: string;
      accountsCount: number;
      tradesCount: number;
      journalCount: number;
      strategiesCount: number;
      backupVersion: number;
      data: BackupFileStructure;
    };
  } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, error: 'Invalid JSON file format.' };
      }

      // Check version
      const version = parsed.backupVersion || 1;
      if (version > 2) {
        return { isValid: false, error: `Unsupported backup version (${version}). Please update TradePulse.` };
      }

      const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      const trades = Array.isArray(parsed.trades) ? parsed.trades : [];
      const journalEntries = Array.isArray(parsed.journalEntries) ? parsed.journalEntries : Array.isArray(parsed.dailyJournals) ? parsed.dailyJournals : [];
      const strategies = Array.isArray(parsed.strategies) ? parsed.strategies : [];

      const previewData: BackupFileStructure = {
        backupVersion: version,
        appVersion: parsed.appVersion || '2.0.0',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        settings: parsed.settings,
        accounts,
        trades,
        journalEntries,
        strategies,
        rules: Array.isArray(parsed.rules) ? parsed.rules : [],
        goals: Array.isArray(parsed.goals) ? parsed.goals : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        fxRates: parsed.fxRates || DEFAULT_FX_RATES_TO_USD,
      };

      return {
        isValid: true,
        preview: {
          exportedAt: previewData.exportedAt,
          accountsCount: accounts.length,
          tradesCount: trades.length,
          journalCount: journalEntries.length,
          strategiesCount: strategies.length,
          backupVersion: version,
          data: previewData,
        },
      };
    } catch (e: any) {
      return { isValid: false, error: 'Malformed JSON. Failed to parse file: ' + (e?.message || '') };
    }
  }

  public restoreUserData(
    userId: string,
    backup: BackupFileStructure,
    mode: 'replace' | 'merge' = 'replace',
    reportingCurrency = 'INR'
  ): StorageData {
    let currentData = this.getData(userId, reportingCurrency);

    if (mode === 'replace') {
      currentData = {
        currentUser: currentData.currentUser,
        accounts: backup.accounts || [],
        trades: backup.trades || [],
        dailyJournals: backup.journalEntries || [],
        strategies: backup.strategies && backup.strategies.length > 0 ? backup.strategies : DEFAULT_STRATEGIES,
        rules: backup.rules && backup.rules.length > 0 ? backup.rules : DEFAULT_RULES,
        goals: backup.goals && backup.goals.length > 0 ? backup.goals : DEFAULT_GOALS,
        transactions: backup.transactions || [],
        fxRates: backup.fxRates || DEFAULT_FX_RATES_TO_USD,
      };
    } else {
      // Merge mode
      const existingAccountIds = new Set(currentData.accounts.map((a) => a.id));
      const newAccounts = (backup.accounts || []).filter((a) => !existingAccountIds.has(a.id));

      const existingTradeIds = new Set(currentData.trades.map((t) => t.id));
      const newTrades = (backup.trades || []).filter((t) => !existingTradeIds.has(t.id));

      const existingJournalDates = new Set(currentData.dailyJournals.map((j) => j.date));
      const newJournals = (backup.journalEntries || []).filter((j) => !existingJournalDates.has(j.date));

      currentData.accounts = [...currentData.accounts, ...newAccounts];
      currentData.trades = [...newTrades, ...currentData.trades];
      currentData.dailyJournals = [...newJournals, ...currentData.dailyJournals];
    }

    this.saveData(userId, currentData);
    return this.recalculateBalances(userId, reportingCurrency);
  }

  public importBackupJSON(userId: string, jsonString: string): boolean {
    const check = this.validateBackupJSON(jsonString);
    if (!check.isValid || !check.preview) {
      return false;
    }
    this.restoreUserData(userId, check.preview.data, 'replace');
    return true;
  }

  public clearAllData(userId: string): void {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}data_${userId}`);
    this.cache = null;
  }
}

export const storageService = new StorageService();
