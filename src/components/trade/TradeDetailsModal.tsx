import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Shield,
  Star,
  Tag,
  AlertTriangle,
  Brain,
  ChevronRight,
  Maximize2,
  Trash2,
  Edit2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Target,
  Heart,
  Award,
  Camera,
  Activity,
  Layers,
} from 'lucide-react';
import { Trade, TradingAccount } from '../../types/trade';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatDuration } from '../../utils/date';
import { ConfirmDeleteTradeModal } from '../common/ConfirmDeleteTradeModal';

interface TradeDetailsModalProps {
  trade: Trade | null;
  account?: TradingAccount;
  reportingCurrency: string;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onAskAICoach?: (trade: Trade, question?: string) => void;
}

export const TradeDetailsModal: React.FC<TradeDetailsModalProps> = ({
  trade,
  account,
  reportingCurrency,
  onClose,
  onEdit,
  onDelete,
  onAskAICoach,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (!trade) return null;

  const isProfitable = trade.netPnL > 0.0001;
  const isLoss = trade.netPnL < -0.0001;
  const actualR = trade.actualRR ?? trade.actualRMultiple;

  const handleAskAI = (question: string) => {
    if (onAskAICoach) {
      onAskAICoach(trade, question);
    }
  };

  const tradeScreenshot =
    trade.chartScreenshot ||
    (trade.screenshots && trade.screenshots[0]?.url) ||
    null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-100">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                  trade.direction === 'long' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {trade.direction === 'long' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                    {trade.symbol}
                  </h2>
                  <span
                    className={`text-xs uppercase font-mono px-2 py-0.5 rounded font-bold ${
                      trade.direction === 'long'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {trade.direction} · {trade.productType}
                  </span>
                  <span
                    className={`text-xs uppercase font-mono px-2 py-0.5 rounded font-medium ${
                      trade.status === 'open'
                        ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {trade.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                  <span>{account?.name || 'Trading Account'}</span>
                  <span>·</span>
                  <span>{formatDate(trade.tradeDate || trade.entryDate, 'DD MMMM YYYY')}</span>
                  {trade.entryTime && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{trade.entryTime} {trade.exitTime ? `– ${trade.exitTime}` : ''}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions (View Mode: Clearly separated Edit Trade, Ask AI, Delete) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleAskAI(
                    isLoss
                      ? `Loss Review: Determine whether trade ${trade.symbol} was a Good Loss or Process Error. Evaluate rules followed vs broken.`
                      : `Review trade ${trade.symbol}: Evaluate execution quality, risk management, and playbook adherence.`
                  )
                }
                className="px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/80 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors shadow-xs"
              >
                <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="hidden sm:inline">Ask AI Coach</span>
              </button>

              {/* Clearly Visible Edit Trade Button (Section 2) */}
              <button
                onClick={() => {
                  onEdit(trade);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Edit Trade</span>
              </button>

              {/* Delete Button (Section 4) */}
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                title="Delete Trade"
                className="p-2 text-rose-500 hover:text-rose-700 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
            {/* 1. Core Financial Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono">
                <span className="text-[10px] text-zinc-400 block uppercase">Net Realized P&amp;L</span>
                <span
                  className={`text-lg font-bold ${
                    isProfitable
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isLoss
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {formatCurrency(trade.netPnL, trade.tradeCurrency, { showSign: true })}
                </span>
                <span className="block text-[11px] text-zinc-400 mt-0.5">
                  Gross: {formatCurrency(trade.grossPnL, trade.tradeCurrency, { showSign: true })}
                </span>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono">
                <span className="text-[10px] text-zinc-400 block uppercase">Planned R:R</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {trade.plannedRRText || (trade.plannedRR ? `1:${trade.plannedRR}` : '1:2')}
                </span>
                <span className="block text-[11px] text-zinc-400 mt-0.5">
                  Actual: {actualR !== undefined ? `${actualR > 0 ? '+' : ''}${actualR}R` : '—'}
                </span>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono">
                <span className="text-[10px] text-zinc-400 block uppercase">Discipline Score</span>
                <span
                  className={`text-lg font-bold ${
                    (trade.disciplineScore ?? 100) >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : (trade.disciplineScore ?? 100) >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600'
                  }`}
                >
                  {trade.disciplineScore !== undefined ? `${trade.disciplineScore}%` : '100%'}
                </span>
                <span className="block text-[11px] text-zinc-400 mt-0.5">
                  {trade.rulesFollowedCount !== undefined ? `${trade.rulesFollowedCount} rules adhered` : 'Plan followed'}
                </span>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono">
                <span className="text-[10px] text-zinc-400 block uppercase">Confidence &amp; Charges</span>
                <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                  {trade.confidenceScore !== undefined ? `${trade.confidenceScore}/10` : '—'}
                </span>
                <span className="block text-[11px] text-zinc-400 mt-0.5">
                  Fees: {formatCurrency(trade.charges ?? trade.totalFees ?? 0, trade.tradeCurrency)}
                </span>
              </div>
            </div>

            {/* 2. Execution & Prices Breakdown */}
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono block">
                Execution &amp; Risk Parameters
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Quantity</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{trade.quantity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Entry Price</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {formatCurrency(trade.entryPrice, trade.tradeCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Exit Price</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {trade.exitPrice !== undefined ? formatCurrency(trade.exitPrice, trade.tradeCurrency) : 'Open'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Capital Used</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {formatCurrency(trade.amountTraded ?? trade.amountInvested ?? 0, trade.tradeCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 uppercase block">Stop Loss Level</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {trade.stopLossPrice ? formatCurrency(trade.stopLossPrice, trade.tradeCurrency) : 'None defined'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-500 uppercase block">Target Price</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {trade.targetPrice ? formatCurrency(trade.targetPrice, trade.tradeCurrency) : 'Discretionary'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-purple-400 uppercase block">Strategy Setup</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {trade.strategy || trade.strategyName || 'Discretionary'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Return on Capital</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {trade.pnlPercentage > 0 ? '+' : ''}{trade.pnlPercentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Rule Followed Checklist (Section 1.B & 1.C) */}
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Trading Rules &amp; Discipline Checklist
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Discipline: {trade.disciplineScore ?? 100}%
                </span>
              </div>

              {trade.checklistResponses && Object.keys(trade.checklistResponses).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(trade.checklistResponses).map(([ruleTitle, followed]) => (
                    <div
                      key={ruleTitle}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-medium ${
                        followed
                          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                          : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                      }`}
                    >
                      <span>{ruleTitle}</span>
                      {followed ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> Followed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <XCircle className="w-3.5 h-3.5 stroke-[2.5]" /> Rule Broken
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">No checklist recorded for this trade.</p>
              )}
            </div>

            {/* 4. Psychology & Emotional State (Section 1.D & 1.E) */}
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                Trader Psychology &amp; Emotional State
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">
                    Emotions Recorded
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(trade.emotions || trade.psychology?.emotions || ['Calm']).map((em) => (
                      <span
                        key={em}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-purple-200 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">
                    Confidence Level
                  </span>
                  <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    {trade.confidenceScore ?? trade.psychology?.confidence ?? 7} / 10
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">
                    Fear &amp; Greed Scores
                  </span>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span>
                      Fear: <strong className="text-amber-600">{trade.fearScore ?? trade.psychology?.fear ?? '—'}/10</strong>
                    </span>
                    <span>
                      Greed: <strong className="text-purple-600">{trade.greedScore ?? trade.psychology?.greed ?? '—'}/10</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Notes, Lesson Learned & What Can I Improve? (Section 1.F) */}
            <div className="space-y-3">
              {/* Thesis & Notes */}
              {(trade.notesText || trade.notes?.thesis) && (
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[11px] uppercase font-mono font-bold text-zinc-500 block mb-1">
                    Trade Thesis &amp; Context
                  </span>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {trade.notesText || trade.notes?.thesis}
                  </p>
                </div>
              )}

              {/* Lesson Learned */}
              {(trade.lessonLearned || trade.notes?.lessonsLearned) && (
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-[11px] uppercase font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5" /> Lesson Learned
                  </span>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed whitespace-pre-wrap">
                    {trade.lessonLearned || trade.notes?.lessonsLearned}
                  </p>
                </div>
              )}

              {/* What Can I Improve? */}
              {(trade.whatCanIImprove || trade.notes?.whatCanIImprove) && (
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800/60">
                  <span className="text-[11px] uppercase font-mono font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> What Can I Improve?
                  </span>
                  <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
                    {trade.whatCanIImprove || trade.notes?.whatCanIImprove}
                  </p>
                </div>
              )}
            </div>

            {/* 6. Chart Screenshot (Section 1.G) */}
            {tradeScreenshot && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-zinc-500" />
                  Chart Execution Screenshot
                </span>
                <div
                  onClick={() => setSelectedImage(tradeScreenshot)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden cursor-pointer group relative bg-black/5 max-h-72 flex items-center justify-center"
                >
                  <img
                    src={tradeScreenshot}
                    alt={`${trade.symbol} Chart`}
                    className="max-h-72 w-auto object-contain transition-transform group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                    <Maximize2 className="w-4 h-4" /> Click to expand
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Size Image Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={selectedImage}
            alt="Expanded Chart"
            className="max-w-full max-h-[95vh] rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}

      {/* Delete Confirmation Dialog (Section 4) */}
      <ConfirmDeleteTradeModal
        isOpen={isDeleteConfirmOpen}
        trade={trade}
        accountName={account?.name}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          onDelete(trade.id);
          setIsDeleteConfirmOpen(false);
          onClose();
        }}
      />
    </>
  );
};
