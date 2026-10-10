import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, X, RefreshCw } from 'lucide-react';
import { runFinancialCalculationsTests, TestReport } from '../../utils/calculations.test';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<TestReport | null>(null);

  const runTests = () => {
    const res = runFinancialCalculationsTests();
    setReport(res);
  };

  useEffect(() => {
    if (isOpen) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-xl p-5 space-y-4 text-xs text-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold">Financial Engine Automated Test Suite</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-zinc-500">
          Automated regression tests verifying deterministic accuracy of Long/Short P&amp;L, fees deduction, weighted average partial executions, stop loss R:R ratios, profit factors, drawdowns, and expectancy.
        </p>

        {report && (
          <div className="space-y-3">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-mono">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {report.passed} Passed
              </span>
              <span className={`font-bold ${report.failed > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                {report.failed} Failed
              </span>
              <span className="text-zinc-500">{report.results.length} Total Assertions</span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto font-mono text-[11px]">
              {report.results.map((res, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded flex items-center justify-between ${
                    res.success
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {res.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    )}
                    <span>{res.name}</span>
                  </div>
                  <span className="font-bold uppercase text-[10px]">
                    {res.success ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
          <button
            onClick={runTests}
            className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-run Suite
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
