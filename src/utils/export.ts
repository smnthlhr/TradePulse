import * as XLSX from 'xlsx';
import { Trade, TradingAccount, Strategy } from '../types/trade';
import { PortfolioStatistics, calculatePortfolioStats, calculateTrade } from './calculations';
import { formatDate } from './date';

export function exportTradesToExcel(
  trades: Trade[],
  accounts: TradingAccount[],
  strategies: Strategy[],
  stats: PortfolioStatistics,
  reportingCurrency: string
) {
  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const strategyMap = new Map<string, string>();
  strategies.forEach((s) => strategyMap.set(s.id, s.name));

  const workbook = XLSX.utils.book_new();

  // 1. SUMMARY SHEET
  const totalStartingBalance = accounts.reduce((acc, a) => acc + (a.startingBalance || 0), 0);
  const totalCurrentBalance = accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);

  const summaryData = [
    ['TradePulse - Trading Performance Summary'],
    ['Generated On', new Date().toLocaleString()],
    ['Reporting Currency', reportingCurrency],
    [],
    ['Key Metric', 'Value'],
    ['Combined Starting Balance', totalStartingBalance],
    ['Combined Current Balance', totalCurrentBalance],
    ['Total Net P&L', stats.netPnL],
    ['Total Gross Profit', stats.grossProfit],
    ['Total Gross Loss', stats.grossLoss],
    ['Total Fees Paid', stats.totalFees],
    ['Total Trades', stats.totalTrades],
    ['Closed Trades', stats.closedTrades],
    ['Open Trades', stats.openTrades],
    ['Winning Trades', stats.winningTrades],
    ['Losing Trades', stats.losingTrades],
    ['Breakeven Trades', stats.breakevenTrades],
    ['Win Rate (%)', `${stats.winRate}%`],
    ['Loss Rate (%)', `${stats.lossRate}%`],
    ['Profit Factor', stats.profitFactor],
    ['Average Winner', stats.averageWinner],
    ['Average Loser', stats.averageLoser],
    ['Largest Winner', stats.largestWinner],
    ['Largest Loser', stats.largestLoser],
    ['Win/Loss Ratio', stats.winLossRatio],
    ['Expectancy', stats.expectancy],
    ['Average R Multiple', stats.averageR],
    ['Max Drawdown Amount', stats.maxDrawdownAmount],
    ['Max Drawdown (%)', `${stats.maxDrawdownPercentage}%`],
    ['Best Win Streak', stats.bestStreak.win],
    ['Worst Loss Streak', stats.bestStreak.loss],
    ['Process Discipline Rate', `${stats.ruleAdherenceRate}%`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Summary');

  // 2. TRADES SHEET (Section 22: Primary Simplified Format)
  const tradeRows = trades.map((t) => {
    const calc = calculateTrade(t);
    const profitVal = t.profit !== undefined ? t.profit : (calc.grossPnL > 0 ? calc.grossPnL : 0);
    const lossVal = t.loss !== undefined ? t.loss : (calc.grossPnL < 0 ? Math.abs(calc.grossPnL) : 0);
    const strategyVal = (t.strategy || t.strategyName || strategyMap.get(t.strategyId || '') || '').trim();
    const notesVal = (t.notesText || t.notes?.thesis || t.notes?.lessonsLearned || (t.notes?.mistakes ? t.notes.mistakes.join(', ') : '')).trim();

    return {
      'Date': t.tradeDate || formatDate(t.entryDate, 'YYYY-MM-DD', true),
      'Account': accountMap.get(t.accountId) || t.accountId,
      'Asset': t.asset || t.symbol,
      'Amount Traded': calc.amountTraded,
      'Profit': profitVal,
      'Loss': lossVal,
      'Charges': calc.charges,
      'Gross P&L': calc.grossPnL,
      'Net P&L': calc.netPnL,
      'Return %': `${calc.returnPercentage}%`,
      'Entry Time': t.entryTime || (t.entryDate && t.entryDate.includes('T') ? t.entryDate.split('T')[1].slice(0, 5) : ''),
      'Exit Time': t.exitTime || (t.exitDate && t.exitDate.includes('T') ? t.exitDate.split('T')[1].slice(0, 5) : ''),
      'Trading Strategy': strategyVal,
      'Notes': notesVal,
      // Supplemental details
      'Trade ID': t.id,
      'Direction': (t.direction || 'long').toUpperCase(),
      'Status': (t.status || 'closed').toUpperCase(),
    };
  });

  const wsTrades = XLSX.utils.json_to_sheet(tradeRows);
  wsTrades['!cols'] = [
    { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 20 },
    { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsTrades, 'Trades');

  // 3. DAILY PERFORMANCE SHEET
  const dailyGroups = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const d = t.exitDate ? t.exitDate.split('T')[0] : t.entryDate.split('T')[0];
    if (!dailyGroups.has(d)) dailyGroups.set(d, []);
    dailyGroups.get(d)!.push(t);
  });

  const sortedDays = Array.from(dailyGroups.keys()).sort();
  const dailyRows = sortedDays.map((day) => {
    const dayTrades = dailyGroups.get(day)!;
    const dayStats = calculatePortfolioStats(dayTrades);
    return {
      'Date': day,
      'Trades': dayStats.totalTrades,
      'Wins': dayStats.winningTrades,
      'Losses': dayStats.losingTrades,
      'Breakeven': dayStats.breakevenTrades,
      'Daily Net P&L': dayStats.netPnL,
      'Win Rate %': `${dayStats.winRate}%`,
      'Avg R': dayStats.averageR,
    };
  });

  const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
  wsDaily['!cols'] = [
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 16 }, { wch: 12 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsDaily, 'Daily Performance');

  // 4. ACCOUNT PERFORMANCE SHEET
  const accountRows = accounts.map((acc) => {
    const accTrades = trades.filter((t) => t.accountId === acc.id);
    const accStats = calculatePortfolioStats(accTrades);
    const netGrowth = acc.currentBalance - acc.startingBalance;
    const returnPct = acc.startingBalance > 0 ? (netGrowth / acc.startingBalance) * 100 : 0;
    return {
      'Account Name': acc.name,
      'Broker': acc.brokerName,
      'Type': acc.accountType,
      'Currency': acc.baseCurrency,
      'Starting Balance': acc.startingBalance,
      'Current Balance': acc.currentBalance,
      'Net Growth': netGrowth,
      'Return %': `${returnPct.toFixed(2)}%`,
      'Trades': accStats.totalTrades,
      'Win Rate %': `${accStats.winRate}%`,
      'Profit Factor': accStats.profitFactor,
      'Net P&L': accStats.netPnL,
      'Max Drawdown': accStats.maxDrawdownAmount,
      'Status': acc.isArchived ? 'Archived' : 'Active',
    };
  });

  const wsAccounts = XLSX.utils.json_to_sheet(accountRows);
  wsAccounts['!cols'] = [
    { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 16 },
    { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsAccounts, 'Account Performance');

  // 5. STRATEGY PERFORMANCE SHEET
  const strategyRows = strategies.map((strat) => {
    const stratTrades = trades.filter((t) => t.strategyId === strat.id || t.strategyName === strat.name);
    const stratStats = calculatePortfolioStats(stratTrades);
    return {
      'Strategy Name': strat.name,
      'Description': strat.description,
      'Target Min R:R': `1:${strat.minRR}`,
      'Trades Executed': stratStats.totalTrades,
      'Wins': stratStats.winningTrades,
      'Losses': stratStats.losingTrades,
      'Win Rate %': `${stratStats.winRate}%`,
      'Net P&L': stratStats.netPnL,
      'Profit Factor': stratStats.profitFactor,
      'Average R': stratStats.averageR,
      'Discipline %': `${stratStats.ruleAdherenceRate}%`,
    };
  });

  const wsStrategies = XLSX.utils.json_to_sheet(strategyRows);
  wsStrategies['!cols'] = [
    { wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsStrategies, 'Strategy Performance');

  // Download XLSX
  const filename = `TradePulse_Trading_Journal_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportTradesToCSV(trades: Trade[], accounts: TradingAccount[]) {
  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const headers = [
    'Trade ID', 'Date', 'Exit Date', 'Account', 'Symbol', 'Direction',
    'Product', 'Status', 'Quantity', 'Entry Price', 'Exit Price',
    'Planned Risk', 'Planned R:R', 'Gross P&L', 'Fees', 'Net P&L',
    'Currency', 'Actual R', 'Strategy', 'Tags', 'Mistakes', 'Thesis'
  ];

  const rows = trades.map((t) => [
    t.id,
    t.entryDate,
    t.exitDate || '',
    accountMap.get(t.accountId) || t.accountId,
    t.symbol,
    t.direction,
    t.productType,
    t.status,
    t.quantity,
    t.entryPrice,
    t.exitPrice ?? '',
    t.plannedRiskAmount ?? '',
    t.plannedRR ?? '',
    t.grossPnL,
    t.totalFees,
    t.netPnL,
    t.tradeCurrency,
    t.actualRMultiple ?? '',
    `"${(t.strategyName || '').replace(/"/g, '""')}"`,
    `"${t.tags.join(', ').replace(/"/g, '""')}"`,
    `"${(t.notes?.mistakes || []).join(', ').replace(/"/g, '""')}"`,
    `"${(t.notes?.thesis || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `TradePulse_Trades_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
