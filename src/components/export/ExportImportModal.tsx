import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Database,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Trade, TradingAccount, Strategy } from '../../types/trade';
import { PortfolioStatistics } from '../../utils/calculations';
import { exportTradesToExcel, exportTradesToCSV } from '../../utils/export';
import {
  parseSpreadsheetFile,
  validateAndConvertImportRows,
  ColumnMapping,
} from '../../utils/import';
import { storageService } from '../../services/storage';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  accounts: TradingAccount[];
  strategies: Strategy[];
  stats: PortfolioStatistics;
  reportingCurrency: string;
  onImportTrades: (imported: Partial<Trade>[]) => void;
  onRestoreBackup: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  trades,
  accounts,
  strategies,
  stats,
  reportingCurrency,
  onImportTrades,
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'backup'>('export');

  // Import State
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<Record<string, any>[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [importAccountId, setImportAccountId] = useState(accounts[0]?.id || '');

  // Column Mappings
  const [mapping, setMapping] = useState<ColumnMapping>({
    symbolField: '',
    directionField: '',
    entryDateField: '',
    exitDateField: '',
    entryPriceField: '',
    exitPriceField: '',
    quantityField: '',
    feesField: '',
    stopLossField: '',
    targetPriceField: '',
    strategyField: '',
    notesField: '',
  });

  const [validationResult, setValidationResult] = useState<{
    accepted: Partial<Trade>[];
    invalid: { row: number; data: Record<string, any>; reason: string }[];
    totalRows: number;
  } | null>(null);

  // Backup state
  const [backupJsonText, setBackupJsonText] = useState('');

  if (!isOpen) return null;

  const handleExcelExport = () => {
    exportTradesToExcel(trades, accounts, strategies, stats, reportingCurrency);
  };

  const handleCsvExport = () => {
    exportTradesToCSV(trades, accounts);
  };

  const handleJsonBackupDownload = () => {
    const jsonStr = storageService.exportBackupJSON('user_primary');
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TradePulse_Complete_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Handle spreadsheet file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { headers, rows } = await parseSpreadsheetFile(file);
      setFileHeaders(headers);
      setFileRows(rows);

      // Guess initial mapping by keyword
      const guessed: ColumnMapping = {
        symbolField: headers.find((h) => /symbol|ticker|instrument|stock/i.test(h)) || headers[0] || '',
        directionField: headers.find((h) => /dir|side|type|buy|action/i.test(h)) || headers[1] || '',
        entryDateField: headers.find((h) => /date|time|entry/i.test(h)) || headers[2] || '',
        exitDateField: headers.find((h) => /exit.*date|close.*date/i.test(h)) || '',
        entryPriceField: headers.find((h) => /entry.*price|buy.*price|price/i.test(h)) || headers[3] || '',
        exitPriceField: headers.find((h) => /exit.*price|sell.*price|close/i.test(h)) || '',
        quantityField: headers.find((h) => /qty|quantity|shares|size|volume/i.test(h)) || headers[4] || '',
        feesField: headers.find((h) => /fee|commission|brokerage|tax/i.test(h)) || '',
        stopLossField: headers.find((h) => /stop|sl/i.test(h)) || '',
        targetPriceField: headers.find((h) => /target|tp|profit/i.test(h)) || '',
        strategyField: headers.find((h) => /strat|setup|playbook/i.test(h)) || '',
        notesField: headers.find((h) => /note|thesis|comment/i.test(h)) || '',
      };

      setMapping(guessed);
      setImportStep('mapping');
    } catch (err: any) {
      alert('Error reading spreadsheet: ' + err.message);
    }
  };

  // Run validation
  const handleValidateMapping = () => {
    const targetAcc = accounts.find((a) => a.id === importAccountId) || accounts[0];
    const res = validateAndConvertImportRows(
      fileRows,
      mapping,
      importAccountId,
      'user_primary',
      targetAcc ? targetAcc.baseCurrency : reportingCurrency,
      reportingCurrency
    );
    setValidationResult(res);
    setImportStep('preview');
  };

  // Confirm import
  const handleConfirmImport = () => {
    if (!validationResult || validationResult.accepted.length === 0) return;
    onImportTrades(validationResult.accepted);
    alert(`Successfully imported ${validationResult.accepted.length} trades.`);
    onClose();
  };

  // Restore JSON backup
  const handleRestoreJson = () => {
    if (!backupJsonText.trim()) return;
    const ok = storageService.importBackupJSON('user_primary', backupJsonText);
    if (ok) {
      alert('Backup restored successfully!');
      onRestoreBackup();
      onClose();
    } else {
      alert('Failed to restore backup. Invalid JSON file format.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in fade-in-50 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 shrink-0">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Data Management &amp; Portability
            </h3>
            <p className="text-xs text-zinc-500">
              Export professional multi-sheet Excel reports, CSV records, or import external spreadsheets with column mapping.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 px-5 pt-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 text-xs font-medium">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Download className="w-4 h-4" /> Export Workbook
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Upload className="w-4 h-4" /> Import Spreadsheet
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Database className="w-4 h-4" /> Full JSON Backup
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: EXPORT WORKBOOK */}
          {activeTab === 'export' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Multi-Sheet Excel Workbook (.xlsx)
                    </h4>
                    <p className="text-zinc-500 text-[11px]">
                      Contains 5 formatted worksheets: 1. Executive Summary, 2. Complete Trades Ledger, 3. Daily Performance, 4. Account Breakdown, 5. Strategy Playbook Statistics.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleExcelExport}
                    className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-4 h-4" /> Download .XLSX Workbook ({trades.length} trades)
                  </button>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-700 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Standard CSV Export (.csv)
                    </h4>
                    <p className="text-zinc-500 text-[11px]">
                      Raw tabular trade records suitable for external Python / R analysis or spreadsheets.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCsvExport}
                    className="px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-md flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Download CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT SPREADSHEET */}
          {activeTab === 'import' && (
            <div className="space-y-4 text-xs">
              {importStep === 'upload' && (
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center space-y-3">
                  <Upload className="w-10 h-10 mx-auto text-zinc-400" />
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-sm">
                      Upload CSV or Excel Spreadsheet (.xlsx, .csv)
                    </span>
                    <span className="text-zinc-500 text-xs">
                      Supports files exported from brokers or custom trade tracking sheets.
                    </span>
                  </div>
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md shadow-xs">
                      <span>Select File</span>
                      <input
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Step 2: Column Mapping */}
              {importStep === 'mapping' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                        Map Spreadsheet Columns ({fileRows.length} rows detected)
                      </h4>
                      <p className="text-zinc-500 text-[11px]">
                        Match your spreadsheet column names to TradePulse journal fields.
                      </p>
                    </div>
                    <select
                      value={importAccountId}
                      onChange={(e) => setImportAccountId(e.target.value)}
                      className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          Assign to: {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                    {[
                      { key: 'symbolField', label: 'Symbol / Ticker *', required: true },
                      { key: 'directionField', label: 'Direction (Long/Short) *', required: true },
                      { key: 'entryPriceField', label: 'Entry Price *', required: true },
                      { key: 'quantityField', label: 'Quantity / Size *', required: true },
                      { key: 'entryDateField', label: 'Entry Date', required: false },
                      { key: 'exitPriceField', label: 'Exit Price', required: false },
                      { key: 'exitDateField', label: 'Exit Date', required: false },
                      { key: 'feesField', label: 'Brokerage / Fees', required: false },
                      { key: 'stopLossField', label: 'Stop Loss', required: false },
                      { key: 'targetPriceField', label: 'Target Price', required: false },
                      { key: 'strategyField', label: 'Strategy / Setup', required: false },
                      { key: 'notesField', label: 'Notes / Comments', required: false },
                    ].map((col) => (
                      <div key={col.key}>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">
                          {col.label}
                        </label>
                        <select
                          value={(mapping as any)[col.key] || ''}
                          onChange={(e) =>
                            setMapping({ ...mapping, [col.key]: e.target.value })
                          }
                          className="w-full p-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        >
                          <option value="">(None / Skip)</option>
                          {fileHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
                    <button
                      onClick={() => setImportStep('upload')}
                      className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleValidateMapping}
                      className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                    >
                      Validate &amp; Preview Rows
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Preview & Confirm */}
              {importStep === 'preview' && validationResult && (
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                        Validation Summary
                      </span>
                      <span className="text-zinc-500">
                        {validationResult.accepted.length} valid trades ready to import ·{' '}
                        {validationResult.invalid.length} invalid rows rejected
                      </span>
                    </div>
                  </div>

                  {validationResult.invalid.length > 0 && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 max-h-36 overflow-y-auto space-y-1">
                      <span className="font-bold block">Invalid Rows:</span>
                      {validationResult.invalid.map((inv, idx) => (
                        <div key={idx} className="text-[11px]">
                          Row {inv.row}: {inv.reason}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview table */}
                  <div className="max-h-56 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-800">
                        <tr>
                          <th className="p-2">Symbol</th>
                          <th className="p-2">Direction</th>
                          <th className="p-2">Entry Price</th>
                          <th className="p-2">Exit Price</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2">Net P&amp;L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {validationResult.accepted.slice(0, 10).map((t, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono font-bold">{t.symbol}</td>
                            <td className="p-2 uppercase font-semibold">{t.direction}</td>
                            <td className="p-2 font-mono">{t.entryPrice}</td>
                            <td className="p-2 font-mono">{t.exitPrice ?? 'Open'}</td>
                            <td className="p-2 font-mono">{t.quantity}</td>
                            <td className="p-2 font-mono font-bold">{t.netPnL}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
                    <button
                      onClick={() => setImportStep('mapping')}
                      className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700"
                    >
                      Back to Mapping
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={validationResult.accepted.length === 0}
                      className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded disabled:opacity-50"
                    >
                      Confirm Import ({validationResult.accepted.length} Trades)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPLETE BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Export Full JSON Backup
                  </h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">
                    Download complete snapshot of your accounts, transactions, trades, playbook setups, personal discipline rules, goals, and journal entries.
                  </p>
                </div>
                <button
                  onClick={handleJsonBackupDownload}
                  className="px-3.5 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                >
                  Download Complete Backup (.json)
                </button>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Restore from JSON Backup
                  </h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">
                    Paste raw JSON backup content to restore entire workspace state.
                  </p>
                </div>
                <textarea
                  rows={4}
                  value={backupJsonText}
                  onChange={(e) => setBackupJsonText(e.target.value)}
                  placeholder="Paste JSON backup text here..."
                  className="w-full p-2 font-mono text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
                <button
                  onClick={handleRestoreJson}
                  disabled={!backupJsonText.trim()}
                  className="px-3.5 py-1.5 font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 rounded disabled:opacity-50"
                >
                  Restore Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
