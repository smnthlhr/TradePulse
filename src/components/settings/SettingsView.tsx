import React, { useState } from 'react';
import {
  Settings,
  User as UserIcon,
  DollarSign,
  Calendar,
  Shield,
  Trash2,
  RefreshCw,
  Check,
  CheckCircle2,
  Brain,
  Sliders,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  Key,
  LogOut,
  AlertTriangle,
  Mic,
  Volume2,
  Laptop,
  ShieldAlert,
} from 'lucide-react';
import { UserPreferences, CoachingStyle, TradingRulesSettings } from '../../types/trade';
import { SUPPORTED_CURRENCIES, DEFAULT_FX_RATES_TO_USD } from '../../utils/currency';
import { DEFAULT_TRADING_RULES } from '../../utils/behavioralRisk';
import { UserAvatar } from '../common/UserAvatar';

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
  onDeleteAccount: () => void;
  onSignOut: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  onUpdatePreferences,
  onResetSampleData,
  onClearAllData,
  onDeleteAccount,
  onSignOut,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'risk_rules' | 'ai' | 'account' | 'datetime' | 'currency' | 'appearance' | 'danger'
  >('risk_rules');

  // Form states
  const [name, setName] = useState(preferences.name || '');
  const [defaultCurrency, setDefaultCurrency] = useState(preferences.defaultCurrency || 'INR');
  const [timeZone, setTimeZone] = useState(preferences.timeZone || 'Asia/Kolkata');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(preferences.timeFormat || '12h');
  const [dateFormat, setDateFormat] = useState(preferences.dateFormat || 'YYYY-MM-DD');
  const [numberFormat, setNumberFormat] = useState(preferences.numberFormat || 'en-IN');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(preferences.theme || 'dark');
  const [privacyMode, setPrivacyMode] = useState(preferences.privacyMode || false);

  // Trading Rules & Risk Limits (Section 1)
  const initialRules = preferences.tradingRules || DEFAULT_TRADING_RULES;
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(initialRules.maxTradesPerDay ?? 3);
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(initialRules.riskPerTradePct ?? 1);
  const [maxDailyLossPct, setMaxDailyLossPct] = useState<number>(initialRules.maxDailyLossPct ?? 2);
  const [minPlannedRR, setMinPlannedRR] = useState<number>(initialRules.minPlannedRR ?? 2);
  const [maxConsecutiveLosses, setMaxConsecutiveLosses] = useState<number>(initialRules.maxConsecutiveLosses ?? 2);
  const [stopTradingAfterDailyLoss, setStopTradingAfterDailyLoss] = useState<boolean>(
    initialRules.stopTradingAfterDailyLoss ?? true
  );
  const [allowedTradingHoursStart, setAllowedTradingHoursStart] = useState<string>(
    initialRules.allowedTradingHoursStart || '09:15'
  );
  const [allowedTradingHoursEnd, setAllowedTradingHoursEnd] = useState<string>(
    initialRules.allowedTradingHoursEnd || '15:30'
  );
  const [stopAfterLossesRuleEnabled, setStopAfterLossesRuleEnabled] = useState<boolean>(
    initialRules.stopAfterLossesRuleEnabled ?? true
  );
  const [oneTradeMode, setOneTradeMode] = useState<boolean>(initialRules.oneTradeMode ?? false);
  const [strictDisciplineMode, setStrictDisciplineMode] = useState<boolean>(
    initialRules.strictDisciplineMode ?? false
  );

  // AI settings
  const [aiProvider, setAiProvider] = useState<'builtin' | 'byok'>(preferences.aiProvider || 'builtin');
  const [byokInputKey, setByokInputKey] = useState('');
  const [byokStatus, setByokStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [byokErrorMsg, setByokErrorMsg] = useState('');
  const [coachingStyle, setCoachingStyle] = useState<CoachingStyle>(preferences.coachingStyle || 'balanced');
  const [aiMemoryEnabled, setAiMemoryEnabled] = useState(preferences.aiMemoryEnabled ?? true);
  const [screenshotAnalysisEnabled, setScreenshotAnalysisEnabled] = useState(
    preferences.screenshotAnalysisEnabled ?? true
  );
  const [chatHistoryEnabled, setChatHistoryEnabled] = useState(preferences.chatHistoryEnabled ?? true);

  // Voice Settings (Sections 42-47)
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(preferences.voiceModeEnabled ?? true);
  const [autoTranscript, setAutoTranscript] = useState(preferences.autoTranscript ?? true);
  const [selectedVoice, setSelectedVoice] = useState<'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir'>(
    preferences.selectedVoice || 'Zephyr'
  );
  const [voiceLanguage, setVoiceLanguage] = useState<'en' | 'hi' | 'bn' | 'ta'>(
    preferences.voiceLanguage || 'en'
  );
  const [spokenDetail, setSpokenDetail] = useState<'short' | 'normal' | 'detailed'>(
    preferences.spokenDetail || 'normal'
  );
  const [testingVoice, setTestingVoice] = useState<string | null>(null);

  const [savedNotice, setSavedNotice] = useState(false);

  // Test Voice TTS Audio Sample
  const handleTestVoice = async (voiceName: string) => {
    try {
      setTestingVoice(voiceName);
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `TradePulse Coach activated in the ${voiceName} voice profile. Standing by for trade executions.`,
          voiceName,
          byokKey: byokStatus === 'connected' ? byokInputKey : undefined,
        }),
      });
      const data = await res.json();
      if (data.audio) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audio.onended = () => setTestingVoice(null);
        audio.onerror = () => setTestingVoice(null);
        await audio.play();
      } else {
        setTestingVoice(null);
      }
    } catch {
      setTestingVoice(null);
    }
  };

  // Test BYOK key connection (Section 3)
  const handleTestByokKey = async () => {
    if (!byokInputKey.trim()) return;
    setByokStatus('testing');
    setByokErrorMsg('');

    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: byokInputKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setByokStatus('connected');
        onUpdatePreferences({ hasByokKey: true, aiProvider: 'byok' });
      } else {
        setByokStatus('error');
        setByokErrorMsg(data.error || 'Connection test failed.');
      }
    } catch {
      setByokStatus('error');
      setByokErrorMsg('Failed to reach server test endpoint.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePreferences({
      name,
      defaultCurrency,
      timeZone,
      timeFormat,
      dateFormat,
      numberFormat,
      theme,
      privacyMode,
      aiProvider,
      coachingStyle,
      aiMemoryEnabled,
      screenshotAnalysisEnabled,
      chatHistoryEnabled,
      voiceModeEnabled,
      autoTranscript,
      selectedVoice,
      voiceLanguage,
      spokenDetail,
      tradingRules: {
        maxTradesPerDay: Number(maxTradesPerDay) || 3,
        riskPerTradePct: Number(riskPerTradePct) || 1,
        maxDailyLossPct: Number(maxDailyLossPct) || 2,
        minPlannedRR: Number(minPlannedRR) || 2,
        maxConsecutiveLosses: Number(maxConsecutiveLosses) || 2,
        stopTradingAfterDailyLoss,
        allowedTradingHoursStart,
        allowedTradingHoursEnd,
        stopAfterLossesRuleEnabled,
        oneTradeMode,
        strictDisciplineMode,
      },
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Settings Navigation Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Platform Settings &amp; AI Configuration
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure Google account, Gemini AI Coach integration, timezones, and regional formats.
          </p>
        </div>

        {savedNotice && (
          <div className="p-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-md text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" /> Preferences saved
          </div>
        )}
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium">
        {[
          { id: 'risk_rules', label: 'Trading Rules & Risk Limits', icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> },
          { id: 'ai', label: 'AI Trading Coach', icon: <Brain className="w-3.5 h-3.5 text-purple-500" /> },
          { id: 'account', label: 'Google Account', icon: <UserIcon className="w-3.5 h-3.5" /> },
          { id: 'datetime', label: 'Date & Timezone', icon: <Clock className="w-3.5 h-3.5" /> },
          { id: 'currency', label: 'Currency & FX', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: 'appearance', label: 'Appearance', icon: <Sliders className="w-3.5 h-3.5" /> },
          { id: 'danger', label: 'Data & Reset', icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg border flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeCategory === tab.id
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TRADING RULES & RISK LIMITS SETTINGS (Section 1) */}
        {activeCategory === 'risk_rules' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-6 text-xs">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Trading Rules &amp; Risk Limits
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setMaxTradesPerDay(DEFAULT_TRADING_RULES.maxTradesPerDay);
                    setRiskPerTradePct(DEFAULT_TRADING_RULES.riskPerTradePct);
                    setMaxDailyLossPct(DEFAULT_TRADING_RULES.maxDailyLossPct);
                    setMinPlannedRR(DEFAULT_TRADING_RULES.minPlannedRR);
                    setMaxConsecutiveLosses(DEFAULT_TRADING_RULES.maxConsecutiveLosses);
                    setStopTradingAfterDailyLoss(DEFAULT_TRADING_RULES.stopTradingAfterDailyLoss);
                    setAllowedTradingHoursStart(DEFAULT_TRADING_RULES.allowedTradingHoursStart || '09:15');
                    setAllowedTradingHoursEnd(DEFAULT_TRADING_RULES.allowedTradingHoursEnd || '15:30');
                    setStopAfterLossesRuleEnabled(DEFAULT_TRADING_RULES.stopAfterLossesRuleEnabled);
                    setOneTradeMode(DEFAULT_TRADING_RULES.oneTradeMode);
                    setStrictDisciplineMode(DEFAULT_TRADING_RULES.strictDisciplineMode);
                  }}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Reset Defaults
                </button>
              </div>
              <p className="text-zinc-500">
                Define the core capital preservation rules and behavioral circuit breakers for your trading journey.
              </p>
            </div>

            {/* Core Limits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Max Trades Per Day */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Max Trades Per Day
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxTradesPerDay}
                    onChange={(e) => setMaxTradesPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 p-2 text-xs font-mono font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                  <span className="text-[11px] text-zinc-500">trades / day (Default: 3)</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Prevents overtrading. Subsequent trades are flagged as violations.
                </p>
              </div>

              {/* Risk % Per Trade */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Risk Per Trade (% of Capital)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={10}
                    value={riskPerTradePct}
                    onChange={(e) => setRiskPerTradePct(Math.max(0.1, parseFloat(e.target.value) || 1))}
                    className="w-24 p-2 text-xs font-mono font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                  <span className="text-[11px] text-zinc-500">% of account balance (Default: 1%)</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Maximum risk permitted on any individual trade execution.
                </p>
              </div>

              {/* Max Daily Loss % */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Max Daily Loss (% of Capital)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.25"
                    min={0.5}
                    max={15}
                    value={maxDailyLossPct}
                    onChange={(e) => setMaxDailyLossPct(Math.max(0.5, parseFloat(e.target.value) || 2))}
                    className="w-24 p-2 text-xs font-mono font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                  <span className="text-[11px] text-zinc-500">% daily circuit breaker (Default: 2%)</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Stops capital hemorrhaging when the market environment is unfavourable.
                </p>
              </div>

              {/* Minimum Planned RR */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Minimum Planned Risk-to-Reward
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-zinc-500">1:</span>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={10}
                    value={minPlannedRR}
                    onChange={(e) => setMinPlannedRR(Math.max(1, parseFloat(e.target.value) || 2))}
                    className="w-20 p-2 text-xs font-mono font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                  <span className="text-[11px] text-zinc-500">minimum target ratio (Default: 1:2)</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Disqualifies low-expectancy setups with poor reward profiles.
                </p>
              </div>

              {/* Max Consecutive Losses */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Max Consecutive Losses Before Warning
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={maxConsecutiveLosses}
                    onChange={(e) => setMaxConsecutiveLosses(Math.max(1, parseInt(e.target.value) || 2))}
                    className="w-24 p-2 text-xs font-mono font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                  <span className="text-[11px] text-zinc-500">losses in a row (Default: 2)</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Triggers revenge trading warnings and cooldown breaks.
                </p>
              </div>

              {/* Allowed Trading Hours */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Permitted Trading Hours
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={allowedTradingHoursStart}
                    onChange={(e) => setAllowedTradingHoursStart(e.target.value)}
                    className="p-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                  <span className="text-zinc-400">to</span>
                  <input
                    type="time"
                    value={allowedTradingHoursEnd}
                    onChange={(e) => setAllowedTradingHoursEnd(e.target.value)}
                    className="p-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                </div>
                <p className="text-[10px] text-zinc-400">
                  Prevents trading during low-liquidity or erratic chop hours.
                </p>
              </div>
            </div>

            {/* Circuit Breakers & Strict Modes */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <span className="font-bold text-xs uppercase tracking-wider font-mono text-zinc-500 block">
                Circuit Breakers &amp; Discipline Modes
              </span>

              {/* Stop Trading After Daily Loss Limit */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={stopTradingAfterDailyLoss}
                  onChange={(e) => setStopTradingAfterDailyLoss(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 border-zinc-300 focus:ring-rose-500"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Daily Loss Circuit Breaker (Enabled by default)
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Triggers a high-priority warning across the dashboard, ledger, and trade entry modal once your daily loss limit is hit.
                  </p>
                </div>
              </label>

              {/* Stop After Losses Rule */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={stopAfterLossesRuleEnabled}
                  onChange={(e) => setStopAfterLossesRuleEnabled(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 border-zinc-300 focus:ring-rose-500"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Consecutive Loss Cooldown Enforcer
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Flags warning and revenge patterns if trading continues immediately after {maxConsecutiveLosses} consecutive losses.
                  </p>
                </div>
              </label>

              {/* One-Trade Mode */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={oneTradeMode}
                  onChange={(e) => setOneTradeMode(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 border-zinc-300 focus:ring-purple-500"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    One-Trade Mode ("One Good Trade Per Day")
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Restricts your trading plan to 1 high-conviction trade per day. Perfect for eliminating overtrading.
                  </p>
                </div>
              </label>

              {/* Strict Discipline Mode */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={strictDisciplineMode}
                  onChange={(e) => setStrictDisciplineMode(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 border-zinc-300 focus:ring-rose-500"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-700 dark:text-rose-400 block">
                      Strict Discipline Mode (Hard Gate)
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold">
                      ENFORCED
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    When enabled, the application physically prevents saving a new planned trade once a hard daily loss or trade limit is breached. You can still review past trades, write journal notes, and use AI Coach.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors"
              >
                Save Trading Rules &amp; Limits
              </button>
            </div>
          </div>
        )}

        {/* 1. AI TRADING COACH SETTINGS (Sections 2, 3, 14, 15, 50) */}
        {activeCategory === 'ai' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-5 text-xs">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-purple-500" />
                Gemini AI Engine Configuration
              </h4>
              <p className="text-zinc-500">
                Choose between the platform's Built-In AI or Connect your own Gemini API key (BYOK) from Google AI Studio.
              </p>
            </div>

            {/* Provider Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border cursor-pointer space-y-2 transition-all ${
                  aiProvider === 'builtin'
                    ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Use Built-In AI Coach (Default)</span>
                  <input
                    type="radio"
                    name="aiProvider"
                    checked={aiProvider === 'builtin'}
                    onChange={() => setAiProvider('builtin')}
                    className="accent-purple-600"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Zero setup required. Powered securely by server-side Gemini 3.8 Flash credentials without exposing keys.
                </p>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer space-y-2 transition-all ${
                  aiProvider === 'byok'
                    ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Connect My Gemini API (BYOK)</span>
                  <input
                    type="radio"
                    name="aiProvider"
                    checked={aiProvider === 'byok'}
                    onChange={() => setAiProvider('byok')}
                    className="accent-purple-600"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Use your own Google AI Studio project key. Tested and stored server-side.
                </p>
              </label>
            </div>

            {/* BYOK Key Connection Setup Box */}
            {aiProvider === 'byok' && (
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                  Connect Google AI Studio Key
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Paste Gemini API credential (starts with AIza...)"
                    value={byokInputKey}
                    onChange={(e) => setByokInputKey(e.target.value)}
                    className="flex-1 p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleTestByokKey}
                    disabled={byokStatus === 'testing' || !byokInputKey.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded disabled:opacity-50"
                  >
                    {byokStatus === 'testing' ? 'Testing…' : 'Test Connection'}
                  </button>
                </div>

                {byokStatus === 'connected' && (
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4" /> ✓ Gemini Connected Successfully!
                  </div>
                )}
                {byokStatus === 'error' && (
                  <div className="text-rose-600 dark:text-rose-400 font-semibold text-xs">
                    ✕ {byokErrorMsg}
                  </div>
                )}
              </div>
            )}

            {/* Coaching Persona & Style (Section 15) */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
                Coaching Style Persona
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'balanced', label: 'Balanced', desc: 'Constructive and objective' },
                  { id: 'strict', label: 'Strict Discipline', desc: 'Direct, zero tolerance for rule breaches' },
                  { id: 'analytical', label: 'Analytical Quant', desc: 'Heavy R-multiple and probability focus' },
                  { id: 'concise', label: 'Concise', desc: 'Short, punchy bullet points' },
                  { id: 'detailed', label: 'Detailed Deep Dive', desc: 'Thorough thesis and market structure review' },
                  { id: 'encouraging', label: 'Encouraging', desc: 'Empathetic and positive reinforcement' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCoachingStyle(s.id as CoachingStyle)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      coachingStyle === s.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="block">{s.label}</span>
                    <span className="text-[10px] opacity-75 font-normal">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Data Privacy Controls (Section 50) */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                AI Memory &amp; Privacy Controls
              </span>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                  <span>Enable Coach Memory (remembers rules &amp; recurring mistakes)</span>
                  <input
                    type="checkbox"
                    checked={aiMemoryEnabled}
                    onChange={(e) => setAiMemoryEnabled(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                  <span>Allow Multimodal Chart Screenshot Analysis</span>
                  <input
                    type="checkbox"
                    checked={screenshotAnalysisEnabled}
                    onChange={(e) => setScreenshotAnalysisEnabled(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                  <span>Save AI Conversation History</span>
                  <input
                    type="checkbox"
                    checked={chatHistoryEnabled}
                    onChange={(e) => setChatHistoryEnabled(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                </label>
              </div>
            </div>

            {/* AI Voice Assistant & Live Audio (Sections 42-47) */}
            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-1">
                  <Mic className="w-4 h-4 text-emerald-500" />
                  Live Voice Assistant &amp; Audio Persona (Gemini Live)
                </h4>
                <p className="text-zinc-500 text-[11px]">
                  Real-time conversational voice interaction, automated post-trade audio feedback, and speech-to-text.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Enable Voice Interaction</span>
                    <span className="text-[11px] text-zinc-500">
                      Activates the floating live voice coach orb with real-time speech synthesis.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceModeEnabled}
                    onChange={(e) => setVoiceModeEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Live Scrolling Transcript</span>
                    <span className="text-[11px] text-zinc-500">
                      Displays rolling verbatim text transcript alongside spoken audio.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoTranscript}
                    onChange={(e) => setAutoTranscript(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                </label>
              </div>

              {/* Voice Personas */}
              <div className="space-y-2 pt-2">
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
                  Select AI Voice Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[
                    { id: 'Zephyr', label: 'Zephyr (Default)', desc: 'Articulate, confident & balanced' },
                    { id: 'Kore', label: 'Kore', desc: 'Calm, steady & analytical' },
                    { id: 'Puck', label: 'Puck', desc: 'Crisp, energetic & punchy' },
                    { id: 'Charon', label: 'Charon', desc: 'Deep, firm & authoritative' },
                    { id: 'Fenrir', label: 'Fenrir', desc: 'Bold, direct & high-tempo' },
                  ].map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        selectedVoice === v.id
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{v.label}</span>
                        {selectedVoice === v.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 leading-relaxed">{v.desc}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestVoice(v.id);
                        }}
                        disabled={testingVoice === v.id}
                        className="mt-auto px-2 py-1 text-[11px] font-medium rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 flex items-center justify-center gap-1.5 text-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        <Volume2 className="w-3 h-3 text-emerald-500" />
                        <span>{testingVoice === v.id ? 'Playing…' : 'Preview Voice'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Language Selector */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
                    Voice &amp; AI Language
                  </label>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Speech recognition &amp; audio synthesis
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'en', label: 'English', native: 'English', desc: 'US / Global' },
                    { id: 'hi', label: 'Hindi', native: 'हिन्दी', desc: 'Indian Trading' },
                    { id: 'bn', label: 'Bengali', native: 'বাংলা', desc: 'Indian / Regional' },
                    { id: 'ta', label: 'Tamil', native: 'தமிழ்', desc: 'Indian / Regional' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setVoiceLanguage(lang.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        voiceLanguage === lang.id
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs">{lang.label}</span>
                        {voiceLanguage === lang.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <span className="text-sm font-semibold block text-zinc-900 dark:text-zinc-100">
                        {lang.native}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5 block">{lang.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spoken Detail Level */}
              <div className="space-y-2 pt-2">
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
                  Spoken Response Detail Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'short', label: 'Short & Punchy', desc: '1–2 sentences for rapid trading' },
                    { id: 'normal', label: 'Balanced (Standard)', desc: 'Concise summary with key metric' },
                    { id: 'detailed', label: 'Detailed Debrief', desc: 'Comprehensive behavioral review' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSpokenDetail(lvl.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        spokenDetail === lvl.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">{lvl.label}</span>
                      <span className="text-[10px] opacity-75 font-normal">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. GOOGLE ACCOUNT SETTINGS (Section 1 & 53) */}
        {activeCategory === 'account' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4 text-xs">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-500" />
              Authenticated Google Profile
            </h4>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800">
              <UserAvatar name={name || preferences.name} avatarUrl={preferences.avatarUrl} size="xl" className="border-2 border-emerald-500" />
              <div>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block">{name}</span>
                <span className="text-zinc-400 font-mono">{preferences.email}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold block w-fit mt-1">
                  Google Authenticated
                </span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Trader Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onSignOut}
                className="px-3.5 py-2 font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* 3. DATE & TIME SETTINGS (Section 33) */}
        {activeCategory === 'datetime' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4 text-xs">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Real-Time Clock &amp; Timezone Service
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Trading Session Timezone *
                </label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST · UTC+5:30)</option>
                  <option value="America/New_York">America/New_York (EST/EDT · UTC-5)</option>
                  <option value="Europe/London">Europe/London (GMT/BST · UTC+0)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT · UTC+8)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST · UTC+10)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Clock Time Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeFormat('12h')}
                    className={`p-2 rounded border font-semibold ${
                      timeFormat === '12h' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600' : 'border-zinc-300'
                    }`}
                  >
                    12-Hour (11:35 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFormat('24h')}
                    className={`p-2 rounded border font-semibold ${
                      timeFormat === '24h' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600' : 'border-zinc-300'
                    }`}
                  >
                    24-Hour (23:35)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                Calendar &amp; Ledger Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian / UK)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
              </select>
            </div>
          </div>
        )}

        {/* 4. CURRENCY & FX SETTINGS (Section 34) */}
        {activeCategory === 'currency' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4 text-xs">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Currency &amp; Reporting Formatting
            </h4>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                Global Portfolio Reporting Currency *
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                Number Grouping Format
              </label>
              <select
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value as any)}
                className="w-full p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              >
                <option value="en-IN">Indian Format (₹1,00,000.00)</option>
                <option value="en-US">US / Standard International ($100,000.00)</option>
                <option value="de-DE">European Format (100.000,00 €)</option>
              </select>
            </div>
          </div>
        )}

        {/* 5. APPEARANCE & PRIVACY (Section 35 & 37) */}
        {activeCategory === 'appearance' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4 text-xs">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              Appearance &amp; Privacy Mode
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-lg border font-semibold text-center transition-all ${
                  theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span className="block text-xs font-bold">Dark Mode</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Pro Institutional</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-lg border font-semibold text-center transition-all ${
                  theme === 'light'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span className="block text-xs font-bold">Light Mode</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Clean Paper</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-3 rounded-lg border font-semibold text-center transition-all ${
                  theme === 'system'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span className="block text-xs font-bold">System Default</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Auto sync with OS</span>
              </button>
            </div>

            <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Privacy Mode (Mask Balances)</span>
                <span className="text-[11px] text-zinc-500">
                  Hides monetary amounts (e.g. ₹42,350 → ••••••) for screen sharing and recording.
                </span>
              </div>
              <input
                type="checkbox"
                checked={privacyMode}
                onChange={(e) => setPrivacyMode(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600"
              />
            </label>
          </div>
        )}

        {/* 6. DANGER ZONE & DELETE ACCOUNT (Section 64) */}
        {activeCategory === 'danger' && (
          <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-950/60 rounded-xl p-5 shadow-xs space-y-4 text-xs">
            <div>
              <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4" />
                Data Purge &amp; Delete Account
              </h4>
              <p className="text-zinc-500">
                Permanent actions regarding local storage records, demo seeds, and application account credentials.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
              <span className="font-bold text-rose-800 dark:text-rose-200 block">
                Delete Account &amp; All Associated Data (Section 64)
              </span>
              <p className="text-rose-700 dark:text-rose-300 leading-relaxed text-[11px]">
                Deleting your account will irreversibly remove: all recorded trades, screenshots, accounts, transactions, AI conversations, coach profile memory, and settings.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('PERMANENT ACTION: Are you sure you want to completely delete your account and all data?')) {
                    onDeleteAccount();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded"
              >
                Permanently Delete Account
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={onResetSampleData}
                className="px-3.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50"
              >
                Reload Sample Demo Data
              </button>
              <button
                type="button"
                onClick={onClearAllData}
                className="px-3.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 text-rose-600"
              >
                Clear Local Workspace
              </button>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs text-xs"
          >
            Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
};
