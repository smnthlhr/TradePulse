import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Trade } from '../../types/trade';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

interface ConfirmDeleteTradeModalProps {
  isOpen: boolean;
  trade: Trade | null;
  accountName?: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const ConfirmDeleteTradeModal: React.FC<ConfirmDeleteTradeModalProps> = ({
  isOpen,
  trade,
  accountName,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  if (!isOpen || !trade) return null;

  const dateStr = formatDate(trade.tradeDate || trade.entryDate, 'DD MMMM YYYY');
  const isProfit = (trade.netPnL || 0) > 0.0001;
  const isLoss = (trade.netPnL || 0) < -0.0001;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4 text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Confirm Trade Deletion
              </h3>
              <p className="text-xs text-zinc-500">
                This action will permanently delete the trade record.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clear Identification */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2 text-xs">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
            Delete <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">{trade.symbol}</span> trade from <span className="font-semibold">{dateStr}</span>?
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] text-zinc-500">
            <div>
              <span className="block text-zinc-400 uppercase font-mono text-[10px]">Side / Type:</span>
              <span className="font-medium capitalize text-zinc-700 dark:text-zinc-300">
                {trade.direction} · {trade.productType}
              </span>
            </div>
            <div>
              <span className="block text-zinc-400 uppercase font-mono text-[10px]">Net P&amp;L:</span>
              <span
                className={`font-mono font-bold ${
                  isProfit
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isLoss
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-600'
                }`}
              >
                {formatCurrency(trade.netPnL, trade.tradeCurrency, { showSign: true })}
              </span>
            </div>
            {accountName && (
              <div className="col-span-2">
                <span className="block text-zinc-400 uppercase font-mono text-[10px]">Account:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{accountName}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed">
          The trade will be removed from your ledger, journal, analytics, and account balance immediately.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting…' : 'Delete Trade'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
