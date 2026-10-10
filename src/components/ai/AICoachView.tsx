import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Send,
  Plus,
  Trash2,
  Search,
  MessageSquare,
  Sparkles,
  Camera,
  AlertTriangle,
  Award,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import {
  Trade,
  TradingAccount,
  Strategy,
  PersonalRule,
  DailyJournalEntry,
  User,
  AIChatConversation,
  AIChatMessage,
} from '../../types/trade';
import { PortfolioStatistics } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';

interface AICoachViewProps {
  user: User | null;
  trades: Trade[];
  accounts: TradingAccount[];
  strategies: Strategy[];
  rules: PersonalRule[];
  dailyJournals: DailyJournalEntry[];
  stats: PortfolioStatistics;
  reportingCurrency: string;
  onViewTrade?: (trade: Trade) => void;
}

const SUGGESTED_PROMPTS = [
  { label: 'Review My Trading', text: 'Review my overall trading performance this month.' },
  { label: 'Analyse My Losses', text: 'Why am I losing money on losing trades?' },
  { label: 'Find Costly Mistakes', text: 'What mistakes are costing me the most capital?' },
  { label: 'Strategy Playbook Edge', text: 'Which strategy performs best for me mathematically?' },
  { label: 'Process Discipline', text: 'Am I following my trading rules and checklists?' },
  { label: 'Overtrading Pattern', text: 'Do I perform worse after taking multiple trades in a single day?' },
  { label: 'Psychology & Emotions', text: 'Which emotions are associated with my biggest drawdowns?' },
  { label: 'Top 3 Improvements', text: 'What are the three most important things I should improve?' },
];

export const AICoachView: React.FC<AICoachViewProps> = ({
  user,
  trades,
  accounts,
  strategies,
  rules,
  dailyJournals,
  stats,
  reportingCurrency,
  onViewTrade,
}) => {
  // Chat Conversations State
  const [conversations, setConversations] = useState<AIChatConversation[]>(() => {
    try {
      const stored = localStorage.getItem(`tradepulse_ai_conversations_${user?.id || 'user_primary'}`);
      return stored
        ? JSON.parse(stored)
        : [
            {
              id: 'conv_default',
              userId: user?.id || 'user_primary',
              title: 'Monthly Performance & Behavioral Audit',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
    } catch {
      return [];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string>(
    conversations[0]?.id || 'conv_default'
  );

  // Chat Messages State
  const [messages, setMessages] = useState<Record<string, AIChatMessage[]>>(() => {
    try {
      const stored = localStorage.getItem(`tradepulse_ai_messages_${user?.id || 'user_primary'}`);
      return stored
        ? JSON.parse(stored)
        : {
            conv_default: [
              {
                id: 'msg_welcome',
                conversationId: 'conv_default',
                role: 'assistant',
                content: `Hello ${user?.name || 'Trader'}, I am your personal AI Trading Coach. I analyze your actual trade ledger, executions, risk-to-reward ratios, playbook checklists, and emotional journals to help you build institutional-grade process discipline.\n\nAsk me anything about your recorded performance, or select a suggested prompt below.`,
                timestamp: new Date().toISOString(),
              },
            ],
          };
    } catch {
      return {};
    }
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Reviewing trades…');
  const [searchQuery, setSearchQuery] = useState('');

  // Language state (persisted per user)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'bn' | 'ta'>(() => {
    try {
      const stored = localStorage.getItem(`tradepulse_ai_lang_${user?.id || 'user_primary'}`);
      if (stored && ['en', 'hi', 'bn', 'ta'].includes(stored)) {
        return stored as 'en' | 'hi' | 'bn' | 'ta';
      }
    } catch {}
    return user?.preferences?.voiceLanguage || 'en';
  });

  const handleLanguageChange = (newLang: 'en' | 'hi' | 'bn' | 'ta') => {
    setSelectedLanguage(newLang);
    try {
      localStorage.setItem(`tradepulse_ai_lang_${user?.id || 'user_primary'}`, newLang);
    } catch {}
  };
  // Mode selections: Loss Review or Win Review
  const [selectedTradeForReview, setSelectedTradeForReview] = useState<Trade | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist conversations
  useEffect(() => {
    const userId = user?.id || 'user_primary';
    localStorage.setItem(`tradepulse_ai_conversations_${userId}`, JSON.stringify(conversations));
  }, [conversations, user]);

  // Persist messages
  useEffect(() => {
    const userId = user?.id || 'user_primary';
    localStorage.setItem(`tradepulse_ai_messages_${userId}`, JSON.stringify(messages));
  }, [messages, user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId, isLoading]);

  const currentMessages = messages[activeConversationId] || [];

  // Start new conversation
  const handleStartNewChat = () => {
    const newId = `conv_${Date.now()}`;
    const newConv: AIChatConversation = {
      id: newId,
      userId: user?.id || 'user_primary',
      title: 'New Coaching Session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations([newConv, ...conversations]);
    setActiveConversationId(newId);
    setMessages({
      ...messages,
      [newId]: [
        {
          id: `msg_${Date.now()}`,
          conversationId: newId,
          role: 'assistant',
          content: 'New session started. What would you like to review from your journal today?',
          timestamp: new Date().toISOString(),
        },
      ],
    });
  };

  // Delete conversation
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    if (activeConversationId === id && filtered.length > 0) {
      setActiveConversationId(filtered[0].id);
    }
  };

  // Build structured journal context for the backend
  const buildJournalContext = () => {
    // Top mistake stats
    const mistakeCounts: Record<string, number> = {};
    trades.forEach((t) => {
      (t.notes?.mistakes || []).forEach((m) => {
        mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
      });
    });

    // Strategy summaries
    const strategyStats = strategies.map((s) => {
      const sTrades = trades.filter((t) => t.strategyId === s.id || t.strategyName === s.name);
      const wins = sTrades.filter((t) => t.netPnL > 0.0001).length;
      return {
        name: s.name,
        trades: sTrades.length,
        winRate: sTrades.length > 0 ? Math.round((wins / sTrades.length) * 100) : 0,
        netPnL: sTrades.reduce((sum, t) => sum + (t.netPnLReporting ?? t.netPnL), 0),
      };
    });

    return {
      traderName: user?.name || 'Trader',
      reportingCurrency,
      portfolioSummary: {
        totalTrades: stats.totalTrades,
        closedTrades: stats.closedTrades,
        winRate: `${stats.winRate}%`,
        profitFactor: stats.profitFactor,
        netPnL: stats.netPnL,
        expectancy: stats.expectancy,
        averageR: stats.averageR,
        maxDrawdown: `${stats.maxDrawdownPercentage}%`,
        ruleAdherenceRate: `${stats.ruleAdherenceRate}%`,
        currentStreak: `${stats.currentStreak.count} ${stats.currentStreak.type}`,
      },
      accounts: accounts.map((a) => ({
        name: a.name,
        broker: a.brokerName,
        balance: a.currentBalance,
        currency: a.baseCurrency,
      })),
      strategyPerformance: strategyStats,
      recordedMistakes: mistakeCounts,
      recentTrades: trades.slice(0, 15).map((t) => ({
        symbol: t.symbol,
        date: t.entryDate,
        direction: t.direction,
        pnl: t.netPnL,
        rMultiple: t.actualRMultiple,
        plannedRR: t.plannedRR,
        strategy: t.strategyName,
        discipline: t.disciplineScore,
        mistakes: t.notes?.mistakes,
        emotions: t.psychology?.emotions,
        thesis: t.notes?.thesis,
      })),
      specificTrade: selectedTradeForReview
        ? {
            symbol: selectedTradeForReview.symbol,
            direction: selectedTradeForReview.direction,
            entryDate: selectedTradeForReview.entryDate,
            entryPrice: selectedTradeForReview.entryPrice,
            exitPrice: selectedTradeForReview.exitPrice,
            stopLoss: selectedTradeForReview.stopLossPrice,
            target: selectedTradeForReview.targetPrice,
            netPnL: selectedTradeForReview.netPnL,
            actualR: selectedTradeForReview.actualRMultiple,
            plannedRR: selectedTradeForReview.plannedRR,
            strategy: selectedTradeForReview.strategyName,
            disciplineScore: selectedTradeForReview.disciplineScore,
            mistakes: selectedTradeForReview.notes?.mistakes,
            thesis: selectedTradeForReview.notes?.thesis,
            lessonsLearned: selectedTradeForReview.notes?.lessonsLearned,
          }
        : undefined,
    };
  };

  // Submit Prompt to AI Coach
  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || inputText).trim();
    if (!promptText && !attachedImage) return;

    setInputText('');
    setIsLoading(true);

    const userMessageId = `msg_${Date.now()}`;
    const newUserMessage: AIChatMessage = {
      id: userMessageId,
      conversationId: activeConversationId,
      role: 'user',
      content: promptText || 'Please analyze this attached chart screenshot.',
      timestamp: new Date().toISOString(),
      screenshotUrl: attachedImage?.preview,
    };

    const updatedCurrentList = [...currentMessages, newUserMessage];
    setMessages({
      ...messages,
      [activeConversationId]: updatedCurrentList,
    });

    // Update conversation title if first user message
    if (currentMessages.length <= 1) {
      setConversations(
        conversations.map((c) =>
          c.id === activeConversationId
            ? { ...c, title: promptText.slice(0, 36) || 'Chart Analysis' }
            : c
        )
      );
    }

    // Dynamic loading messages
    const stages = [
      'Reviewing trade ledger records…',
      'Auditing risk parameters & R-multiples…',
      'Comparing playbook execution criteria…',
      'Synthesizing behavioral insights…',
    ];
    let stageIdx = 0;
    const interval = setInterval(() => {
      stageIdx = (stageIdx + 1) % stages.length;
      setLoadingStage(stages[stageIdx]);
    }, 1800);

    try {
      const context = buildJournalContext();

      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          context,
          coachingStyle: user?.preferences?.coachingStyle || 'balanced',
          language: selectedLanguage,
          image: attachedImage
            ? { data: attachedImage.data, mimeType: attachedImage.mimeType }
            : undefined,
          conversationHistory: updatedCurrentList.slice(-6),
        }),
      });

      const data = await response.json();
      clearInterval(interval);

      const assistantMessage: AIChatMessage = {
        id: `msg_ai_${Date.now()}`,
        conversationId: activeConversationId,
        role: 'assistant',
        content: data.response || data.error || 'AI Coach analysis completed.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => ({
        ...prev,
        [activeConversationId]: [...(prev[activeConversationId] || []), assistantMessage],
      }));
    } catch (err: any) {
      clearInterval(interval);
      const errorMessage: AIChatMessage = {
        id: `msg_err_${Date.now()}`,
        conversationId: activeConversationId,
        role: 'assistant',
        content: 'AI Coach is temporarily unavailable. Your trading data is completely safe.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => ({
        ...prev,
        [activeConversationId]: [...(prev[activeConversationId] || []), errorMessage],
      }));
    } finally {
      setIsLoading(false);
      setAttachedImage(null);
      setSelectedTradeForReview(null);
    }
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setAttachedImage({
        data: base64Data,
        mimeType: file.type,
        preview: result,
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      {/* 1. LEFT SIDEBAR: CHAT HISTORY */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 p-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider font-mono">Sessions</span>
          </div>
          <button
            onClick={handleStartNewChat}
            className="p-1.5 rounded-md bg-zinc-200 dark:bg-zinc-800 hover:bg-emerald-600 hover:text-white transition-colors"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative my-2.5">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto space-y-1 text-xs">
          {filteredConversations.map((c) => {
            const isActive = c.id === activeConversationId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between group transition-colors ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold border border-emerald-300 dark:border-emerald-800'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{c.title}</span>
                </div>
                {conversations.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Coach Style Status */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400">
          <div className="flex items-center justify-between">
            <span>Coaching Style:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
              {user?.preferences?.coachingStyle || 'Balanced'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span>Backend Model:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">Gemini 3.8 Flash</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                AI Trading Coach
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  Journal Grounded
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                Analyse your journal, understand your behaviour and improve your trading process.
              </p>
            </div>
          </div>

          {/* Quick Review Mode Buttons & Language Selector */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700/80">
              <Globe className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 ml-1.5 shrink-0" />
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value as any)}
                className="text-xs bg-transparent py-1 pr-2 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer"
                title="Change AI Coach Language"
              >
                <option value="en" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">English</option>
                <option value="hi" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Hindi (हिन्दी)</option>
                <option value="bn" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Bengali (বাংলা)</option>
                <option value="ta" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Tamil (தமிழ்)</option>
              </select>
            </div>

            <select
              value={selectedTradeForReview?.id || ''}
              onChange={(e) => {
                const found = trades.find((t) => t.id === e.target.value);
                setSelectedTradeForReview(found || null);
                if (found) {
                  const prompt =
                    found.netPnL < 0
                      ? `Perform a deep Loss Review on trade ${found.symbol}. Determine whether this was a Good Loss (valid setup, respected rules) or a Process Error (rule violation).`
                      : `Review winning trade ${found.symbol}. Determine whether this win resulted from solid process or lucky execution.`;
                  handleSendMessage(prompt);
                }
              }}
              className="hidden sm:block text-xs p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <option value="">Audit Specific Trade...</option>
              {trades.slice(0, 15).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol} ({t.direction.toUpperCase()}) {t.netPnL >= 0 ? '+' : ''}
                  {formatCurrency(t.netPnL, t.tradeCurrency)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {currentMessages.map((msg) => {
            const isAssistant = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isAssistant ? 'max-w-3xl' : 'max-w-2xl ml-auto flex-row-reverse'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[10px] ${
                    isAssistant ? 'bg-emerald-600' : 'bg-zinc-800 dark:bg-zinc-700'
                  }`}
                >
                  {isAssistant ? <Brain className="w-4 h-4" /> : user?.name?.charAt(0) || 'U'}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-xl space-y-2 ${
                    isAssistant
                      ? 'bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                  }`}
                >
                  {msg.screenshotUrl && (
                    <img
                      src={msg.screenshotUrl}
                      alt="Attached Screenshot"
                      className="max-h-48 rounded border border-zinc-300 dark:border-zinc-700 object-cover mb-2"
                    />
                  )}
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 text-xs max-w-xl animate-in fade-in">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <Brain className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span className="font-medium text-xs">{loadingStage}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30 overflow-x-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono uppercase text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Prompts:
          </span>
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt.text)}
              disabled={isLoading}
              className="px-2.5 py-1 text-[11px] rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          {attachedImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={attachedImage.preview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded border border-emerald-500"
              />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <label
              title="Attach Chart Screenshot for Multimodal AI Analysis"
              className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors shrink-0"
            >
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            <input
              type="text"
              placeholder="Ask AI Coach about your trades, mistakes, psychology, or R-multiples..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 p-2.5 text-xs sm:text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <button
              type="submit"
              disabled={isLoading || (!inputText.trim() && !attachedImage)}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-xs"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
