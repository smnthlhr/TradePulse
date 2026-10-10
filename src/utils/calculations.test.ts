import {
  calculateTradeMetrics,
  calculateWeightedAverage,
  calculatePortfolioStats,
  validateTradeRiskLevels,
} from './calculations';
import { Trade } from '../types/trade';

export interface TestReport {
  passed: number;
  failed: number;
  results: { name: string; success: boolean; details?: string }[];
}

export function runFinancialCalculationsTests(): TestReport {
  const results: { name: string; success: boolean; details?: string }[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    results.push({ name, success: condition, details });
  }

  // 1. Long Trade P&L: Entry ₹100, Exit ₹120, Qty 10, Fees ₹50 -> Gross 200, Net 150
  const longTrade = calculateTradeMetrics({
    direction: 'long',
    entryPrice: 100,
    exitPrice: 120,
    quantity: 10,
    totalFees: 50,
    entryDate: '2026-03-01T09:30',
    exitDate: '2026-03-01T15:30',
  });
  assert('Long Trade Gross & Net PnL', longTrade.grossPnL === 200 && longTrade.netPnL === 150);
  assert('Holding Period Calculation', longTrade.holdingPeriodMinutes === 360);

  // 2. Short Trade P&L: Entry ₹500, Exit ₹450, Qty 2, Multiplier 5 (Futures), Fees ₹20 -> Gross (500-450)*10 = 500, Net 480
  const shortTrade = calculateTradeMetrics({
    direction: 'short',
    entryPrice: 500,
    exitPrice: 450,
    quantity: 2,
    contractMultiplier: 5,
    totalFees: 20,
    entryDate: '2026-03-02T10:00',
    exitDate: '2026-03-02T11:00',
  });
  assert('Short Trade with Multiplier PnL', shortTrade.grossPnL === 500 && shortTrade.netPnL === 480);

  // 3. Planned Risk and Planned R:R: Entry 100, Stop 95, Target 115, Qty 10
  // Risk = 5 * 10 = 50. Reward = 15 * 10 = 150. RR = 150 / 50 = 3.0
  const riskTrade = calculateTradeMetrics({
    direction: 'long',
    entryPrice: 100,
    exitPrice: 110,
    quantity: 10,
    stopLossPrice: 95,
    targetPrice: 115,
    totalFees: 0,
    entryDate: '2026-03-02T10:00',
  });
  assert('Planned Risk Calculation', riskTrade.plannedRiskAmount === 50);
  assert('Planned RR Ratio (1:3)', riskTrade.plannedRR === 3);
  // Actual R multiple: Net PnL is 100, planned risk is 50 -> +2R
  assert('Actual R Multiple (+2R)', riskTrade.actualRMultiple === 2);

  // 4. Weighted Average Partial Executions
  // Entry 1: 50 @ 100 (= 5000)
  // Entry 2: 50 @ 105 (= 5250)
  // Total cost = 10250 / 100 = 102.5
  const weighted = calculateWeightedAverage([
    { id: '1', price: 100, quantity: 50, date: '2026-03-01' },
    { id: '2', price: 105, quantity: 50, date: '2026-03-01' },
  ]);
  assert('Weighted Average Price (102.5)', weighted.avgPrice === 102.5 && weighted.totalQty === 100);

  // 5. Open Trade Edge Case (no exit price yet)
  const openTrade = calculateTradeMetrics({
    direction: 'long',
    entryPrice: 200,
    quantity: 5,
    stopLossPrice: 190,
    targetPrice: 230,
    totalFees: 10,
    entryDate: '2026-03-03T10:00',
  });
  assert('Open Trade Zero Realised PnL (net -fees)', openTrade.grossPnL === 0 && openTrade.netPnL === -10);
  assert('Open Trade Preserves Planned Risk', openTrade.plannedRiskAmount === 50 && openTrade.plannedRR === 3);

  // 6. Validation of Risk Levels
  const validLong = validateTradeRiskLevels('long', 100, 95, 115);
  const invalidLongStop = validateTradeRiskLevels('long', 100, 105, 115);
  const validShort = validateTradeRiskLevels('short', 100, 105, 85);
  assert('Valid Long Risk Levels', validLong.isValid);
  assert('Detects Inverted Long Stop Loss', !invalidLongStop.isValid);
  assert('Valid Short Risk Levels', validShort.isValid);

  // 7. Portfolio Statistics (Win Rate, Profit Factor, Expectancy, Drawdown)
  const mockTrades: Partial<Trade>[] = [
    { id: '1', status: 'closed', netPnL: 1000, totalFees: 20, plannedRiskAmount: 500, actualRMultiple: 2, entryDate: '2026-03-01', exitDate: '2026-03-01' },
    { id: '2', status: 'closed', netPnL: -500, totalFees: 20, plannedRiskAmount: 500, actualRMultiple: -1, entryDate: '2026-03-02', exitDate: '2026-03-02' },
    { id: '3', status: 'closed', netPnL: 1500, totalFees: 20, plannedRiskAmount: 500, actualRMultiple: 3, entryDate: '2026-03-03', exitDate: '2026-03-03' },
    { id: '4', status: 'closed', netPnL: 0, totalFees: 10, plannedRiskAmount: 200, actualRMultiple: 0, entryDate: '2026-03-04', exitDate: '2026-03-04' },
    { id: '5', status: 'open', netPnL: -10, totalFees: 10, entryDate: '2026-03-05' },
  ];

  const stats = calculatePortfolioStats(mockTrades as Trade[]);
  // Closed trades: 4 (2 wins, 1 loss, 1 breakeven) -> Win rate = 50%
  assert('Portfolio Win Rate (50%)', stats.winRate === 50);
  assert('Winning Trades Count (2)', stats.winningTrades === 2);
  assert('Losing Trades Count (1)', stats.losingTrades === 1);
  assert('Breakeven Trades Count (1)', stats.breakevenTrades === 1);
  // Profit factor = Gross profit 2500 / Gross loss 500 = 5.0
  assert('Profit Factor (5.0)', stats.profitFactor === 5);
  // Net PnL = 1000 - 500 + 1500 + 0 = 2000
  assert('Total Net PnL (2000)', stats.netPnL === 2000);

  // 8. Zero Trades Empty State
  const zeroStats = calculatePortfolioStats([]);
  assert('Zero Trades Total Count is 0', zeroStats.totalTrades === 0);
  assert('Zero Trades Win Rate is 0', zeroStats.winRate === 0);
  assert('Zero Trades Net PnL is 0', zeroStats.netPnL === 0);
  assert('Zero Trades Rule Adherence is 0', zeroStats.ruleAdherenceRate === 0);

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { passed, failed, results };
}
