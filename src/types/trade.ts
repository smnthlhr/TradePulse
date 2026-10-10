export type TradeDirection = 'long' | 'short';

export type TradeStatus = 'open' | 'closed' | 'cancelled' | 'breakeven';

export type AssetClass =
  | 'equity'
  | 'etf'
  | 'futures'
  | 'options'
  | 'forex'
  | 'crypto'
  | 'commodity'
  | 'index'
  | 'cfd'
  | 'other';

export type ProductType =
  | 'Delivery'
  | 'Intraday'
  | 'Margin'
  | 'Futures'
  | 'Options'
  | 'Spot'
  | 'CFD'
  | 'Custom';

export type AccountType =
  | 'Live'
  | 'Demo'
  | 'Paper'
  | 'Prop firm'
  | 'Evaluation'
  | 'Funded'
  | 'Custom';

export interface PartialExecution {
  id: string;
  price: number;
  quantity: number;
  date: string;
  notes?: string;
}

export interface ScreenshotAttachment {
  id: string;
  url: string;
  caption: string;
  category: 'before_entry' | 'entry' | 'during_trade' | 'exit' | 'post_trade' | 'statistics' | 'other';
  createdAt: string;
}

export interface TradePsychology {
  confidence?: number; // 1-5
  fear?: number; // 1-5
  greed?: number; // 1-5
  stress?: number; // 1-5
  patience?: number; // 1-5
  focus?: number; // 1-5
  emotions: string[]; // e.g. 'Calm', 'FOMO', 'Revenge mode'
}

export interface TradeRatings {
  setupQuality?: number; // 1-5
  executionQuality?: number; // 1-5
}

export interface TradeNotes {
  thesis?: string;
  entryReason?: string;
  marketSentiment?: string;
  marketCondition?: string;
  expectedScenario?: string;
  invalidationCondition?: string;
  positives?: string;
  negatives?: string;
  mistakes: string[];
  lessonsLearned?: string;
  lessonLearned?: string;
  whatCanIImprove?: string;
  nextTime?: string;
}

export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  assetName?: string;
  assetClass: AssetClass;
  exchange?: string;
  direction: TradeDirection;
  productType: ProductType;
  status: TradeStatus;

  // Simple Add Trade Fields (Section 3-13)
  tradeDate?: string; // YYYY-MM-DD
  asset?: string; // free text asset name / symbol
  amountTraded?: number; // total capital used
  profit?: number; // positive profit number (>= 0)
  loss?: number; // positive loss magnitude (>= 0)
  charges?: number; // optional fees & charges
  entryTime?: string; // e.g. "09:30"
  exitTime?: string; // e.g. "11:45"
  strategy?: string; // free text custom strategy setup
  notesText?: string; // simple trade description

  entryDate: string; // ISO string or YYYY-MM-DDTHH:mm
  exitDate?: string;

  // Prices & Sizing
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  lotSize?: number;
  contractMultiplier?: number;
  amountInvested?: number;
  marginUsed?: number;
  leverage?: number;

  // Advanced Partial Executions
  isAdvancedMode?: boolean;
  entries?: PartialExecution[];
  exits?: PartialExecution[];

  // Risk Management
  stopLossPrice?: number;
  targetPrice?: number;
  plannedRiskAmount?: number;
  plannedRiskPerUnit?: number;
  plannedRiskPctOfAccount?: number;
  plannedRewardAmount?: number;
  plannedRR?: number; // Reward / Risk ratio (e.g., 2.5 means 1:2.5)
  plannedRRText?: string; // Formatted ratio string (e.g., "1:2.5")
  actualRR?: number; // Realized Risk-to-Reward ratio

  // Fees & Costs
  brokerage?: number;
  commission?: number;
  taxes?: number;
  exchangeFees?: number;
  otherFees?: number;
  totalFees: number;

  // Realised / Unrealised Calculations
  grossPnL: number;
  netPnL: number;
  pnlPercentage: number;
  pnlPerUnit?: number;
  actualRMultiple?: number; // Net PnL / Planned Risk
  isManualPnlOverride?: boolean;
  manualNetPnL?: number;
  holdingPeriodMinutes?: number;

  // Playbook & Discipline
  strategyId?: string;
  strategyName?: string;
  checklistResponses?: Record<string, boolean>; // ruleId -> boolean
  rulesFollowedCount?: number;
  rulesTotalCount?: number;
  disciplineScore?: number; // percentage 0-100

  // Psychology (Section 1.D & 1.E)
  confidenceScore?: number; // 1-10
  emotions?: string[]; // e.g. ['Calm', 'FOMO', 'Confident']
  fearScore?: number; // 1-10
  greedScore?: number; // 1-10

  // Review & Lessons (Section 1.F)
  lessonLearned?: string;
  whatCanIImprove?: string;

  // Ratings & Journal
  ratings?: TradeRatings;
  notes?: TradeNotes;
  psychology?: TradePsychology;
  screenshots: ScreenshotAttachment[];
  chartScreenshot?: string;
  tags: string[];

  // Multi-currency snapshots
  tradeCurrency: string;
  reportingCurrency: string;
  fxRateUsed: number; // tradeCurrency -> reportingCurrency multiplier
  netPnLReporting: number;

  // Behavioral Intelligence & Risk Management
  disciplineClassification?: DisciplineClassification;
  behavioralTags?: string[];
  ruleViolations?: string[];
  isRevengeTradeSuspected?: boolean;
  isRevengeTradeConfirmed?: boolean;
  riskPctUsed?: number;

  createdAt: string;
  updatedAt: string;
}

export type DisciplineClassification =
  | 'good_win' // profitable + rules followed
  | 'bad_win' // profitable + rules broken
  | 'good_loss' // losing + rules followed
  | 'bad_loss' // losing + rules broken
  | 'breakeven_followed'
  | 'breakeven_broken';

export type BehavioralTag =
  | 'FOMO'
  | 'Revenge Trade'
  | 'Overtrading'
  | 'Impulse Trade'
  | 'Oversized Position'
  | 'No Stop Loss'
  | 'Moved Stop Loss'
  | 'Early Entry'
  | 'Late Entry'
  | 'Averaging Down'
  | 'Exited Winner Early'
  | 'Held Loser Too Long'
  | 'Strategy Violation'
  | 'Risk Limit Violation'
  | 'Daily Loss Limit Violation'
  | 'Emotional Entry';

export interface TradingRulesSettings {
  maxTradesPerDay: number; // default: 3
  riskPerTradePct: number; // default: 1%
  maxDailyLossPct: number; // default: 2%
  minPlannedRR: number; // default: 2.0 (1:2)
  maxConsecutiveLosses: number; // default: 2
  stopTradingAfterDailyLoss: boolean; // default: true
  allowedTradingHoursStart?: string; // e.g. "09:15"
  allowedTradingHoursEnd?: string; // e.g. "15:30"
  stopAfterLossesRuleEnabled: boolean; // default: true
  oneTradeMode: boolean; // default: false
  strictDisciplineMode: boolean; // default: false
}

export interface TradingAccount {
  id: string;
  userId: string;
  name: string;
  brokerName: string;
  nickname?: string;
  accountType: AccountType;
  startingBalance: number;
  currentBalance: number;
  baseCurrency: string;
  openingDate: string;
  color: string;
  icon?: string;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountTransaction {
  id: string;
  accountId: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'adjustment';
  amount: number;
  currency: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface StrategyRule {
  id: string;
  label: string;
  isRequired?: boolean;
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string;
  entryCriteria: string;
  stopLossRules: string;
  targetRules: string;
  minRR: number;
  preferredMarketConditions?: string;
  checklist: StrategyRule[];
  exampleScreenshot?: string;
  color?: string;
  createdAt: string;
}

export interface PersonalRule {
  id: string;
  userId: string;
  title: string;
  category: 'max_trades_day' | 'max_daily_loss' | 'max_risk_trade' | 'min_rr' | 'max_position_size' | 'trading_hours' | 'custom';
  value: number;
  unit: 'trades' | 'currency' | 'percent' | 'ratio' | 'text';
  enabled: boolean;
  warningMessage: string;
  description?: string;
}

export interface TradingGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  metricType: 'stop_loss_discipline' | 'avg_rr' | 'fomo_reduction' | 'journal_completion' | 'max_trades' | 'win_rate';
  targetValue: number;
  period: 'week' | 'month' | 'quarter' | 'year';
  deadline?: string;
  createdAt: string;
}

export interface DailyJournalEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  // Pre-market
  preMarketOutlook?: string;
  keyLevels?: string;
  watchlist?: string;
  tradingPlan?: string;
  personalFocus?: string;
  // End-of-day
  eodWhatWorked?: string;
  eodWhatFailed?: string;
  eodRulesFollowed?: boolean;
  eodKeyLesson?: string;
  eodTomorrowImprovement?: string;
  // Specific Daily Review reflection fields (Section 6)
  whatWentWellToday?: string;
  whatWentWrongToday?: string;
  bestTradeOfTheDay?: string;
  worstTradeOfTheDay?: string;
  mainMistake?: string;
  mainLesson?: string;
  planForNextSession?: string;
  // Trading Intention (Section 14)
  tradingIntention?: string;
  intentionFollowedStatus?: 'followed' | 'partially_followed' | 'not_followed';
  intentionReviewNotes?: string;
  // No-Trade Day (Section 15)
  isNoTradeDay?: boolean;
  noTradeReason?: string;
  dailyDisciplineScore?: number; // 0-100
  dayRating?: number; // 1-5
  updatedAt: string;
}

export interface AIChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  structuredReview?: {
    summary?: string;
    whatHappened?: string;
    whatYouDidWell?: string;
    whatHurtPerformance?: string;
    patternDetected?: string;
    improvement?: string;
    focusForNextSession?: string;
  };
  supportingData?: {
    tradesAnalysed?: number;
    metricLabel?: string;
    metricValue?: string;
    evidenceText?: string;
  };
  screenshotUrl?: string;
}

export interface AIChatConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type CoachingStyle =
  | 'balanced'
  | 'concise'
  | 'detailed'
  | 'strict'
  | 'analytical'
  | 'encouraging';

export interface UserPreferences {
  name: string;
  email: string;
  avatarUrl?: string;
  googleId?: string;
  authProvider?: 'google' | 'email';
  defaultCurrency: string;
  timeZone: string;
  timeFormat: '12h' | '24h';
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  numberFormat: 'en-US' | 'en-IN' | 'de-DE';
  theme: 'dark' | 'light' | 'system';
  privacyMode: boolean;
  defaultAccountId?: string;
  tradingProfile: {
    assetClasses: AssetClass[];
    primaryStyles: ('Day trading' | 'Scalping' | 'Swing trading' | 'Position trading' | 'Multiple styles')[];
  };
  onboardingCompleted: boolean;
  // AI Settings
  aiProvider: 'builtin' | 'byok';
  hasByokKey?: boolean;
  coachingStyle: CoachingStyle;
  aiMemoryEnabled: boolean;
  screenshotAnalysisEnabled: boolean;
  chatHistoryEnabled: boolean;
  // Voice Settings (Sections 42-47)
  voiceModeEnabled?: boolean;
  autoTranscript?: boolean;
  selectedVoice?: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  voiceLanguage?: 'en' | 'hi' | 'bn' | 'ta';
  aiDefaultMode?: 'voice' | 'chat';
  spokenDetail?: 'short' | 'normal' | 'detailed';
  // Dashboard Widget Customization
  dashboardWidgets: {
    balance: boolean;
    profitabilityScore: boolean;
    disciplineScore: boolean;
    currentStreak: boolean;
    secondaryMetrics: boolean;
    performanceChart: boolean;
    aiInsight: boolean;
    needsAttention: boolean;
    calendar: boolean;
    todayStats: boolean;
    strategyEdge: boolean;
    recentTrades: boolean;
  };
  // Trading Rules & Risk Limits (Section 1)
  tradingRules?: TradingRulesSettings;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  googleId?: string;
  authProvider?: 'google' | 'email';
  preferences: UserPreferences;
  createdAt: string;
}
