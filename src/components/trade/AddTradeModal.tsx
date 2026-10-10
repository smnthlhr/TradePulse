import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Upload,
  Sparkles,
  Shield,
  HelpCircle,
  CheckCircle2,
  Smile,
  Heart,
  Target,
  Brain,
  Camera,
  Layers,
  Activity,
  Award,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import {
  Trade,
  TradingAccount,
  Strategy,
  PersonalRule,
  AssetClass,
  ProductType,
  TradeDirection,
  TradeStatus,
  AccountType,
  ScreenshotAttachment,
  TradingRulesSettings,
  BehavioralTag,
} from '../../types/trade';
import { calculateTrade } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';
import {
  DEFAULT_TRADING_RULES,
  ALL_BEHAVIORAL_TAGS,
  checkPreTradeRisk,
  classifyTradeDiscipline,
  PreTradeRiskCheckResult,
} from '../../utils/behavioralRisk';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (trade: Trade) => void;
  onSaveAccount?: (account: TradingAccount) => void;
  accounts: TradingAccount[];
  strategies: Strategy[];
  rules?: PersonalRule[];
  editingTrade?: Trade | null;
  reportingCurrency: string;
  tradingRules?: TradingRulesSettings;
  trades?: Trade[];
}

const DEFAULT_CHECKLIST_RULES = [
  'Setup matched my strategy',
  'Waited for confirmation',
  'Entry followed trading plan',
  'Stop loss was defined before entry',
  'Target was defined before entry',
  'Risk was within allowed limit',
  'No FOMO entry',
  'No revenge trading',
  'Did not move stop loss emotionally',
  'Trade taken during permitted trading hours',
];

const EMOTION_OPTIONS = [
  { id: 'Calm', label: 'Calm', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300' },
  { id: 'Confident', label: 'Confident', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300' },
  { id: 'Fearful', label: 'Fearful', color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300' },
  { id: 'Greedy', label: 'Greedy', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300' },
  { id: 'FOMO', label: 'FOMO', color: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300' },
  { id: 'Revenge', label: 'Revenge', color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300' },
  { id: 'Impatient', label: 'Impatient', color: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300' },
  { id: 'Hesitant', label: 'Hesitant', color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-300' },
  { id: 'Overconfident', label: 'Overconfident', color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300' },
  { id: 'Frustrated', label: 'Frustrated', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300' },
];

export const AddTradeModal: React.FC<AddTradeModalProps> = ({
  isOpen,
  onClose,
  onSaveTrade,
  onSaveAccount,
  accounts,
  strategies,
  rules = [],
  editingTrade,
  reportingCurrency,
  tradingRules = DEFAULT_TRADING_RULES,
  trades = [],
}) => {
  // 1. Basic Trade Info
  const [accountId, setAccountId] = useState('');
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<TradeDirection>('long');
  const [productType, setProductType] = useState<ProductType>('Intraday');
  const [assetClass, setAssetClass] = useState<AssetClass>('equity');
  const [status, setStatus] = useState<TradeStatus>('closed');
  const [entryTime, setEntryTime] = useState('09:30');
  const [exitTime, setExitTime] = useState('15:15');

  // 2. Execution & Prices
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [entryPrice, setEntryPrice] = useState<number | ''>('');
  const [exitPrice, setExitPrice] = useState<number | ''>('');
  const [amountTraded, setAmountTraded] = useState<number | ''>('');
  const [profit, setProfit] = useState<number | ''>(0);
  const [loss, setLoss] = useState<number | ''>(0);
  const [charges, setCharges] = useState<number | ''>(0);

  // 3. Risk & Planned RR (Section 1.A)
  const [stopLossPrice, setStopLossPrice] = useState<number | ''>('');
  const [targetPrice, setTargetPrice] = useState<number | ''>('');
  const [plannedRRRatio, setPlannedRRRatio] = useState<string>('1:2');
  const [plannedRRNumber, setPlannedRRNumber] = useState<number | ''>(2);

  // Behavioral Intelligence & Tags (Section 4 & 6)
  const [selectedBehavioralTags, setSelectedBehavioralTags] = useState<string[]>([]);
  const [isRevengeTradeConfirmed, setIsRevengeTradeConfirmed] = useState(false);
  const [isRevengeDismissed, setIsRevengeDismissed] = useState(false);

  // 4. Strategy & Playbook
  const [strategy, setStrategy] = useState('');

  // 5. Rule Checklist (Section 1.B & 1.C)
  const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({});

  // 6. Psychology & Emotions (Section 1.D & 1.E)
  const [confidenceScore, setConfidenceScore] = useState<number>(7);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(['Calm']);
  const [fearScore, setFearScore] = useState<number | ''>(2);
  const [greedScore, setGreedScore] = useState<number | ''>(3);

  // 7. Notes, Lessons & Improvements (Section 1.F)
  const [notesText, setNotesText] = useState('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [whatCanIImprove, setWhatCanIImprove] = useState('');

  // 8. Screenshots (Section 1.G)
  const [chartScreenshot, setChartScreenshot] = useState<string | null>(null);

  // Quick Inline Account Creation (when accounts are empty)
  const [newAccName, setNewAccName] = useState('Zerodha Equity Main');
  const [newAccBroker, setNewAccBroker] = useState('Zerodha');
  const [newAccStartingBalance, setNewAccStartingBalance] = useState<number>(100000);

  // Section collapsing for high usability (Section 17)
  const [activeTab, setActiveTab] = useState<'details' | 'risk' | 'discipline' | 'psychology' | 'review'>('details');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Compile checklist items (combining user's active personal rules and default rules)
  const availableRules = useMemo(() => {
    const list: string[] = [];
    // User discipline rules
    rules.forEach((r) => {
      if (r.title && !list.includes(r.title)) {
        list.push(r.title);
      }
    });
    // Default discipline rules
    DEFAULT_CHECKLIST_RULES.forEach((r) => {
      if (!list.includes(r)) {
        list.push(r);
      }
    });
    return list;
  }, [rules]);

  // Initialize or populate form on open/edit
  useEffect(() => {
    if (editingTrade) {
      setAccountId(editingTrade.accountId);
      setTradeDate(
        editingTrade.tradeDate ||
        (editingTrade.entryDate ? editingTrade.entryDate.split('T')[0] : new Date().toISOString().split('T')[0])
      );
      setSymbol(editingTrade.symbol || editingTrade.asset || '');
      setDirection(editingTrade.direction || 'long');
      setProductType(editingTrade.productType || 'Intraday');
      setAssetClass(editingTrade.assetClass || 'equity');
      setStatus(editingTrade.status || 'closed');

      // Times
      if (editingTrade.entryTime) {
        setEntryTime(editingTrade.entryTime);
      } else if (editingTrade.entryDate && editingTrade.entryDate.includes('T')) {
        setEntryTime(editingTrade.entryDate.split('T')[1].slice(0, 5));
      } else {
        setEntryTime('09:30');
      }

      if (editingTrade.exitTime) {
        setExitTime(editingTrade.exitTime);
      } else if (editingTrade.exitDate && editingTrade.exitDate.includes('T')) {
        setExitTime(editingTrade.exitDate.split('T')[1].slice(0, 5));
      } else {
        setExitTime('15:15');
      }

      // Quantity & Prices
      setQuantity(editingTrade.quantity || 1);
      setEntryPrice(editingTrade.entryPrice ?? '');
      setExitPrice(editingTrade.exitPrice ?? '');
      setAmountTraded(editingTrade.amountTraded ?? editingTrade.amountInvested ?? '');

      // PnL & Charges
      const calc = calculateTrade(editingTrade);
      if (editingTrade.profit !== undefined) {
        setProfit(editingTrade.profit);
      } else {
        setProfit(calc.grossPnL > 0 ? calc.grossPnL : 0);
      }

      if (editingTrade.loss !== undefined) {
        setLoss(editingTrade.loss);
      } else {
        setLoss(calc.grossPnL < 0 ? Math.abs(calc.grossPnL) : 0);
      }
      setCharges(editingTrade.charges ?? editingTrade.totalFees ?? 0);

      // Planned RR
      setStopLossPrice(editingTrade.stopLossPrice ?? '');
      setTargetPrice(editingTrade.targetPrice ?? '');
      if (editingTrade.plannedRR !== undefined && editingTrade.plannedRR > 0) {
        setPlannedRRNumber(editingTrade.plannedRR);
        setPlannedRRRatio(`1:${editingTrade.plannedRR}`);
      } else if (editingTrade.plannedRRText) {
        setPlannedRRRatio(editingTrade.plannedRRText);
        const parsed = parseFloat(editingTrade.plannedRRText.replace('1:', ''));
        if (!isNaN(parsed)) setPlannedRRNumber(parsed);
      } else {
        setPlannedRRRatio('1:2');
        setPlannedRRNumber(2);
      }

      // Strategy
      setStrategy(editingTrade.strategy || editingTrade.strategyName || '');

      // Checklist & Discipline
      if (editingTrade.checklistResponses) {
        setChecklistResponses(editingTrade.checklistResponses);
      } else {
        // Default all checked
        const initChecks: Record<string, boolean> = {};
        availableRules.forEach((r) => {
          initChecks[r] = true;
        });
        setChecklistResponses(initChecks);
      }

      // Psychology
      setConfidenceScore(editingTrade.confidenceScore ?? editingTrade.psychology?.confidence ?? 7);
      setSelectedEmotions(editingTrade.emotions || editingTrade.psychology?.emotions || ['Calm']);
      setFearScore(editingTrade.fearScore ?? editingTrade.psychology?.fear ?? 2);
      setGreedScore(editingTrade.greedScore ?? editingTrade.psychology?.greed ?? 3);

      // Notes, Lessons & Improvement
      setNotesText(editingTrade.notesText || editingTrade.notes?.thesis || '');
      setLessonLearned(editingTrade.lessonLearned || editingTrade.notes?.lessonsLearned || '');
      setWhatCanIImprove(editingTrade.whatCanIImprove || editingTrade.notes?.whatCanIImprove || '');

      // Screenshot
      setChartScreenshot(
        editingTrade.chartScreenshot ||
        (editingTrade.screenshots && editingTrade.screenshots[0]?.url) ||
        null
      );
    } else {
      // Clean default initialization
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
      setTradeDate(new Date().toISOString().split('T')[0]);
      setSymbol('');
      setDirection('long');
      setProductType('Intraday');
      setAssetClass('equity');
      setStatus('closed');
      setEntryTime('09:30');
      setExitTime('15:15');

      setQuantity(1);
      setEntryPrice('');
      setExitPrice('');
      setAmountTraded('');
      setProfit(0);
      setLoss(0);
      setCharges(0);

      setStopLossPrice('');
      setTargetPrice('');
      setPlannedRRRatio('1:2');
      setPlannedRRNumber(2);
      setStrategy('');

      // Default checklist: all rules checked as followed by default
      const defaultChecks: Record<string, boolean> = {};
      availableRules.forEach((r) => {
        defaultChecks[r] = true;
      });
      setChecklistResponses(defaultChecks);

      setConfidenceScore(7);
      setSelectedEmotions(['Calm']);
      setFearScore(2);
      setGreedScore(3);

      setNotesText('');
      setLessonLearned('');
      setWhatCanIImprove('');
      setChartScreenshot(null);
      setValidationError(null);
    }
  }, [editingTrade, isOpen, accounts, availableRules]);

  // Keep valid accountId
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  // Automatically calculate Planned RR when entry, stop loss, and target prices are set
  useEffect(() => {
    const numEntry = Number(entryPrice);
    const numStop = Number(stopLossPrice);
    const numTarget = Number(targetPrice);

    if (numEntry > 0 && numStop > 0 && numTarget > 0 && numEntry !== numStop) {
      const riskPerUnit = Math.abs(numEntry - numStop);
      const rewardPerUnit = Math.abs(numTarget - numEntry);
      if (riskPerUnit > 0) {
        const calculatedRR = Number((rewardPerUnit / riskPerUnit).toFixed(2));
        setPlannedRRNumber(calculatedRR);
        setPlannedRRRatio(`1:${calculatedRR}`);
      }
    }
  }, [entryPrice, stopLossPrice, targetPrice, direction]);

  // Automatically calculate Amount Traded and Profit/Loss when entryPrice, exitPrice, and quantity are set
  useEffect(() => {
    const numEntry = Number(entryPrice);
    const numExit = Number(exitPrice);
    const numQty = Number(quantity);

    if (numEntry > 0 && numQty > 0) {
      const calculatedAmount = Number((numEntry * numQty).toFixed(2));
      // Only set amountTraded if user hasn't explicitly entered a different amount
      if (amountTraded === '' || amountTraded === 0) {
        setAmountTraded(calculatedAmount);
      }
    }

    if (numEntry > 0 && numExit > 0 && numQty > 0) {
      const diff = direction === 'long' ? numExit - numEntry : numEntry - numExit;
      const rawPnL = Number((diff * numQty).toFixed(2));
      if (rawPnL >= 0) {
        setProfit(rawPnL);
        setLoss(0);
      } else {
        setProfit(0);
        setLoss(Math.abs(rawPnL));
      }
    }
  }, [entryPrice, exitPrice, quantity, direction]);

  // Discipline score calculation (Section 1.C)
  const disciplineScore = useMemo(() => {
    const total = availableRules.length;
    if (total === 0) return 100;
    const followed = availableRules.filter((r) => checklistResponses[r] === true).length;
    return Math.round((followed / total) * 100);
  }, [availableRules, checklistResponses]);

  // Active Account (Section 17)
  const activeAccount = useMemo(() => {
    return accounts.find((a) => a.id === accountId) || accounts[0];
  }, [accounts, accountId]);

  // Today's Trades for Account (Section 2)
  const todayTradesForAccount = useMemo(() => {
    if (!trades) return [];
    const targetDate = tradeDate || new Date().toISOString().split('T')[0];
    return trades.filter((t) => {
      if (editingTrade && t.id === editingTrade.id) return false;
      const d = t.tradeDate || (t.entryDate ? t.entryDate.split('T')[0] : '');
      const accMatch = !t.accountId || t.accountId === (activeAccount?.id || '');
      return d === targetDate && accMatch;
    });
  }, [trades, tradeDate, activeAccount, editingTrade]);

  // Real-time Pre-Trade Risk Check (Section 2 & 6)
  const preTradeRisk = useMemo<PreTradeRiskCheckResult>(() => {
    return checkPreTradeRisk({
      trade: {
        entryPrice: entryPrice !== '' ? Number(entryPrice) : undefined,
        stopLossPrice: stopLossPrice !== '' ? Number(stopLossPrice) : undefined,
        targetPrice: targetPrice !== '' ? Number(targetPrice) : undefined,
        quantity: Number(quantity) || 1,
        amountTraded: amountTraded !== '' ? Number(amountTraded) : undefined,
        plannedRR: Number(plannedRRNumber) || undefined,
        entryTime: entryTime || undefined,
      },
      rules: tradingRules || DEFAULT_TRADING_RULES,
      account: activeAccount,
      todayTrades: todayTradesForAccount,
    });
  }, [
    entryPrice,
    stopLossPrice,
    targetPrice,
    quantity,
    amountTraded,
    plannedRRNumber,
    entryTime,
    tradingRules,
    activeAccount,
    todayTradesForAccount,
  ]);

  if (!isOpen) return null;

  // Numbers parsing
  const numProfit = profit === '' ? 0 : Math.max(0, Number(profit));
  const numLoss = loss === '' ? 0 : Math.max(0, Number(loss));
  const numCharges = charges === '' ? 0 : Math.max(0, Number(charges));
  const numAmount = amountTraded === '' ? 0 : Math.max(0, Number(amountTraded));

  const grossPnL = Number((numProfit - numLoss).toFixed(2));
  const netPnL = Number((grossPnL - numCharges).toFixed(2));
  const returnPct = numAmount > 0 ? Number(((netPnL / numAmount) * 100).toFixed(2)) : 0;

  // Image Upload handler (Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size should be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setChartScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleChecklistRule = (ruleTitle: string) => {
    setChecklistResponses((prev) => ({
      ...prev,
      [ruleTitle]: !prev[ruleTitle],
    }));
  };

  const toggleEmotion = (em: string) => {
    setSelectedEmotions((prev) => {
      if (prev.includes(em)) {
        return prev.length === 1 ? prev : prev.filter((e) => e !== em);
      } else {
        return [...prev, em];
      }
    });
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation (Section 15)
    if (numProfit > 0 && numLoss > 0) {
      setValidationError('Enter either a profit or a loss for this trade.');
      return;
    }

    if (!accountId) {
      setValidationError('Please select or create a trading account first.');
      return;
    }

    if (!symbol.trim()) {
      setValidationError('Please enter a valid Symbol (e.g. NIFTY, RELIANCE, BANKNIFTY).');
      return;
    }

    if (numAmount < 0) {
      setValidationError('Amount Traded must be greater than or equal to 0.');
      return;
    }

    if (confidenceScore < 1 || confidenceScore > 10) {
      setValidationError('Confidence score must be between 1 and 10.');
      return;
    }

    if (preTradeRisk.isStrictBlocked) {
      setValidationError(
        preTradeRisk.strictBlockReason ||
          'Strict Discipline Mode is active: New trade blocked by configured daily risk limits.'
      );
      return;
    }

    const targetAccount = accounts.find((a) => a.id === accountId);
    const currency = targetAccount ? targetAccount.baseCurrency : reportingCurrency;

    // Build ISO timestamps
    const entryIso = `${tradeDate}T${entryTime || '09:30'}:00.000Z`;
    const exitIso = `${tradeDate}T${exitTime || '15:15'}:00.000Z`;

    // Calculate Actual RR / Actual R Multiple
    let actualRR = 0;
    const resolvedRisk =
      stopLossPrice && entryPrice && Number(entryPrice) > 0
        ? Math.abs(Number(entryPrice) - Number(stopLossPrice)) * (Number(quantity) || 1)
        : numAmount * 0.01 || 1;

    if (resolvedRisk > 0 && netPnL !== 0) {
      actualRR = Number((netPnL / resolvedRisk).toFixed(2));
    }

    // Planned RR parsing
    let resolvedPlannedRR = typeof plannedRRNumber === 'number' ? plannedRRNumber : 2;
    if (plannedRRRatio) {
      const match = plannedRRRatio.match(/1\s*:\s*([\d.]+)/);
      if (match && match[1]) {
        resolvedPlannedRR = parseFloat(match[1]);
      }
    }

    const followedRulesCount = availableRules.filter((r) => checklistResponses[r] === true).length;

    // Screenshot attachments array
    const screenshotsList: ScreenshotAttachment[] = chartScreenshot
      ? [
          {
            id: `img_${Date.now()}`,
            url: chartScreenshot,
            caption: `${symbol.trim().toUpperCase()} Chart`,
            category: 'post_trade',
            createdAt: new Date().toISOString(),
          },
        ]
      : editingTrade?.screenshots || [];

    const tradeToSave: Trade = {
      id: editingTrade ? editingTrade.id : `trade_${Date.now()}`,
      userId: editingTrade ? editingTrade.userId : 'user_primary',
      accountId,
      symbol: symbol.trim().toUpperCase(),
      assetName: symbol.trim(),
      asset: symbol.trim().toUpperCase(),
      assetClass,
      direction,
      productType,
      status: numProfit > 0 || numLoss > 0 || numCharges > 0 ? 'closed' : status || 'closed',

      // Date & Times
      tradeDate,
      entryDate: entryIso,
      exitDate: exitIso,
      entryTime: entryTime || undefined,
      exitTime: exitTime || undefined,

      // Executions & Prices
      quantity: Number(quantity) || 1,
      entryPrice: entryPrice !== '' ? Number(entryPrice) : (numAmount > 0 ? numAmount : 1),
      exitPrice: exitPrice !== '' ? Number(exitPrice) : (numAmount > 0 ? numAmount + netPnL : 1 + netPnL),
      amountTraded: numAmount,
      amountInvested: numAmount,
      profit: numProfit,
      loss: numLoss,
      charges: numCharges,
      totalFees: numCharges,
      brokerage: numCharges,
      grossPnL,
      netPnL,
      pnlPercentage: returnPct,

      // Risk Management & Planned RR (Section 1.A)
      stopLossPrice: stopLossPrice !== '' ? Number(stopLossPrice) : undefined,
      targetPrice: targetPrice !== '' ? Number(targetPrice) : undefined,
      plannedRR: resolvedPlannedRR,
      plannedRRText: `1:${resolvedPlannedRR}`,
      actualRR,
      actualRMultiple: actualRR,

      // Strategy
      strategy: strategy.trim() ? strategy.trim() : undefined,
      strategyName: strategy.trim() ? strategy.trim() : undefined,

      // Discipline Checklist & Score (Section 1.B & 1.C)
      checklistResponses,
      rulesFollowedCount: followedRulesCount,
      rulesTotalCount: availableRules.length,
      disciplineScore,

      // Psychology & Emotions (Section 1.D & 1.E)
      confidenceScore,
      emotions: selectedEmotions,
      fearScore: fearScore !== '' ? Number(fearScore) : undefined,
      greedScore: greedScore !== '' ? Number(greedScore) : undefined,
      psychology: {
        confidence: confidenceScore,
        fear: fearScore !== '' ? Number(fearScore) : undefined,
        greed: greedScore !== '' ? Number(greedScore) : undefined,
        emotions: selectedEmotions,
      },

      // Notes, Lessons & Review (Section 1.F)
      notesText: notesText.trim() ? notesText.trim() : undefined,
      lessonLearned: lessonLearned.trim() ? lessonLearned.trim() : undefined,
      whatCanIImprove: whatCanIImprove.trim() ? whatCanIImprove.trim() : undefined,
      notes: {
        thesis: notesText.trim() || undefined,
        lessonsLearned: lessonLearned.trim() || undefined,
        whatCanIImprove: whatCanIImprove.trim() || undefined,
        mistakes: [],
      },

      // Chart Screenshot (Section 1.G)
      chartScreenshot: chartScreenshot || undefined,
      screenshots: screenshotsList,
      tags: selectedEmotions,

      // Multi-currency
      tradeCurrency: currency,
      reportingCurrency,
      fxRateUsed: 1,
      netPnLReporting: netPnL,

      // Behavioral Intelligence & Risk Management (Sections 2, 3, 4, 6)
      disciplineClassification: classifyTradeDiscipline(
        {
          id: editingTrade ? editingTrade.id : '',
          userId: 'user_primary',
          accountId,
          symbol: symbol.trim().toUpperCase(),
          assetClass,
          direction,
          productType,
          status: 'closed',
          entryDate: entryIso,
          entryPrice: entryPrice !== '' ? Number(entryPrice) : 1,
          netPnL,
          grossPnL,
          totalFees: numCharges,
          ruleViolations: preTradeRisk.warnings,
          behavioralTags: selectedBehavioralTags,
          disciplineScore,
        } as Trade,
        tradingRules
      ),
      behavioralTags: selectedBehavioralTags,
      ruleViolations: preTradeRisk.warnings,
      isRevengeTradeSuspected: preTradeRisk.possibleRevengePattern.isDetected,
      isRevengeTradeConfirmed,
      riskPctUsed: Number(preTradeRisk.riskPct.toFixed(1)),

      createdAt: editingTrade ? editingTrade.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveTrade(tradeToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-100">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{editingTrade ? 'Edit Trade Record' : 'Record New Trade'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  Manual Entry
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Log execution, planned R:R, rules followed, and psychological state.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs (Responsive Sectioning, Section 17) */}
        <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 text-xs font-semibold shrink-0">
          {[
            { id: 'details', label: '1. Trade & Symbol', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'risk', label: '2. Risk & Planned R:R', icon: <Target className="w-3.5 h-3.5 text-purple-500" /> },
            { id: 'discipline', label: `3. Rules & Checklist (${disciplineScore}%)`, icon: <Shield className="w-3.5 h-3.5 text-emerald-500" /> },
            { id: 'psychology', label: '4. Psychology & Emotions', icon: <Brain className="w-3.5 h-3.5 text-amber-500" /> },
            { id: 'review', label: '5. Notes & Screenshot', icon: <Camera className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {validationError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* TAB 1: TRADE & SYMBOL DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Account Selector */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Trading Account *
                </label>
                {accounts.length > 0 ? (
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.brokerName}) — Balance: {formatCurrency(acc.currentBalance, acc.baseCurrency)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg space-y-2">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      No Trading Account found. Create your primary account below:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Account Name"
                        value={newAccName}
                        onChange={(e) => setNewAccName(e.target.value)}
                        className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Broker (e.g. Zerodha)"
                        value={newAccBroker}
                        onChange={(e) => setNewAccBroker(e.target.value)}
                        className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (onSaveAccount && newAccName.trim()) {
                            const newAcc: TradingAccount = {
                              id: `acc_${Date.now()}`,
                              userId: 'user_primary',
                              name: newAccName.trim(),
                              brokerName: newAccBroker.trim() || 'Direct',
                              accountType: 'Live',
                              startingBalance: newAccStartingBalance || 100000,
                              currentBalance: newAccStartingBalance || 100000,
                              baseCurrency: reportingCurrency,
                              openingDate: tradeDate,
                              color: '#10b981',
                              isArchived: false,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            onSaveAccount(newAcc);
                            setAccountId(newAcc.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs"
                      >
                        Create Account
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Symbol, Side, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Symbol / Asset *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NIFTY, RELIANCE, AAPL"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Direction (Side) *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDirection('long')}
                      className={`py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                        direction === 'long'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Long / Buy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('short')}
                      className={`py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                        direction === 'short'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Short / Sell</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Trade Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                  />
                </div>
              </div>

              {/* Product Type, Asset Class, Times */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Product Type
                  </label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="Intraday">Intraday (MIS)</option>
                    <option value="Delivery">Delivery (CNC)</option>
                    <option value="Futures">Futures (NRML)</option>
                    <option value="Options">Options</option>
                    <option value="Margin">Margin / CFD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Asset Class
                  </label>
                  <select
                    value={assetClass}
                    onChange={(e) => setAssetClass(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="equity">Equity / Stocks</option>
                    <option value="futures">Futures</option>
                    <option value="options">Options</option>
                    <option value="forex">Forex</option>
                    <option value="crypto">Crypto</option>
                    <option value="commodity">Commodity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Entry Time
                  </label>
                  <input
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Exit Time
                  </label>
                  <input
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                  />
                </div>
              </div>

              {/* Strategy Selector */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Strategy / Playbook Setup
                </label>
                <div className="flex gap-2">
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="">— Select Strategy from Playbook —</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} (Min RR: 1:{s.minRR})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom setup…"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RISK, PRICES & PLANNED R:R (Section 1.A) */}
          {activeTab === 'risk' && (
            <div className="space-y-4">
              {/* Execution Prices & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Quantity / Lots *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2450.00"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Exit Price
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2510.00"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                  />
                </div>
              </div>

              {/* Stop Loss, Target Price, Planned RR */}
              <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 dark:text-purple-200 text-xs flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-purple-600" />
                    Planned Risk-to-Reward (RR) &amp; Levels
                  </span>
                  <span className="text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300">
                    Ratio: {plannedRRRatio}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                      Stop Loss Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2420.00"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                      Target Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2520.00"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                      Planned Risk-to-Reward (RR) *
                    </label>
                    <input
                      type="text"
                      placeholder="1:2, 1:3, 1:4"
                      value={plannedRRRatio}
                      onChange={(e) => {
                        setPlannedRRRatio(e.target.value);
                        const clean = e.target.value.replace('1:', '');
                        const num = parseFloat(clean);
                        if (!isNaN(num)) setPlannedRRNumber(num);
                      }}
                      className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono font-bold text-purple-700 dark:text-purple-300"
                    />
                  </div>
                </div>

                {/* Quick RR Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase mr-1">Quick Select:</span>
                  {['1:1.5', '1:2', '1:2.5', '1:3', '1:4'].map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => {
                        setPlannedRRRatio(ratio);
                        const num = parseFloat(ratio.replace('1:', ''));
                        if (!isNaN(num)) setPlannedRRNumber(num);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${
                        plannedRRRatio === ratio
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-purple-50'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Traded, Profit / Loss, Charges */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Total Capital Used
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 50000"
                    value={amountTraded}
                    onChange={(e) => setAmountTraded(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                    Profit (if positive)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={profit}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setProfit(val);
                      if (val !== '' && Number(val) > 0) setLoss(0);
                    }}
                    className="w-full p-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 font-mono text-emerald-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-rose-700 dark:text-rose-400 font-semibold mb-1">
                    Loss (if negative)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={loss}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setLoss(val);
                      if (val !== '' && Number(val) > 0) setProfit(0);
                    }}
                    className="w-full p-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 font-mono text-rose-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Brokerage &amp; Charges
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={charges}
                    onChange={(e) => setCharges(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-zinc-600"
                  />
                </div>
              </div>

              {/* Real-Time Net P&L Summary Strip */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Net Realized P&amp;L</span>
                  <span
                    className={`text-base font-bold ${
                      netPnL > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : netPnL < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {formatCurrency(netPnL, reportingCurrency, { showSign: true })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block uppercase">Return On Capital</span>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {returnPct > 0 ? '+' : ''}{returnPct}%
                  </span>
                </div>
              </div>

              {/* PRE-TRADE RISK & CAPITAL PRESERVATION CHECK (Section 2 & 6) */}
              <div
                className={`p-4 rounded-xl border space-y-3 transition-colors ${
                  preTradeRisk.isStrictBlocked
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                    : preTradeRisk.isWithinRules
                    ? 'border-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={`w-4 h-4 ${
                        preTradeRisk.isStrictBlocked
                          ? 'text-rose-600'
                          : preTradeRisk.isWithinRules
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    />
                    <span className="font-bold text-xs uppercase tracking-wider font-mono text-zinc-900 dark:text-zinc-100">
                      Pre-Trade Risk Check
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                      preTradeRisk.isStrictBlocked
                        ? 'bg-rose-600 text-white shadow-xs'
                        : preTradeRisk.isWithinRules
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {preTradeRisk.isStrictBlocked
                      ? 'Strict Mode Locked'
                      : preTradeRisk.isWithinRules
                      ? 'Within Rules'
                      : 'Rule Violation'}
                  </span>
                </div>

                {/* Risk Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] text-zinc-400 uppercase block">Account Capital</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(preTradeRisk.accountCapital, reportingCurrency)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] text-zinc-400 uppercase block">Risk Amount &amp; %</span>
                    <span
                      className={`font-bold ${
                        preTradeRisk.isRiskPctExceeded
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatCurrency(preTradeRisk.riskAmount, reportingCurrency)} ({preTradeRisk.riskPct.toFixed(1)}%)
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-normal">
                      Limit: {tradingRules.riskPerTradePct}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] text-zinc-400 uppercase block">Trades Today</span>
                    <span
                      className={`font-bold ${
                        preTradeRisk.isMaxTradesReached
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {preTradeRisk.tradesAlreadyTakenToday} / {tradingRules.oneTradeMode ? 1 : tradingRules.maxTradesPerDay}
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-normal">
                      {tradingRules.oneTradeMode ? 'One-Trade Mode' : 'Daily Allowance'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] text-zinc-400 uppercase block">Daily Loss Allowance</span>
                    <span
                      className={`font-bold ${
                        preTradeRisk.isDailyLossLimitReached
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {formatCurrency(preTradeRisk.remainingDailyLossAllowance, reportingCurrency)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-normal">
                      Max: -{formatCurrency(preTradeRisk.maxDailyLossAmount, reportingCurrency)} ({tradingRules.maxDailyLossPct}%)
                    </span>
                  </div>
                </div>

                {/* Warnings List */}
                {preTradeRisk.warnings.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-zinc-200/40 dark:border-zinc-800/40">
                    {preTradeRisk.warnings.map((warn, wIdx) => (
                      <div key={wIdx} className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Revenge Trading Detector (Section 6) */}
                {preTradeRisk.possibleRevengePattern.isDetected && !isRevengeDismissed && (
                  <div className="p-3 bg-red-100/70 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-lg space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Possible revenge-trading pattern detected
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRevengeTradeConfirmed(true);
                            if (!selectedBehavioralTags.includes('Revenge Trade')) {
                              setSelectedBehavioralTags((prev) => [...prev, 'Revenge Trade']);
                            }
                          }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRevengeDismissed(true)}
                          className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[10px]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-red-800 dark:text-red-300">
                      {preTradeRisk.possibleRevengePattern.reason}
                    </p>
                  </div>
                )}

                {/* Strict Mode Locked Alert */}
                {preTradeRisk.isStrictBlocked && (
                  <div className="p-2.5 bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{preTradeRisk.strictBlockReason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RULE FOLLOWED CHECKLIST & DISCIPLINE SCORE (Section 1.B & 1.C) */}
          {activeTab === 'discipline' && (
            <div className="space-y-4">
              {/* Discipline Score Indicator */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Trade Discipline Score
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Calculated automatically from followed rules. Checked rules represent adherence.
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono text-2xl font-black ${
                      disciplineScore >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : disciplineScore >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {disciplineScore}%
                  </span>
                  <span className="block text-[10px] font-mono text-zinc-400">
                    {availableRules.filter((r) => checklistResponses[r] === true).length} of {availableRules.length} followed
                  </span>
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 font-semibold">
                  <span>Tick rules that you followed for this trade:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        availableRules.forEach((r) => (all[r] = true));
                        setChecklistResponses(all);
                      }}
                      className="text-emerald-600 hover:underline"
                    >
                      Check All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const none: Record<string, boolean> = {};
                        availableRules.forEach((r) => (none[r] = false));
                        setChecklistResponses(none);
                      }}
                      className="text-zinc-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableRules.map((rule) => {
                    const isFollowed = checklistResponses[rule] === true;
                    return (
                      <label
                        key={rule}
                        onClick={() => toggleChecklistRule(rule)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all select-none ${
                          isFollowed
                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-zinc-900 dark:text-zinc-100 ring-1 ring-emerald-500/40'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 dark:text-zinc-500 opacity-80'
                        }`}
                      >
                        <span className="text-xs font-medium leading-snug">{rule}</span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                            isFollowed
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                          }`}
                        >
                          {isFollowed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PSYCHOLOGY, CONFIDENCE & EMOTIONS (Section 1.D & 1.E) */}
          {activeTab === 'psychology' && (
            <div className="space-y-4">
              {/* Trade Confidence Score 1-10 */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500" />
                    Trade Confidence Score (1–10) *
                  </label>
                  <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {confidenceScore} / 10
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                  <span>Low Confidence (1)</span>
                  <span>Moderate (5)</span>
                  <span>High Conviction (10)</span>
                </div>
                <div className="grid grid-cols-10 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setConfidenceScore(score)}
                      className={`py-2 rounded-lg font-mono font-bold text-xs transition-all ${
                        confidenceScore === score
                          ? 'bg-emerald-600 text-white shadow-md scale-105'
                          : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotional State Multi-Select */}
              <div className="space-y-2">
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
                  Emotional State During Trade
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOTION_OPTIONS.map((emo) => {
                    const isSelected = selectedEmotions.includes(emo.id);
                    return (
                      <button
                        key={emo.id}
                        type="button"
                        onClick={() => toggleEmotion(emo.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          isSelected
                            ? `${emo.color} ring-1 ring-current scale-105 shadow-xs`
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                        }`}
                      >
                        {emo.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fear & Greed Scores (1-10) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                      Fear Score (1–10)
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-600">
                      {fearScore || 'None'}
                    </span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFearScore(num)}
                        className={`py-1 rounded font-mono text-[11px] font-bold ${
                          fearScore === num
                            ? 'bg-amber-600 text-white'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                      Greed Score (1–10)
                    </span>
                    <span className="font-mono text-xs font-bold text-purple-600">
                      {greedScore || 'None'}
                    </span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGreedScore(num)}
                        className={`py-1 rounded font-mono text-[11px] font-bold ${
                          greedScore === num
                            ? 'bg-purple-600 text-white'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Structured Behavioral Tags (Section 4) */}
              <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
                    Behavioral Tags &amp; Execution Habits (Section 4)
                  </label>
                  {preTradeRisk.suggestedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBehavioralTags((prev) =>
                          Array.from(new Set([...prev, ...preTradeRisk.suggestedTags]))
                        );
                      }}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Apply {preTradeRisk.suggestedTags.length} Suggested Tag(s)
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ALL_BEHAVIORAL_TAGS.map((tag) => {
                    const isSelected = selectedBehavioralTags.includes(tag);
                    const isSuggested = preTradeRisk.suggestedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBehavioralTags((prev) => prev.filter((t) => t !== tag));
                          } else {
                            setSelectedBehavioralTags((prev) => [...prev, tag]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                            : isSuggested
                            ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NOTES, LESSONS, IMPROVEMENTS & SCREENSHOT (Section 1.F & 1.G) */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              {/* General Trade Notes */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Trade Thesis &amp; Notes
                </label>
                <textarea
                  rows={2}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Why did you take this trade? Context, price action, key levels..."
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 leading-relaxed"
                />
              </div>

              {/* Lesson Learned */}
              <div>
                <label className="block text-emerald-700 dark:text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Lesson Learned (Optional)
                </label>
                <textarea
                  rows={2}
                  value={lessonLearned}
                  onChange={(e) => setLessonLearned(e.target.value)}
                  placeholder="e.g. Waiting for confirmation would have prevented the early entry."
                  className="w-full p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10 leading-relaxed"
                />
              </div>

              {/* What Can I Improve? */}
              <div>
                <label className="block text-blue-700 dark:text-blue-400 font-semibold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  What Can I Improve? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={whatCanIImprove}
                  onChange={(e) => setWhatCanIImprove(e.target.value)}
                  placeholder="e.g. Do not enter before the breakout candle closes. Stick strictly to 1:2.5 RR."
                  className="w-full p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50/20 dark:bg-blue-950/10 leading-relaxed"
                />
              </div>

              {/* Chart Screenshot Upload (Optional) */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-zinc-500" />
                  Chart Screenshot (Optional)
                </label>
                {chartScreenshot ? (
                  <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden max-h-60 bg-black/5 flex items-center justify-center group">
                    <img
                      src={chartScreenshot}
                      alt="Trade Chart Preview"
                      className="max-h-60 w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setChartScreenshot(null)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 shadow-md"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors bg-zinc-50/50 dark:bg-zinc-950/30">
                    <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                      Click to upload chart screenshot
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-0.5">PNG, JPG or WEBP (Max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>

              {/* Status Pill */}
              <div
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold ${
                  preTradeRisk.isStrictBlocked
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : preTradeRisk.isWithinRules
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  {preTradeRisk.isStrictBlocked
                    ? 'Strict Mode Locked'
                    : preTradeRisk.isWithinRules
                    ? 'Within Rules'
                    : `${preTradeRisk.warnings.length} Violation(s)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab !== 'review' ? (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: ('details' | 'risk' | 'discipline' | 'psychology' | 'review')[] = [
                      'details',
                      'risk',
                      'discipline',
                      'psychology',
                      'review',
                    ];
                    const nextIdx = (tabs.indexOf(activeTab) + 1) % tabs.length;
                    setActiveTab(tabs[nextIdx]);
                  }}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Next Section →
                </button>
              ) : null}

              <button
                type="submit"
                disabled={preTradeRisk.isStrictBlocked}
                title={preTradeRisk.isStrictBlocked ? preTradeRisk.strictBlockReason : undefined}
                className={`px-5 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                  preTradeRisk.isStrictBlocked
                    ? 'bg-zinc-400 cursor-not-allowed opacity-60 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {preTradeRisk.isStrictBlocked
                    ? 'Strict Mode Locked'
                    : editingTrade
                    ? 'Update Trade'
                    : 'Save Trade Record'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
