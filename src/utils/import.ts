import * as XLSX from 'xlsx';
import { Trade, AssetClass, ProductType, TradeDirection } from '../types/trade';
import { calculateTradeMetrics } from './calculations';

export interface ColumnMapping {
  symbolField: string;
  directionField: string;
  entryDateField: string;
  exitDateField?: string;
  entryPriceField: string;
  exitPriceField?: string;
  quantityField: string;
  feesField?: string;
  stopLossField?: string;
  targetPriceField?: string;
  strategyField?: string;
  notesField?: string;
}

export interface ImportValidationResult {
  accepted: Partial<Trade>[];
  invalid: { row: number; data: Record<string, any>; reason: string }[];
  totalRows: number;
}

export function parseSpreadsheetFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });

        if (!json || json.length < 2) {
          reject(new Error('The spreadsheet is empty or has no data rows.'));
          return;
        }

        const rawHeaders = (json[0] as any[]).map((h) => String(h || '').trim());
        const headers = rawHeaders.filter(Boolean);

        const rows: Record<string, any>[] = [];
        for (let i = 1; i < json.length; i++) {
          const rowData = json[i] as any[];
          if (!rowData || rowData.length === 0) continue;
          const obj: Record<string, any> = {};
          rawHeaders.forEach((h, idx) => {
            if (h) obj[h] = rowData[idx];
          });
          // check if row is not completely empty
          if (Object.values(obj).some((v) => v !== undefined && v !== '')) {
            rows.push(obj);
          }
        }

        resolve({ headers, rows });
      } catch (err: any) {
        reject(new Error('Failed to read spreadsheet: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to load file.'));
    reader.readAsBinaryString(file);
  });
}

export function validateAndConvertImportRows(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  accountId: string,
  userId: string,
  accountCurrency: string,
  reportingCurrency: string
): ImportValidationResult {
  const accepted: Partial<Trade>[] = [];
  const invalid: { row: number; data: Record<string, any>; reason: string }[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1
    const symbol = String(row[mapping.symbolField] || '').trim().toUpperCase();
    if (!symbol) {
      invalid.push({ row: rowNum, data: row, reason: 'Missing symbol/ticker' });
      return;
    }

    const rawDir = String(row[mapping.directionField] || '').trim().toLowerCase();
    const direction: TradeDirection = rawDir.includes('short') || rawDir.includes('sell') ? 'short' : 'long';

    const entryPrice = parseFloat(String(row[mapping.entryPriceField]).replace(/[^0-9.-]+/g, ''));
    if (isNaN(entryPrice) || entryPrice <= 0) {
      invalid.push({ row: rowNum, data: row, reason: `Invalid entry price: "${row[mapping.entryPriceField]}"` });
      return;
    }

    const quantity = parseFloat(String(row[mapping.quantityField]).replace(/[^0-9.-]+/g, ''));
    if (isNaN(quantity) || quantity <= 0) {
      invalid.push({ row: rowNum, data: row, reason: `Invalid quantity: "${row[mapping.quantityField]}"` });
      return;
    }

    let entryDate = String(row[mapping.entryDateField] || '').trim();
    if (!entryDate) {
      entryDate = new Date().toISOString();
    } else {
      const parsedD = new Date(entryDate);
      if (isNaN(parsedD.getTime())) {
        entryDate = new Date().toISOString();
      }
    }

    let exitPrice: number | undefined = undefined;
    if (mapping.exitPriceField && row[mapping.exitPriceField] !== undefined && row[mapping.exitPriceField] !== '') {
      const parsedExit = parseFloat(String(row[mapping.exitPriceField]).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(parsedExit) && parsedExit > 0) {
        exitPrice = parsedExit;
      }
    }

    let exitDate: string | undefined = undefined;
    if (mapping.exitDateField && row[mapping.exitDateField]) {
      const parsedExitDate = new Date(row[mapping.exitDateField]);
      if (!isNaN(parsedExitDate.getTime())) {
        exitDate = parsedExitDate.toISOString();
      }
    }

    const fees = mapping.feesField ? Math.max(0, parseFloat(String(row[mapping.feesField]).replace(/[^0-9.-]+/g, '')) || 0) : 0;
    const stopLoss = mapping.stopLossField ? parseFloat(String(row[mapping.stopLossField]).replace(/[^0-9.-]+/g, '')) || undefined : undefined;
    const target = mapping.targetPriceField ? parseFloat(String(row[mapping.targetPriceField]).replace(/[^0-9.-]+/g, '')) || undefined : undefined;
    const strategyName = mapping.strategyField ? String(row[mapping.strategyField] || '').trim() : undefined;
    const notes = mapping.notesField ? String(row[mapping.notesField] || '').trim() : '';

    const metrics = calculateTradeMetrics({
      direction,
      entryPrice,
      exitPrice,
      quantity,
      stopLossPrice: stopLoss,
      targetPrice: target,
      totalFees: fees,
      entryDate,
      exitDate,
    });

    const status = exitPrice !== undefined ? (Math.abs(metrics.netPnL) < 0.01 ? 'breakeven' : 'closed') : 'open';

    const trade: Partial<Trade> = {
      id: `trade_${Date.now()}_${index}`,
      userId,
      accountId,
      symbol,
      assetClass: 'equity' as AssetClass,
      productType: 'Delivery' as ProductType,
      direction,
      status,
      entryDate,
      exitDate,
      entryPrice,
      exitPrice,
      quantity,
      totalFees: fees,
      stopLossPrice: stopLoss,
      targetPrice: target,
      plannedRiskAmount: metrics.plannedRiskAmount,
      plannedRewardAmount: metrics.plannedRewardAmount,
      plannedRR: metrics.plannedRR,
      grossPnL: metrics.grossPnL,
      netPnL: metrics.netPnL,
      pnlPercentage: metrics.pnlPercentage,
      actualRMultiple: metrics.actualRMultiple,
      strategyName,
      tradeCurrency: accountCurrency,
      reportingCurrency,
      fxRateUsed: 1.0,
      netPnLReporting: metrics.netPnL,
      notes: {
        thesis: notes,
        mistakes: [],
      },
      tags: [],
      screenshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    accepted.push(trade);
  });

  return { accepted, invalid, totalRows: rows.length };
}
