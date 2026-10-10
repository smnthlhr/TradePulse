import React, { useState } from 'react';
import {
  TrendingUp,
  Check,
  ArrowRight,
  Shield,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UserPreferences, AssetClass } from '../../types/trade';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (prefs: Partial<UserPreferences>) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedAssets, setSelectedAssets] = useState<AssetClass[]>(['equity', 'futures', 'options']);
  const [selectedStyles, setSelectedStyles] = useState<
    ('Day trading' | 'Scalping' | 'Swing trading' | 'Position trading' | 'Multiple styles')[]
  >(['Day trading', 'Swing trading']);

  if (!isOpen) return null;

  const handleFinish = () => {
    onComplete({
      name: name.trim() || 'Trader',
      defaultCurrency: currency,
      theme,
      tradingProfile: {
        assetClasses: selectedAssets,
        primaryStyles: selectedStyles,
      },
      onboardingCompleted: true,
    });
  };

  const toggleAsset = (asset: AssetClass) => {
    if (selectedAssets.includes(asset)) {
      setSelectedAssets(selectedAssets.filter((a) => a !== asset));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  const toggleStyle = (style: any) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl p-6 sm:p-8 space-y-6 text-zinc-900 dark:text-zinc-100 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Brand Kicker */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight block">Welcome to TradePulse</span>
            <span className="text-xs text-zinc-400">Professional Trading Journal &amp; Trade Ledger</span>
          </div>
        </div>

        {/* Step 1: Preferences */}
        {step === 1 ? (
          <div className="space-y-5 text-xs">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                Step 1: Personal Preferences
              </h3>
              <p className="text-zinc-500">
                Configure your display name, base reporting currency, and visual environment.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Somnath"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Default Reporting Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-lg border text-left font-semibold ${
                      theme === 'dark'
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Dark Theme (Pro)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-lg border text-left font-semibold ${
                      theme === 'light'
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    Light Theme
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Trading Profile & Disclaimer */
          <div className="space-y-5 text-xs">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                Step 2: Trading Profile &amp; Focus
              </h3>
              <p className="text-zinc-500">
                Help customise your trade ledger categories and playbook metrics.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-2">
                  Instruments / Asset Classes You Trade
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'equity', label: 'Stocks / Equities' },
                    { id: 'futures', label: 'Futures' },
                    { id: 'options', label: 'Options' },
                    { id: 'forex', label: 'Forex' },
                    { id: 'crypto', label: 'Crypto' },
                    { id: 'commodity', label: 'Commodities' },
                    { id: 'index', label: 'Indices' },
                  ].map((asset) => {
                    const isSelected = selectedAssets.includes(asset.id as AssetClass);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleAsset(asset.id as AssetClass)}
                        className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {asset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-2">
                  Primary Trading Style
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Day trading', 'Scalping', 'Swing trading', 'Position trading', 'Multiple styles'].map((st) => {
                    const isSelected = selectedStyles.includes(st as any);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleStyle(st)}
                        className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
                <strong>Important Notice:</strong> TradePulse is strictly an analytical performance journal and trade ledger. It does not provide financial or investment advice.
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-300"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Launch My Journal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
