import { Trade, TradeDirection, PartialExecution } from '../types/trade';

export interface CalculationResult {
  grossPnL: number;
  netPnL: number;
  pnlPercentage: number;
  pnlPerUnit: number;
  plannedRiskAmount: number;
  plannedRewardAmount: number;
  plannedRR: number;
  actualRMultiple: number;
  holdingPeriodMinutes: number;
  amountInvested: number;
}

export interface TradeCalculation {
  grossPnL: number;
  charges: number;
  netPnL: number;
  returnPercentage: number;
  resultType: 'profit' | 'loss' | 'breakeven';
  amountTraded: number;
}

/**
 * Single source of truth trade calculation (Sections 7 & 14)
 * Formula:
 * Gross P&L = Profit - Loss
 * Net P&L = Profit - Loss - Charges
 */
export function calculateTrade(trade: Partial<Trade>): TradeCalculation {
  const hasSimpleFields = trade.profit !== undefined || trade.loss !== undefined;

  if (hasSimpleFields) {
    const profit = Math.max(0, Number(trade.profit) || 0);
    const loss = Math.max(0, Number(trade.loss) || 0);
    const charges = Math.max(0, Number(trade.charges ?? trade.totalFees) || 0);
    const amountTraded = Math.max(0, Number(trade.amountTraded ?? trade.amountInvested) || 0);

    const grossPnL = Number((profit - loss).toFixed(2));
    const netPnL = Number((grossPnL - charges).toFixed(2));
    const returnPercentage = amountTraded > 0 ? Number(((netPnL / amountTraded) * 100).toFixed(2)) : 0;
    const resultType: 'profit' | 'loss' | 'breakeven' =
      netPnL > 0.0001 ? 'profit' : netPnL < -0.0001 ? 'loss' : 'breakeven';

    return {
      grossPnL,
      charges,
      netPnL,
      returnPercentage,
      resultType,
      amountTraded,
    };
  }

  // Legacy trade fallback
  const charges = Math.max(0, Number(trade.totalFees ?? trade.charges) || 0);
  const amountTraded = Math.max(0, Number(trade.amountInvested ?? trade.amountTraded) || 0);
  let grossPnL = trade.grossPnL !== undefined ? trade.grossPnL : 0;
  let netPnL = trade.netPnL !== undefined ? trade.netPnL : 0;

  if (trade.netPnL !== undefined && trade.grossPnL === undefined) {
    grossPnL = trade.netPnL + charges;
  } else if (trade.grossPnL !== undefined && trade.netPnL === undefined) {
    netPnL = grossPnL - charges;
  }

  grossPnL = Number(grossPnL.toFixed(2));
  netPnL = Number(netPnL.toFixed(2));
  const returnPercentage =
    amountTraded > 0
      ? Number(((netPnL / amountTraded) * 100).toFixed(2))
      : Number((trade.pnlPercentage || 0).toFixed(2));

  const resultType: 'profit' | 'loss' | 'breakeven' =
    netPnL > 0.0001 ? 'profit' : netPnL < -0.0001 ? 'loss' : 'breakeven';

  return {
    grossPnL,
    charges,
    netPnL,
    returnPercentage,
    resultType,
    amountTraded,
  };
}

/**
 * Calculates weighted average price and total quantity from an array of partial executions
 */
export function calculateWeightedAverage(executions: PartialExecution[]): { avgPrice: number; totalQty: number } {
  if (!executions || executions.length === 0) {
    return { avgPrice: 0, totalQty: 0 };
  }
  let totalCost = 0;
  let totalQty = 0;
  for (const exec of executions) {
    const qty = Number(exec.quantity) || 0;
    const price = Number(exec.price) || 0;
    totalCost += qty * price;
    totalQty += qty;
  }
  return {
    avgPrice: totalQty > 0 ? totalCost / totalQty : 0,
    totalQty,
  };
}

/**
 * Core P&L and Risk calculations
 */
export function calculateTradeMetrics(params: {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  contractMultiplier?: number;
  stopLossPrice?: number;
  targetPrice?: number;
  totalFees?: number;
  entryDate: string;
  exitDate?: string;
  isManualPnlOverride?: boolean;
  manualNetPnL?: number;
}): CalculationResult {
  const multiplier = Number(params.contractMultiplier) > 0 ? Number(params.contractMultiplier) : 1;
  const quantity = Math.max(0, Number(params.quantity) || 0);
  const entryPrice = Math.max(0, Number(params.entryPrice) || 0);
  const exitPrice = params.exitPrice !== undefined && params.exitPrice !== null ? Number(params.exitPrice) : undefined;
  const totalFees = Math.max(0, Number(params.totalFees) || 0);
  const stopLossPrice = params.stopLossPrice !== undefined && params.stopLossPrice !== null ? Number(params.stopLossPrice) : undefined;
  const targetPrice = params.targetPrice !== undefined && params.targetPrice !== null ? Number(params.targetPrice) : undefined;

  const totalEffectiveUnits = quantity * multiplier;
  const amountInvested = entryPrice * totalEffectiveUnits;

  // Planned Risk
  let plannedRiskAmount = 0;
  let plannedRiskPerUnit = 0;
  if (stopLossPrice !== undefined && stopLossPrice > 0 && entryPrice > 0) {
    plannedRiskPerUnit = Math.abs(entryPrice - stopLossPrice);
    plannedRiskAmount = plannedRiskPerUnit * totalEffectiveUnits;
  }

  // Planned Reward & R:R
  let plannedRewardAmount = 0;
  let plannedRR = 0;
  if (targetPrice !== undefined && targetPrice > 0 && entryPrice > 0) {
    const targetDiff = Math.abs(targetPrice - entryPrice);
    plannedRewardAmount = targetDiff * totalEffectiveUnits;
    if (plannedRiskAmount > 0) {
      plannedRR = Number((plannedRewardAmount / plannedRiskAmount).toFixed(2));
    }
  }

  // Holding period
  let holdingPeriodMinutes = 0;
  if (params.entryDate && params.exitDate) {
    const start = new Date(params.entryDate).getTime();
    const end = new Date(params.exitDate).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      holdingPeriodMinutes = Math.round((end - start) / (1000 * 60));
    }
  }

  // If trade is not closed or has no exit price
  if (exitPrice === undefined || exitPrice === null) {
    return {
      grossPnL: 0,
      netPnL: -totalFees,
      pnlPercentage: 0,
      pnlPerUnit: 0,
      plannedRiskAmount,
      plannedRewardAmount,
      plannedRR,
      actualRMultiple: 0,
      holdingPeriodMinutes,
      amountInvested,
    };
  }

  // Realised Gross P&L
  let grossPnL = 0;
  let pnlPerUnit = 0;
  if (params.direction === 'long') {
    grossPnL = (exitPrice - entryPrice) * totalEffectiveUnits;
    pnlPerUnit = exitPrice - entryPrice;
  } else {
    // short
    grossPnL = (entryPrice - exitPrice) * totalEffectiveUnits;
    pnlPerUnit = entryPrice - exitPrice;
  }

  let netPnL = grossPnL - totalFees;
  if (params.isManualPnlOverride && params.manualNetPnL !== undefined) {
    netPnL = Number(params.manualNetPnL);
  }

  // Return %
  let pnlPercentage = 0;
  if (amountInvested > 0) {
    pnlPercentage = Number(((netPnL / amountInvested) * 100).toFixed(2));
  }

  // Actual R Multiple
  let actualRMultiple = 0;
  if (plannedRiskAmount > 0) {
    actualRMultiple = Number((netPnL / plannedRiskAmount).toFixed(2));
  }

  return {
    grossPnL: Number(grossPnL.toFixed(2)),
    netPnL: Number(netPnL.toFixed(2)),
    pnlPercentage,
    pnlPerUnit: Number(pnlPerUnit.toFixed(4)),
    plannedRiskAmount: Number(plannedRiskAmount.toFixed(2)),
    plannedRewardAmount: Number(plannedRewardAmount.toFixed(2)),
    plannedRR,
    actualRMultiple,
    holdingPeriodMinutes,
    amountInvested: Number(amountInvested.toFixed(2)),
  };
}

/**
 * Validates stop loss and target logical conditions relative to trade direction
 */
export function validateTradeRiskLevels(
  direction: TradeDirection,
  entryPrice: number,
  stopLossPrice?: number,
  targetPrice?: number
): { isValid: boolean; warning?: string } {
  if (!entryPrice || entryPrice <= 0) return { isValid: true };

  if (direction === 'long') {
    if (stopLossPrice !== undefined && stopLossPrice > 0 && stopLossPrice >= entryPrice) {
      return {
        isValid: false,
        warning: 'For a Long trade, Stop Loss is normally below the Entry price.',
      };
    }
    if (targetPrice !== undefined && targetPrice > 0 && targetPrice <= entryPrice) {
      return {
        isValid: false,
        warning: 'For a Long trade, Target is normally above the Entry price.',
      };
    }
  } else {
    // short
    if (stopLossPrice !== undefined && stopLossPrice > 0 && stopLossPrice <= entryPrice) {
      return {
        isValid: false,
        warning: 'For a Short trade, Stop Loss is normally above the Entry price.',
      };
    }
    if (targetPrice !== undefined && targetPrice > 0 && targetPrice >= entryPrice) {
      return {
        isValid: false,
        warning: 'For a Short trade, Target is normally below the Entry price.',
      };
    }
  }
  return { isValid: true };
}

export interface PortfolioStatistics {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number; // percentage 0-100
  lossRate: number;
  breakevenRate: number;
  grossProfit: number;
  grossLoss: number;
  netPnL: number;
  totalFees: number;
  totalCharges: number;
  totalAmountTraded: number;
  netReturnPercentage: number;
  profitFactor: number;
  averageWinner: number;
  averageLoser: number;
  largestWinner: number;
  largestLoser: number;
  winLossRatio: number;
  expectancy: number;
  averageR: number;
  maxDrawdownAmount: number;
  maxDrawdownPercentage: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  bestStreak: { win: number; loss: number };
  averageHoldingPeriodMinutes: number;
  ruleAdherenceRate: number;
  bestDay: { date: string; pnl: number };
  worstDay: { date: string; pnl: number };
  profitableDaysPercentage: number;
  averageTradesPerDay: number;
  dailyPnL: Record<string, number>;
  monthlyPnL: Record<string, number>;
}

/**
 * Comprehensive portfolio analytics calculator (Sections 27-28)
 * Uses calculateTrade(t) as the single source of truth for all trades.
 */
export function calculatePortfolioStats(trades: Trade[]): PortfolioStatistics {
  const closedTrades = trades.filter((t) => t.status === 'closed' || (t.status !== 'open' && (t.exitPrice !== undefined || t.profit !== undefined || t.loss !== undefined)));
  const openTrades = trades.filter((t) => t.status === 'open');

  let grossProfit = 0;
  let grossLoss = 0;
  let netPnL = 0;
  let totalFees = 0;
  let totalAmountTraded = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let totalWinnerPnL = 0;
  let totalLoserPnL = 0;
  let largestWinner = 0;
  let largestLoser = 0;
  let totalR = 0;
  let countR = 0;
  let totalHoldingMinutes = 0;
  let rulesFollowedTotal = 0;
  let rulesCountTotal = 0;

  // Daily and monthly aggregation
  const dailyPnL: Record<string, number> = {};
  const monthlyPnL: Record<string, number> = {};
  const dailyTradeCounts: Record<string, number> = {};

  // Sort closed trades by date for streaks and drawdown
  const sortedTrades = [...closedTrades].sort(
    (a, b) => new Date(a.exitDate || a.entryDate || a.tradeDate || '').getTime() - new Date(b.exitDate || b.entryDate || b.tradeDate || '').getTime()
  );

  let currentStreakType: 'win' | 'loss' | 'none' = 'none';
  let currentStreakCount = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  for (const trade of sortedTrades) {
    const calc = calculateTrade(trade);
    const pnl = trade.netPnLReporting !== undefined ? trade.netPnLReporting : calc.netPnL;
    const fees = calc.charges;

    netPnL += pnl;
    totalFees += fees;
    totalAmountTraded += calc.amountTraded;

    // Day & Month bucket
    const dateStr = (trade.tradeDate || trade.entryDate || '').split('T')[0] || 'Unknown';
    dailyPnL[dateStr] = Number(((dailyPnL[dateStr] || 0) + pnl).toFixed(2));
    dailyTradeCounts[dateStr] = (dailyTradeCounts[dateStr] || 0) + 1;

    const monthStr = dateStr.slice(0, 7); // YYYY-MM
    if (monthStr.length === 7) {
      monthlyPnL[monthStr] = Number(((monthlyPnL[monthStr] || 0) + pnl).toFixed(2));
    }

    if (calc.grossPnL > 0) {
      grossProfit += calc.grossPnL;
    } else if (calc.grossPnL < 0) {
      grossLoss += Math.abs(calc.grossPnL);
    }

    if (pnl > 0.0001) {
      winningTrades++;
      totalWinnerPnL += pnl;
      if (pnl > largestWinner) largestWinner = pnl;

      // Streaks
      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
      currentStreakType = 'win';
      currentStreakCount = tempWinStreak;
    } else if (pnl < -0.0001) {
      losingTrades++;
      totalLoserPnL += Math.abs(pnl);
      if (Math.abs(pnl) > largestLoser) largestLoser = Math.abs(pnl);

      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
      currentStreakType = 'loss';
      currentStreakCount = tempLossStreak;
    } else {
      breakevenTrades++;
      tempWinStreak = 0;
      tempLossStreak = 0;
    }

    if (trade.actualRMultiple !== undefined && trade.plannedRiskAmount && trade.plannedRiskAmount > 0) {
      totalR += trade.actualRMultiple;
      countR++;
    }

    if (trade.holdingPeriodMinutes) {
      totalHoldingMinutes += trade.holdingPeriodMinutes;
    }

    if (trade.rulesTotalCount && trade.rulesTotalCount > 0) {
      rulesFollowedTotal += trade.rulesFollowedCount || 0;
      rulesCountTotal += trade.rulesTotalCount;
    }
  }

  const totalClosed = closedTrades.length;
  const winRate = totalClosed > 0 ? Number(((winningTrades / totalClosed) * 100).toFixed(1)) : 0;
  const lossRate = totalClosed > 0 ? Number(((losingTrades / totalClosed) * 100).toFixed(1)) : 0;
  const breakevenRate = totalClosed > 0 ? Number(((breakevenTrades / totalClosed) * 100).toFixed(1)) : 0;

  const averageWinner = winningTrades > 0 ? Number((totalWinnerPnL / winningTrades).toFixed(2)) : 0;
  const averageLoser = losingTrades > 0 ? Number((totalLoserPnL / losingTrades).toFixed(2)) : 0;

  // Profit Factor = Gross Profit / Gross Loss
  const profitFactor =
    grossLoss > 0
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
      ? 99.99
      : 0;

  const winLossRatio = averageLoser > 0 ? Number((averageWinner / averageLoser).toFixed(2)) : averageWinner > 0 ? 99.99 : 0;

  // Expectancy = (Win% * Avg Win) - (Loss% * Avg Loss)
  const pWin = totalClosed > 0 ? winningTrades / totalClosed : 0;
  const pLoss = totalClosed > 0 ? losingTrades / totalClosed : 0;
  const expectancy = Number((pWin * averageWinner - pLoss * averageLoser).toFixed(2));

  const averageR = countR > 0 ? Number((totalR / countR).toFixed(2)) : 0;

  // Drawdown calculation along cumulative equity
  let peakEquity = 0;
  let currentEquity = 0;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercentage = 0;

  for (const trade of sortedTrades) {
    const calc = calculateTrade(trade);
    const pnl = trade.netPnLReporting !== undefined ? trade.netPnLReporting : calc.netPnL;
    currentEquity += pnl;
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    } else {
      const ddAmount = peakEquity - currentEquity;
      if (ddAmount > maxDrawdownAmount) {
        maxDrawdownAmount = ddAmount;
      }
      if (peakEquity > 0) {
        const ddPct = (ddAmount / peakEquity) * 100;
        if (ddPct > maxDrawdownPercentage) {
          maxDrawdownPercentage = ddPct;
        }
      }
    }
  }

  const averageHoldingPeriodMinutes = totalClosed > 0 ? Math.round(totalHoldingMinutes / totalClosed) : 0;
  const ruleAdherenceRate =
    rulesCountTotal > 0
      ? Number(((rulesFollowedTotal / rulesCountTotal) * 100).toFixed(1))
      : trades.length > 0
      ? 100
      : 0;

  // Best day & Worst day calculation
  let bestDay = { date: '—', pnl: 0 };
  let worstDay = { date: '—', pnl: 0 };
  let profitableDaysCount = 0;
  const dayKeys = Object.keys(dailyPnL);

  for (const day of dayKeys) {
    const dayNet = dailyPnL[day];
    if (dayNet > bestDay.pnl || bestDay.date === '—') {
      bestDay = { date: day, pnl: dayNet };
    }
    if (dayNet < worstDay.pnl || worstDay.date === '—') {
      worstDay = { date: day, pnl: dayNet };
    }
    if (dayNet > 0.0001) {
      profitableDaysCount++;
    }
  }

  const profitableDaysPercentage =
    dayKeys.length > 0 ? Number(((profitableDaysCount / dayKeys.length) * 100).toFixed(1)) : 0;
  const averageTradesPerDay =
    dayKeys.length > 0 ? Number((totalClosed / dayKeys.length).toFixed(1)) : 0;

  const netReturnPercentage =
    totalAmountTraded > 0 ? Number(((netPnL / totalAmountTraded) * 100).toFixed(2)) : 0;

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: totalClosed,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    lossRate,
    breakevenRate,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    netPnL: Number(netPnL.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    totalCharges: Number(totalFees.toFixed(2)),
    totalAmountTraded: Number(totalAmountTraded.toFixed(2)),
    netReturnPercentage,
    profitFactor,
    averageWinner,
    averageLoser,
    largestWinner: Number(largestWinner.toFixed(2)),
    largestLoser: Number(largestLoser.toFixed(2)),
    winLossRatio,
    expectancy,
    averageR,
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    maxDrawdownPercentage: Number(maxDrawdownPercentage.toFixed(2)),
    currentStreak: { type: currentStreakType, count: currentStreakCount },
    bestStreak: { win: maxWinStreak, loss: maxLossStreak },
    averageHoldingPeriodMinutes,
    ruleAdherenceRate,
    bestDay,
    worstDay,
    profitableDaysPercentage,
    averageTradesPerDay,
    dailyPnL,
    monthlyPnL,
  };
}
