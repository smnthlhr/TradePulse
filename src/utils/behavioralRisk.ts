import {
  Trade,
  TradingAccount,
  TradingRulesSettings,
  DisciplineClassification,
  BehavioralTag,
} from '../types/trade';

export const DEFAULT_TRADING_RULES: TradingRulesSettings = {
  maxTradesPerDay: 3,
  riskPerTradePct: 1,
  maxDailyLossPct: 2,
  minPlannedRR: 2,
  maxConsecutiveLosses: 2,
  stopTradingAfterDailyLoss: true,
  allowedTradingHoursStart: '09:15',
  allowedTradingHoursEnd: '15:30',
  stopAfterLossesRuleEnabled: true,
  oneTradeMode: false,
  strictDisciplineMode: false,
};

export const ALL_BEHAVIORAL_TAGS: BehavioralTag[] = [
  'FOMO',
  'Revenge Trade',
  'Overtrading',
  'Impulse Trade',
  'Oversized Position',
  'No Stop Loss',
  'Moved Stop Loss',
  'Early Entry',
  'Late Entry',
  'Averaging Down',
  'Exited Winner Early',
  'Held Loser Too Long',
  'Strategy Violation',
  'Risk Limit Violation',
  'Daily Loss Limit Violation',
  'Emotional Entry',
];

export interface PreTradeRiskCheckResult {
  accountCapital: number;
  riskAmount: number;
  riskPct: number;
  plannedRR: number;
  tradesAlreadyTakenToday: number;
  currentDailyPnL: number;
  maxDailyLossAmount: number;
  remainingDailyLossAllowance: number;
  isDailyLossLimitReached: boolean;
  isMaxTradesReached: boolean;
  isConsecutiveLossLimitReached: boolean;
  isRiskPctExceeded: boolean;
  isMinRRExceeded: boolean;
  isOutsideTradingHours: boolean;
  isWithinRules: boolean;
  isStrictBlocked: boolean;
  strictBlockReason?: string;
  warnings: string[];
  suggestedTags: BehavioralTag[];
  possibleRevengePattern: {
    isDetected: boolean;
    reason?: string;
  };
}

/**
 * Evaluates a planned or new trade against the user's active risk settings and history for today.
 */
export function checkPreTradeRisk(params: {
  trade: Partial<Trade>;
  rules: TradingRulesSettings;
  account?: TradingAccount;
  todayTrades: Trade[];
  currentConsecutiveLosses?: number;
}): PreTradeRiskCheckResult {
  const { trade, rules = DEFAULT_TRADING_RULES, account, todayTrades = [] } = params;

  // Account Capital
  const accountCapital = Math.max(
    1,
    Number(account?.currentBalance ?? account?.startingBalance ?? 100000)
  );

  // Capital & Sizing
  const entryPrice = Math.max(0, Number(trade.entryPrice) || 0);
  const stopLoss = Math.max(0, Number(trade.stopLossPrice) || 0);
  const qty = Math.max(0, Number(trade.quantity) || 1);
  const amountTraded = Math.max(0, Number(trade.amountTraded ?? trade.amountInvested) || entryPrice * qty);

  // Risk Amount Calculation
  let riskAmount = 0;
  if (trade.plannedRiskAmount && trade.plannedRiskAmount > 0) {
    riskAmount = trade.plannedRiskAmount;
  } else if (stopLoss > 0 && entryPrice > 0) {
    riskAmount = Math.abs(entryPrice - stopLoss) * qty;
  } else if (amountTraded > 0) {
    // If no stop loss, potential risk is total capital invested
    riskAmount = amountTraded;
  }

  const riskPct = accountCapital > 0 ? (riskAmount / accountCapital) * 100 : 0;

  // Planned RR
  const plannedRR = Number(trade.plannedRR || 0);

  // Today's Stats
  const tradesAlreadyTakenToday = todayTrades.length;
  const currentDailyPnL = todayTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);

  // Daily Loss Calculations
  const maxDailyLossAmount = (rules.maxDailyLossPct / 100) * accountCapital;
  // If currentDailyPnL is negative, current loss magnitude is Math.abs(currentDailyPnL)
  const currentDailyLoss = currentDailyPnL < 0 ? Math.abs(currentDailyPnL) : 0;
  const remainingDailyLossAllowance = Math.max(0, maxDailyLossAmount - currentDailyLoss);
  const isDailyLossLimitReached = currentDailyLoss >= maxDailyLossAmount;

  // Consecutive Losses Count
  const consecutiveLosses =
    params.currentConsecutiveLosses !== undefined
      ? params.currentConsecutiveLosses
      : calculateConsecutiveLosses(todayTrades);

  const isConsecutiveLossLimitReached =
    rules.stopAfterLossesRuleEnabled && consecutiveLosses >= rules.maxConsecutiveLosses;

  // Max Trades Limit
  const effectiveMaxTrades = rules.oneTradeMode ? 1 : rules.maxTradesPerDay;
  const isMaxTradesReached = tradesAlreadyTakenToday >= effectiveMaxTrades;

  // Risk % Exceeded
  const isRiskPctExceeded = riskPct > rules.riskPerTradePct + 0.05; // 0.05% margin

  // Min RR Exceeded
  const isMinRRExceeded = plannedRR > 0 && plannedRR < rules.minPlannedRR - 0.05;

  // Trading Hours Check (if provided)
  let isOutsideTradingHours = false;
  if (rules.allowedTradingHoursStart && rules.allowedTradingHoursEnd) {
    const tradeTime = trade.entryTime || new Date().toTimeString().slice(0, 5);
    if (tradeTime < rules.allowedTradingHoursStart || tradeTime > rules.allowedTradingHoursEnd) {
      isOutsideTradingHours = true;
    }
  }

  // Revenge Trade Detection (Section 6)
  const revengeDetection = detectPossibleRevengeTrade({
    newTrade: trade,
    riskPct,
    todayTrades,
    isDailyLossLimitReached,
  });

  // Construct itemized warnings
  const warnings: string[] = [];
  const suggestedTags: BehavioralTag[] = [];

  if (isMaxTradesReached) {
    warnings.push(
      `This is your ${tradesAlreadyTakenToday + 1}th trade today. Your daily limit is ${effectiveMaxTrades}.`
    );
    suggestedTags.push('Overtrading');
  }

  if (isRiskPctExceeded) {
    warnings.push(
      `This trade risks ${riskPct.toFixed(1)}%, but your maximum allowed risk is ${rules.riskPerTradePct}%.`
    );
    suggestedTags.push('Risk Limit Violation');
    suggestedTags.push('Oversized Position');
  }

  if (isMinRRExceeded) {
    warnings.push(
      `Planned RR is 1:${plannedRR.toFixed(1)}, below your minimum requirement of 1:${rules.minPlannedRR}.`
    );
    suggestedTags.push('Strategy Violation');
  }

  if (isDailyLossLimitReached) {
    warnings.push(
      `Your ${rules.maxDailyLossPct}% daily loss limit has already been reached (-${currentDailyLoss.toFixed(2)}).`
    );
    suggestedTags.push('Daily Loss Limit Violation');
  }

  if (isConsecutiveLossLimitReached) {
    warnings.push(
      `You have reached your consecutive-loss limit (${consecutiveLosses} losses in a row).`
    );
  }

  if (isOutsideTradingHours) {
    warnings.push(
      `Trade time is outside permitted trading hours (${rules.allowedTradingHoursStart} - ${rules.allowedTradingHoursEnd}).`
    );
  }

  if (!stopLoss && entryPrice > 0) {
    suggestedTags.push('No Stop Loss');
  }

  if (revengeDetection.isDetected) {
    warnings.push(
      `Possible revenge-trading pattern detected: ${revengeDetection.reason}`
    );
    suggestedTags.push('Revenge Trade');
  }

  const isWithinRules = warnings.length === 0;

  // Strict Mode Blocking (Section 2 & 8)
  let isStrictBlocked = false;
  let strictBlockReason: string | undefined;

  if (rules.strictDisciplineMode) {
    if (rules.stopTradingAfterDailyLoss && isDailyLossLimitReached) {
      isStrictBlocked = true;
      strictBlockReason = `Daily Loss Limit of ${rules.maxDailyLossPct}% reached. Strict discipline mode prevents taking new trades.`;
    } else if (isMaxTradesReached) {
      isStrictBlocked = true;
      strictBlockReason = `Daily Trade Limit (${effectiveMaxTrades} trades) reached. Strict discipline mode prevents additional entries.`;
    } else if (isConsecutiveLossLimitReached) {
      isStrictBlocked = true;
      strictBlockReason = `Consecutive-loss limit reached (${consecutiveLosses} losses). Strict discipline mode requires taking a break.`;
    }
  }

  return {
    accountCapital,
    riskAmount,
    riskPct,
    plannedRR,
    tradesAlreadyTakenToday,
    currentDailyPnL,
    maxDailyLossAmount,
    remainingDailyLossAllowance,
    isDailyLossLimitReached,
    isMaxTradesReached,
    isConsecutiveLossLimitReached,
    isRiskPctExceeded,
    isMinRRExceeded,
    isOutsideTradingHours,
    isWithinRules,
    isStrictBlocked,
    strictBlockReason,
    warnings,
    suggestedTags: Array.from(new Set(suggestedTags)),
    possibleRevengePattern: revengeDetection,
  };
}

/**
 * Detects possible revenge-trading pattern using structured signals (Section 6).
 */
export function detectPossibleRevengeTrade(params: {
  newTrade: Partial<Trade>;
  riskPct: number;
  todayTrades: Trade[];
  isDailyLossLimitReached: boolean;
}): { isDetected: boolean; reason?: string } {
  const { newTrade, riskPct, todayTrades, isDailyLossLimitReached } = params;
  if (!todayTrades || todayTrades.length === 0) {
    return { isDetected: false };
  }

  // Get last trade taken today
  const lastTrade = todayTrades[todayTrades.length - 1];
  const lastWasLoss = (lastTrade.netPnL || 0) < -0.0001;

  if (!lastWasLoss) {
    return { isDetected: false };
  }

  // Check 1: Trading after daily loss limit
  if (isDailyLossLimitReached) {
    return {
      isDetected: true,
      reason: 'Trade taken after reaching the daily loss limit.',
    };
  }

  // Check 2: Escalated risk after a loss
  const lastRiskPct = lastTrade.riskPctUsed || (lastTrade.plannedRiskPctOfAccount || 1);
  if (riskPct > lastRiskPct * 1.4 && riskPct >= 1.5) {
    return {
      isDetected: true,
      reason: `Risk increased from ${lastRiskPct.toFixed(1)}% to ${riskPct.toFixed(1)}% immediately after a losing trade.`,
    };
  }

  // Check 3: Position size increased after a loss
  const lastAmount = Number(lastTrade.amountTraded ?? lastTrade.amountInvested) || 0;
  const currentAmount = Number(newTrade.amountTraded ?? newTrade.amountInvested) || 0;
  if (lastAmount > 0 && currentAmount > lastAmount * 1.5) {
    return {
      isDetected: true,
      reason: 'Position size increased by >50% immediately following a loss.',
    };
  }

  // Check 4: Quick entry after a loss (under 15-20 minutes)
  if (newTrade.entryTime && lastTrade.entryTime) {
    const toMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const diff = toMinutes(newTrade.entryTime) - toMinutes(lastTrade.entryTime);
    if (diff > 0 && diff <= 15) {
      return {
        isDetected: true,
        reason: `Trade entered within ${diff} minutes of closing a losing position.`,
      };
    }
  }

  return { isDetected: false };
}

/**
 * Classifies a trade into Good Win / Bad Win / Good Loss / Bad Loss (Section 3).
 */
export function classifyTradeDiscipline(
  trade: Trade,
  rules: TradingRulesSettings = DEFAULT_TRADING_RULES
): DisciplineClassification {
  const pnl = trade.netPnL !== undefined ? trade.netPnL : 0;
  const isWin = pnl > 0.0001;
  const isLoss = pnl < -0.0001;

  // Determine if important rules were broken
  const violations = trade.ruleViolations || [];
  const tags = trade.behavioralTags || [];

  const hasImportantBreach =
    violations.length > 0 ||
    tags.includes('Risk Limit Violation') ||
    tags.includes('Daily Loss Limit Violation') ||
    tags.includes('No Stop Loss') ||
    tags.includes('Revenge Trade') ||
    tags.includes('Overtrading') ||
    tags.includes('Oversized Position') ||
    (trade.disciplineScore !== undefined && trade.disciplineScore < 70);

  const rulesFollowed = !hasImportantBreach;

  if (isWin) {
    return rulesFollowed ? 'good_win' : 'bad_win';
  } else if (isLoss) {
    return rulesFollowed ? 'good_loss' : 'bad_loss';
  } else {
    return rulesFollowed ? 'breakeven_followed' : 'breakeven_broken';
  }
}

/**
 * Computes consecutive losses from an array of trades sorted chronologically.
 */
export function calculateConsecutiveLosses(trades: Trade[]): number {
  if (!trades || trades.length === 0) return 0;
  let count = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const pnl = trades[i].netPnL || 0;
    if (pnl < -0.0001) {
      count++;
    } else if (pnl > 0.0001) {
      break;
    }
  }
  return count;
}

/**
 * Calculates trade discipline score (0-100%) based on rule adherence (Section 9).
 */
export function calculateTradeDisciplineScore(
  trade: Partial<Trade>,
  rules: TradingRulesSettings = DEFAULT_TRADING_RULES
): number {
  let score = 100;

  // Stop loss used
  if (!trade.stopLossPrice || trade.stopLossPrice <= 0) {
    score -= 20;
  }

  // Planned RR requirement
  if (trade.plannedRR && trade.plannedRR < rules.minPlannedRR) {
    score -= 15;
  }

  // Rule violations recorded
  const violationsCount = (trade.ruleViolations || []).length;
  score -= violationsCount * 10;

  // Behavioral tags penalty
  const tags = trade.behavioralTags || [];
  if (tags.includes('Revenge Trade')) score -= 25;
  if (tags.includes('FOMO')) score -= 15;
  if (tags.includes('Oversized Position') || tags.includes('Risk Limit Violation')) score -= 20;
  if (tags.includes('Overtrading')) score -= 15;
  if (tags.includes('Daily Loss Limit Violation')) score -= 25;

  // Checklist score bonus/penalty
  if (trade.rulesFollowedCount !== undefined && trade.rulesTotalCount !== undefined && trade.rulesTotalCount > 0) {
    const checklistRatio = trade.rulesFollowedCount / trade.rulesTotalCount;
    score = Math.round(score * 0.5 + checklistRatio * 100 * 0.5);
  }

  return Math.max(0, Math.min(100, score));
}

export interface CostOfMistakeItem {
  id: string;
  name: string;
  totalLossAmount: number;
  rMultipleLost: number;
  tradeCount: number;
  trades: Trade[];
  description: string;
}

/**
 * Calculates Cost of Mistakes breakdown (Section 11).
 */
export function calculateCostOfMistakes(
  trades: Trade[],
  reportingCurrency = 'USD'
): {
  totalMistakeCost: number;
  totalMistakeR: number;
  items: CostOfMistakeItem[];
} {
  const mistakesMap: Record<
    string,
    { name: string; trades: Trade[]; description: string }
  > = {
    overtrading: {
      name: 'Overtrading',
      trades: [],
      description: 'Trades taken beyond daily limit or without fresh setup.',
    },
    fomo: {
      name: 'FOMO Trades',
      trades: [],
      description: 'Chasing extended moves out of fear of missing out.',
    },
    risk_violations: {
      name: 'Risk Violations',
      trades: [],
      description: 'Positions exceeding configured 1% risk per trade.',
    },
    revenge: {
      name: 'Revenge Trades',
      trades: [],
      description: 'Impulsive trades triggered right after a painful loss.',
    },
    oversized: {
      name: 'Oversized Positions',
      trades: [],
      description: 'Over-leveraged positions causing outsized drawdowns.',
    },
    no_stop_loss: {
      name: 'No Stop Loss / Moved Stop',
      trades: [],
      description: 'Entering without predefined risk or moving stops emotionally.',
    },
  };

  trades.forEach((t) => {
    const pnl = t.netPnL || 0;
    // We count cost of trades that lost money or had negative outcomes
    const isLoss = pnl < 0;
    const tags = t.behavioralTags || [];
    const violations = t.ruleViolations || [];

    if (tags.includes('Overtrading') || violations.some((v) => v.toLowerCase().includes('daily limit'))) {
      if (isLoss) mistakesMap.overtrading.trades.push(t);
    }
    if (tags.includes('FOMO') || tags.includes('Impulse Trade')) {
      if (isLoss) mistakesMap.fomo.trades.push(t);
    }
    if (
      tags.includes('Risk Limit Violation') ||
      tags.includes('Daily Loss Limit Violation') ||
      violations.some((v) => v.toLowerCase().includes('risk'))
    ) {
      if (isLoss) mistakesMap.risk_violations.trades.push(t);
    }
    if (tags.includes('Revenge Trade') || t.isRevengeTradeConfirmed) {
      if (isLoss) mistakesMap.revenge.trades.push(t);
    }
    if (tags.includes('Oversized Position')) {
      if (isLoss) mistakesMap.oversized.trades.push(t);
    }
    if (tags.includes('No Stop Loss') || tags.includes('Moved Stop Loss') || (!t.stopLossPrice && t.entryPrice)) {
      if (isLoss) mistakesMap.no_stop_loss.trades.push(t);
    }
  });

  const items: CostOfMistakeItem[] = [];
  let totalMistakeCost = 0;
  let totalMistakeR = 0;

  Object.entries(mistakesMap).forEach(([id, m]) => {
    if (m.trades.length > 0) {
      const totalLossAmount = m.trades.reduce((sum, t) => sum + Math.abs(t.netPnL || 0), 0);
      const rMultipleLost = m.trades.reduce((sum, t) => {
        const plannedRisk = t.plannedRiskAmount || Math.abs(t.stopLossPrice ? (t.entryPrice - t.stopLossPrice) * t.quantity : 1);
        const r = plannedRisk > 0 ? Math.abs(t.netPnL || 0) / plannedRisk : 1;
        return sum + r;
      }, 0);

      totalMistakeCost += totalLossAmount;
      totalMistakeR += rMultipleLost;

      items.push({
        id,
        name: m.name,
        totalLossAmount,
        rMultipleLost: Number(rMultipleLost.toFixed(1)),
        tradeCount: m.trades.length,
        trades: m.trades,
        description: m.description,
      });
    }
  });

  items.sort((a, b) => b.totalLossAmount - a.totalLossAmount);

  return {
    totalMistakeCost,
    totalMistakeR: Number(totalMistakeR.toFixed(1)),
    items,
  };
}

export interface BehavioralAnalyticsResult {
  // Classification Matrix
  matrix: {
    goodWins: Trade[];
    badWins: Trade[];
    goodLosses: Trade[];
    badLosses: Trade[];
    goodWinsCount: number;
    badWinsCount: number;
    goodLossesCount: number;
    badLossesCount: number;
  };
  // Trade Order Performance (Trade #1 vs #2 vs #3+)
  tradeOrderStats: {
    trade1: { count: number; netPnL: number; winRate: number };
    trade2: { count: number; netPnL: number; winRate: number };
    trade3Plus: { count: number; netPnL: number; winRate: number };
  };
  // Sequential Performance (Performance after wins vs after losses)
  performanceAfterWins: { count: number; netPnL: number; winRate: number };
  performanceAfterLosses: { count: number; netPnL: number; winRate: number };
  // Risk Escalation
  avgRiskAfterWins: number;
  avgRiskAfterLosses: number;
  riskEscalationDetected: boolean;
  maxRiskUsed: number;
  riskViolationsCount: number;
  // Rule Following vs Rule Breaking P&L
  ruleFollowingPnL: number;
  ruleBreakingPnL: number;
  fomoTradesPnL: number;
  revengeTradesPnL: number;
  oversizedTradesPnL: number;
  averageDisciplineScore: number;
}

/**
 * Calculates comprehensive behavioral analytics from all recorded trades (Sections 10 & 7).
 */
export function calculateBehavioralAnalytics(
  trades: Trade[],
  rules: TradingRulesSettings = DEFAULT_TRADING_RULES
): BehavioralAnalyticsResult {
  const goodWins: Trade[] = [];
  const badWins: Trade[] = [];
  const goodLosses: Trade[] = [];
  const badLosses: Trade[] = [];

  // Group trades by date to analyze trade order (#1 vs #2 vs #3)
  const tradesByDate: Record<string, Trade[]> = {};

  trades.forEach((t) => {
    const classification = t.disciplineClassification || classifyTradeDiscipline(t, rules);
    if (classification === 'good_win') goodWins.push(t);
    else if (classification === 'bad_win') badWins.push(t);
    else if (classification === 'good_loss') goodLosses.push(t);
    else if (classification === 'bad_loss') badLosses.push(t);

    const d = t.tradeDate || (t.entryDate ? t.entryDate.split('T')[0] : 'unknown');
    if (!tradesByDate[d]) tradesByDate[d] = [];
    tradesByDate[d].push(t);
  });

  // Analyze Trade Order (#1, #2, #3+)
  const tradeOrder = {
    trade1: { count: 0, wins: 0, netPnL: 0 },
    trade2: { count: 0, wins: 0, netPnL: 0 },
    trade3Plus: { count: 0, wins: 0, netPnL: 0 },
  };

  const afterWins = { count: 0, wins: 0, netPnL: 0, riskSum: 0 };
  const afterLosses = { count: 0, wins: 0, netPnL: 0, riskSum: 0 };

  let maxRiskUsed = 0;
  let riskViolationsCount = 0;
  let ruleFollowingPnL = 0;
  let ruleBreakingPnL = 0;
  let fomoTradesPnL = 0;
  let revengeTradesPnL = 0;
  let oversizedTradesPnL = 0;
  let totalDisciplineScore = 0;

  trades.forEach((t) => {
    const pnl = t.netPnL || 0;
    const classification = t.disciplineClassification || classifyTradeDiscipline(t, rules);
    const tags = t.behavioralTags || [];
    const isRuleFollowing = classification === 'good_win' || classification === 'good_loss';

    if (isRuleFollowing) {
      ruleFollowingPnL += pnl;
    } else {
      ruleBreakingPnL += pnl;
    }

    if (tags.includes('FOMO')) fomoTradesPnL += pnl;
    if (tags.includes('Revenge Trade') || t.isRevengeTradeConfirmed) revengeTradesPnL += pnl;
    if (tags.includes('Oversized Position')) oversizedTradesPnL += pnl;
    if (tags.includes('Risk Limit Violation') || (t.riskPctUsed && t.riskPctUsed > rules.riskPerTradePct)) {
      riskViolationsCount++;
    }

    const risk = t.riskPctUsed || (t.plannedRiskPctOfAccount || 1);
    if (risk > maxRiskUsed) maxRiskUsed = risk;

    const discScore = t.disciplineScore !== undefined ? t.disciplineScore : calculateTradeDisciplineScore(t, rules);
    totalDisciplineScore += discScore;
  });

  // Evaluate order per day
  Object.values(tradesByDate).forEach((dayList) => {
    // Sort by entry time or entry date
    const sortedDay = [...dayList].sort((a, b) => {
      const timeA = a.entryTime || a.entryDate || '';
      const timeB = b.entryTime || b.entryDate || '';
      return timeA.localeCompare(timeB);
    });

    sortedDay.forEach((t, idx) => {
      const pnl = t.netPnL || 0;
      const isWin = pnl > 0.0001;
      const risk = t.riskPctUsed || (t.plannedRiskPctOfAccount || 1);

      if (idx === 0) {
        tradeOrder.trade1.count++;
        tradeOrder.trade1.netPnL += pnl;
        if (isWin) tradeOrder.trade1.wins++;
      } else if (idx === 1) {
        tradeOrder.trade2.count++;
        tradeOrder.trade2.netPnL += pnl;
        if (isWin) tradeOrder.trade2.wins++;
      } else {
        tradeOrder.trade3Plus.count++;
        tradeOrder.trade3Plus.netPnL += pnl;
        if (isWin) tradeOrder.trade3Plus.wins++;
      }

      // Sequential behavior (after previous trade)
      if (idx > 0) {
        const prevTrade = sortedDay[idx - 1];
        const prevPnl = prevTrade.netPnL || 0;
        if (prevPnl > 0.0001) {
          afterWins.count++;
          afterWins.netPnL += pnl;
          afterWins.riskSum += risk;
          if (isWin) afterWins.wins++;
        } else if (prevPnl < -0.0001) {
          afterLosses.count++;
          afterLosses.netPnL += pnl;
          afterLosses.riskSum += risk;
          if (isWin) afterLosses.wins++;
        }
      }
    });
  });

  const avgRiskAfterWins = afterWins.count > 0 ? afterWins.riskSum / afterWins.count : 1;
  const avgRiskAfterLosses = afterLosses.count > 0 ? afterLosses.riskSum / afterLosses.count : 1;
  const riskEscalationDetected = avgRiskAfterLosses > avgRiskAfterWins * 1.25 && afterLosses.count >= 2;

  const averageDisciplineScore =
    trades.length > 0 ? Math.round(totalDisciplineScore / trades.length) : 100;

  return {
    matrix: {
      goodWins,
      badWins,
      goodLosses,
      badLosses,
      goodWinsCount: goodWins.length,
      badWinsCount: badWins.length,
      goodLossesCount: goodLosses.length,
      badLossesCount: badLosses.length,
    },
    tradeOrderStats: {
      trade1: {
        count: tradeOrder.trade1.count,
        netPnL: Number(tradeOrder.trade1.netPnL.toFixed(2)),
        winRate: tradeOrder.trade1.count > 0 ? Math.round((tradeOrder.trade1.wins / tradeOrder.trade1.count) * 100) : 0,
      },
      trade2: {
        count: tradeOrder.trade2.count,
        netPnL: Number(tradeOrder.trade2.netPnL.toFixed(2)),
        winRate: tradeOrder.trade2.count > 0 ? Math.round((tradeOrder.trade2.wins / tradeOrder.trade2.count) * 100) : 0,
      },
      trade3Plus: {
        count: tradeOrder.trade3Plus.count,
        netPnL: Number(tradeOrder.trade3Plus.netPnL.toFixed(2)),
        winRate: tradeOrder.trade3Plus.count > 0 ? Math.round((tradeOrder.trade3Plus.wins / tradeOrder.trade3Plus.count) * 100) : 0,
      },
    },
    performanceAfterWins: {
      count: afterWins.count,
      netPnL: Number(afterWins.netPnL.toFixed(2)),
      winRate: afterWins.count > 0 ? Math.round((afterWins.wins / afterWins.count) * 100) : 0,
    },
    performanceAfterLosses: {
      count: afterLosses.count,
      netPnL: Number(afterLosses.netPnL.toFixed(2)),
      winRate: afterLosses.count > 0 ? Math.round((afterLosses.wins / afterLosses.count) * 100) : 0,
    },
    avgRiskAfterWins: Number(avgRiskAfterWins.toFixed(1)),
    avgRiskAfterLosses: Number(avgRiskAfterLosses.toFixed(1)),
    riskEscalationDetected,
    maxRiskUsed: Number(maxRiskUsed.toFixed(1)),
    riskViolationsCount,
    ruleFollowingPnL: Number(ruleFollowingPnL.toFixed(2)),
    ruleBreakingPnL: Number(ruleBreakingPnL.toFixed(2)),
    fomoTradesPnL: Number(fomoTradesPnL.toFixed(2)),
    revengeTradesPnL: Number(revengeTradesPnL.toFixed(2)),
    oversizedTradesPnL: Number(oversizedTradesPnL.toFixed(2)),
    averageDisciplineScore,
  };
}
