import { Trade } from '../types/trade';
import { PortfolioStatistics } from './calculations';

export interface ScoreComponent {
  name: string;
  score: number; // 0-100
  weight: number; // percentage
  description: string;
}

export interface ScoreAnalysis {
  overallScore: number; // 0-100
  status: 'Exceptional' | 'Strong' | 'Developing' | 'Needs Review' | 'Insufficient Data';
  isCalculable: boolean;
  components: ScoreComponent[];
  summary: string;
}

/**
 * Calculates Profitability Score (0-100) based on multi-factor weighted performance metrics
 */
export function calculateProfitabilityScore(stats: PortfolioStatistics, trades: Trade[]): ScoreAnalysis {
  if (stats.closedTrades < 3) {
    return {
      overallScore: 0,
      status: 'Insufficient Data',
      isCalculable: false,
      components: [],
      summary: 'More trading history is required to calculate your score. Record at least 3 closed trades.',
    };
  }

  // 1. Profit Factor component (0-100)
  // PF >= 3.0 -> 100, PF 2.0 -> 80, PF 1.5 -> 65, PF 1.0 -> 50, PF < 1.0 -> 20-40
  let pfScore = 50;
  if (stats.profitFactor >= 3.0) pfScore = 100;
  else if (stats.profitFactor >= 2.0) pfScore = 80 + ((stats.profitFactor - 2.0) / 1.0) * 20;
  else if (stats.profitFactor >= 1.0) pfScore = 50 + ((stats.profitFactor - 1.0) / 1.0) * 30;
  else pfScore = Math.max(10, Math.round(stats.profitFactor * 50));

  // 2. Expectancy & Win Rate component (0-100)
  let winRateScore = Math.min(100, Math.max(0, stats.winRate * 1.2));

  // 3. Average R Multiple component (0-100)
  // Avg R >= 2.0 -> 100, 1.0 -> 75, 0.5 -> 60, <= 0 -> 25
  let rScore = 50;
  if (stats.averageR >= 2.0) rScore = 100;
  else if (stats.averageR >= 1.0) rScore = 75 + (stats.averageR - 1.0) * 25;
  else if (stats.averageR > 0) rScore = 50 + stats.averageR * 25;
  else rScore = Math.max(10, 50 + stats.averageR * 20);

  // 4. Drawdown Control component (0-100)
  // Drawdown < 5% -> 95, < 10% -> 80, < 20% -> 60, > 30% -> 30
  let ddScore = 100;
  if (stats.maxDrawdownPercentage <= 5) ddScore = 95;
  else if (stats.maxDrawdownPercentage <= 10) ddScore = 80;
  else if (stats.maxDrawdownPercentage <= 20) ddScore = 65;
  else if (stats.maxDrawdownPercentage <= 35) ddScore = 45;
  else ddScore = 20;

  // 5. Outlier Sensitivity & Consistency (0-100)
  // Checks if net profit is solely dependent on 1 huge trade
  let consistencyScore = 75;
  if (stats.grossProfit > 0 && stats.largestWinner > 0) {
    const winnerShare = (stats.largestWinner / stats.grossProfit) * 100;
    if (winnerShare > 60) consistencyScore = 40; // Too concentrated
    else if (winnerShare > 40) consistencyScore = 60;
    else consistencyScore = 85;
  }

  const components: ScoreComponent[] = [
    {
      name: 'Profit Factor',
      score: Math.round(pfScore),
      weight: 25,
      description: 'Ratio of gross trading profits to gross losses.',
    },
    {
      name: 'Expectancy & Win Rate',
      score: Math.round(winRateScore),
      weight: 20,
      description: 'Mathematical positive expectation and percentage of winning setups.',
    },
    {
      name: 'Asymmetric Payoff (Avg R)',
      score: Math.round(rScore),
      weight: 20,
      description: 'Realized average multiple of planned capital risk.',
    },
    {
      name: 'Drawdown Control',
      score: Math.round(ddScore),
      weight: 20,
      description: 'Capital preservation and containment of equity retracements.',
    },
    {
      name: 'Profit Consistency',
      score: Math.round(consistencyScore),
      weight: 15,
      description: 'Even distribution of returns without over-dependence on single outliers.',
    },
  ];

  const weightedSum = components.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0);
  const overallScore = Math.round(Math.min(100, Math.max(0, weightedSum)));

  let status: ScoreAnalysis['status'] = 'Developing';
  if (overallScore >= 80) status = 'Exceptional';
  else if (overallScore >= 68) status = 'Strong';
  else if (overallScore >= 50) status = 'Developing';
  else status = 'Needs Review';

  return {
    overallScore,
    status,
    isCalculable: true,
    components,
    summary:
      overallScore >= 75
        ? 'Solid statistical edge with controlled risk and healthy win/loss ratios.'
        : 'Performance shows developing characteristics. Focus on eliminating costly mistakes and maintaining minimum 1:2 R:R.',
  };
}

/**
 * Calculates Discipline Score (0-100) based strictly on process rules adherence
 */
export function calculateDisciplineScore(trades: Trade[]): ScoreAnalysis {
  if (trades.length === 0) {
    return {
      overallScore: 0,
      status: 'Insufficient Data',
      isCalculable: false,
      components: [],
      summary: 'Add trades to track process discipline.',
    };
  }

  // 1. Hard Stop-Loss Placement Rate
  const tradesWithStop = trades.filter((t) => t.stopLossPrice && t.stopLossPrice > 0).length;
  const stopLossScore = Math.round((tradesWithStop / trades.length) * 100);

  // 2. Playbook Checklist Adherence
  let checklistTotal = 0;
  let checklistFollowed = 0;
  trades.forEach((t) => {
    if (t.rulesTotalCount && t.rulesTotalCount > 0) {
      checklistTotal += t.rulesTotalCount;
      checklistFollowed += t.rulesFollowedCount || 0;
    }
  });
  const checklistScore = checklistTotal > 0 ? Math.round((checklistFollowed / checklistTotal) * 100) : 100;

  // 3. Zero-FOMO / Emotion Control
  const fomoTrades = trades.filter((t) => (t.notes?.mistakes || []).includes('FOMO') || (t.notes?.mistakes || []).includes('Revenge trade')).length;
  const fomoControlScore = Math.max(0, 100 - Math.round((fomoTrades / trades.length) * 100 * 2));

  // 4. Planned R:R Compliance (>= 1.5)
  const compliantRR = trades.filter((t) => (t.plannedRR || 0) >= 1.5).length;
  const rrComplianceScore = Math.round((compliantRR / trades.length) * 100);

  const components: ScoreComponent[] = [
    {
      name: 'Stop-Loss Discipline',
      score: stopLossScore,
      weight: 30,
      description: 'Percentage of trades executed with predefined hard stop-losses.',
    },
    {
      name: 'Playbook Rule Execution',
      score: checklistScore,
      weight: 30,
      description: 'Adherence to setup checklist conditions before entering.',
    },
    {
      name: 'Emotional Self-Control',
      score: fomoControlScore,
      weight: 20,
      description: 'Freedom from FOMO, revenge trading, and emotional over-sizing.',
    },
    {
      name: 'Risk:Reward Compliance',
      score: rrComplianceScore,
      weight: 20,
      description: 'Adherence to minimum 1:1.5 asymmetric payoff target.',
    },
  ];

  const overallScore = Math.round(components.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0));

  let status: ScoreAnalysis['status'] = 'Strong';
  if (overallScore >= 85) status = 'Exceptional';
  else if (overallScore >= 70) status = 'Strong';
  else if (overallScore >= 55) status = 'Developing';
  else status = 'Needs Review';

  return {
    overallScore,
    status,
    isCalculable: true,
    components,
    summary:
      overallScore >= 80
        ? 'High procedural integrity. You are executing your trading plan systematically.'
        : 'Process breaches detected. Prioritize placing stops on entry and rejecting non-playbook setups.',
  };
}

/**
 * Calculates Consistency Score (0-100)
 */
export function calculateConsistencyScore(stats: PortfolioStatistics, trades: Trade[]): number {
  if (stats.closedTrades < 4) return 70;
  // Measures daily win/loss stability and drawdown containment
  const winRateFactor = 100 - Math.abs(50 - stats.winRate); // closer to balance
  const ddFactor = Math.max(0, 100 - stats.maxDrawdownPercentage * 2.5);
  return Math.round(winRateFactor * 0.4 + ddFactor * 0.6);
}
