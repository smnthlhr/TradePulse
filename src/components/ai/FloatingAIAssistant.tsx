import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Send,
  Camera,
  RotateCcw,
  Square,
  Radio,
  Sliders,
  ChevronDown,
  Globe,
  AlertCircle,
} from 'lucide-react';
import {
  Trade,
  TradingAccount,
  Strategy,
  PersonalRule,
  DailyJournalEntry,
  User,
  CoachingStyle,
} from '../../types/trade';
import { PortfolioStatistics } from '../../utils/calculations';

interface FloatingAIAssistantProps {
  user: User | null;
  trades: Trade[];
  accounts: TradingAccount[];
  strategies: Strategy[];
  rules: PersonalRule[];
  dailyJournals: DailyJournalEntry[];
  stats: PortfolioStatistics;
  reportingCurrency: string;
  contextPage?: string;
  onOpenTradeModal?: () => void;
}

type VoiceState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted';

interface TranscriptItem {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
}

const VOICE_PERSONAS: ('Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir')[] = [
  'Zephyr',
  'Kore',
  'Puck',
  'Charon',
  'Fenrir',
];

export type VoiceLanguageCode = 'en' | 'hi' | 'bn' | 'ta';

export interface VoiceLanguageOption {
  code: VoiceLanguageCode;
  label: string;
  nativeLabel: string;
  speechLocale: string;
  ttsLangCode: string;
  placeholderText: string;
}

export const SUPPORTED_LANGUAGES: VoiceLanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechLocale: 'en-US',
    ttsLangCode: 'en-US',
    placeholderText: 'Ask coach in English or attach chart…',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    speechLocale: 'hi-IN',
    ttsLangCode: 'hi-IN',
    placeholderText: 'कोच से हिन्दी में पूछें या चार्ट जोड़ें…',
  },
  {
    code: 'bn',
    label: 'Bengali',
    nativeLabel: 'বাংলা',
    speechLocale: 'bn-IN',
    ttsLangCode: 'bn-IN',
    placeholderText: 'বাংলায় প্রশ্ন করুন বা চার্ট যোগ করুন…',
  },
  {
    code: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    speechLocale: 'ta-IN',
    ttsLangCode: 'ta-IN',
    placeholderText: 'தமிழில் கேளுங்கள் அல்லது சார்ட் சேர்க்கவும்…',
  },
];

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  user,
  trades,
  accounts,
  strategies,
  rules,
  dailyJournals,
  stats,
  reportingCurrency,
  contextPage = 'dashboard',
}) => {
  // Floating Window States
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Preference for default mode (Voice vs Chat) - remembered per user
  const [activeMode, setActiveMode] = useState<'voice' | 'chat'>(() => {
    try {
      const stored = localStorage.getItem(`tradepulse_ai_mode_${user?.id || 'user_primary'}`);
      if (stored === 'voice' || stored === 'chat') {
        return stored;
      }
    } catch {}
    return user?.preferences?.aiDefaultMode || 'voice';
  });

  const handleModeChange = (mode: 'voice' | 'chat') => {
    setActiveMode(mode);
    try {
      localStorage.setItem(`tradepulse_ai_mode_${user?.id || 'user_primary'}`, mode);
    } catch {}
  };

  // Preferences: Voice Persona
  const selectedVoice = user?.preferences?.selectedVoice || 'Zephyr';
  const [currentVoice, setCurrentVoice] = useState<'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir'>(selectedVoice);

  // Voice Language Selector - remembered per user
  const [currentLanguage, setCurrentLanguage] = useState<VoiceLanguageCode>(() => {
    try {
      const stored = localStorage.getItem(`tradepulse_ai_lang_${user?.id || 'user_primary'}`);
      if (stored && ['en', 'hi', 'bn', 'ta'].includes(stored)) {
        return stored as VoiceLanguageCode;
      }
    } catch {}
    return user?.preferences?.voiceLanguage || 'en';
  });

  const handleLanguageChange = (lang: VoiceLanguageCode) => {
    setCurrentLanguage(lang);
    try {
      localStorage.setItem(`tradepulse_ai_lang_${user?.id || 'user_primary'}`, lang);
    } catch {}
  };

  const currentLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const coachingStyle = user?.preferences?.coachingStyle || 'balanced';
  const spokenDetail = user?.preferences?.spokenDetail || 'normal';

  // Voice Live State
  const [voiceState, setVoiceState] = useState<VoiceState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [speechSupportError, setSpeechSupportError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<TranscriptItem[]>([
    {
      id: 'welcome_voice',
      sender: 'coach',
      text: `Hello ${user?.name || 'Trader'}. I am your personal AI Voice Coach. Ready when you are.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Chat Mode State
  const [chatMessages, setChatMessages] = useState<TranscriptItem[]>([
    {
      id: 'welcome_chat',
      sender: 'coach',
      text: `Ask me about your win rates, rule adherence, or upload a chart screenshot for vision analysis.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinkingChat, setIsThinkingChat] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Audio References
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    if (activeMode === 'voice') {
      transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, chatMessages, activeMode, isOpen]);

  // Stop any playing audio
  const stopAudioPlayback = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  };

  // Build Context Summary for Gemini
  const getContextPayload = () => {
    return {
      traderName: user?.name || 'Trader',
      contextPage,
      reportingCurrency,
      accountsSummary: accounts.map((a) => ({
        name: a.name,
        balance: a.currentBalance,
        currency: a.baseCurrency,
      })),
      portfolioStats: {
        totalTrades: stats.totalTrades,
        winRate: `${stats.winRate.toFixed(1)}%`,
        totalNetPnL: `${reportingCurrency} ${stats.netPnL.toFixed(2)}`,
        profitFactor: stats.profitFactor === Infinity ? 'Infinity' : stats.profitFactor.toFixed(2),
        expectancy: stats.expectancy.toFixed(2),
        averageWin: stats.averageWinner.toFixed(2),
        averageLoss: stats.averageLoser.toFixed(2),
        maxDrawdown: `${stats.maxDrawdownPercentage.toFixed(1)}%`,
        disciplineAdherence: `${stats.ruleAdherenceRate.toFixed(1)}%`,
        currentStreak: `${stats.currentStreak.count} ${stats.currentStreak.type}s`,
      },
      rules: rules.map((r) => ({ title: r.title, category: r.category, active: r.enabled })),
      strategies: strategies.map((s) => ({ name: s.name, minRR: s.minRR })),
      recentTrades: trades.slice(0, 8).map((t) => ({
        symbol: t.symbol,
        direction: t.direction,
        status: t.status,
        netPnL: t.netPnL,
        pnlR: t.actualRMultiple ?? 0,
        rulesFollowed: t.rulesFollowedCount ?? 0,
        mistakes: t.notes?.mistakes || [],
        date: t.tradeDate || t.entryDate,
      })),
    };
  };

  // Browser SpeechSynthesis fallback with locale awareness
  const fallbackSpeechSynthesis = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLangConfig.speechLocale;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try selecting an installed browser voice for the language if available
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        const matchedVoice = availableVoices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(currentLanguage) ||
            v.lang.toLowerCase().replace('_', '-').startsWith(currentLangConfig.speechLocale.toLowerCase())
        );
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      } catch {}

      utterance.onend = () => {
        setSpeakingMessageId(null);
        if (voiceState === 'speaking') {
          setVoiceState(isMuted ? 'muted' : 'listening');
        }
      };

      utterance.onerror = () => {
        setSpeakingMessageId(null);
        setVoiceState(isMuted ? 'muted' : 'listening');
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setSpeakingMessageId(null);
      setVoiceState(isMuted ? 'muted' : 'listening');
    }
  };

  // Synthesize and play audio response via Gemini 3.8 Flash Lite TTS with fallback
  const playSpokenResponse = async (text: string, messageId?: string) => {
    stopAudioPlayback();
    if (messageId) setSpeakingMessageId(messageId);
    setVoiceState('speaking');

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: currentVoice,
        }),
      });

      const data = await res.json();
      if (data.audio) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          setVoiceState('speaking');
        };

        audio.onended = () => {
          setSpeakingMessageId(null);
          currentAudioRef.current = null;
          if (voiceState === 'speaking') {
            setVoiceState(isMuted ? 'muted' : 'listening');
          }
        };

        audio.onerror = () => {
          fallbackSpeechSynthesis(text);
        };

        await audio.play();
      } else {
        fallbackSpeechSynthesis(text);
      }
    } catch {
      fallbackSpeechSynthesis(text);
    }
  };

  // Process user speech in voice session
  const handleUserVoiceQuery = async (userSpeech: string) => {
    if (!userSpeech.trim()) return;

    // Add user phrase to transcript
    const userItem: TranscriptItem = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: userSpeech,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTranscript((prev) => [...prev, userItem]);

    setVoiceState('thinking');

    try {
      // Craft query with spokenDetail constraint
      let detailPrompt = 'Provide a punchy, spoken answer in 2 to 3 sentences max for real-time audio.';
      if (spokenDetail === 'short') {
        detailPrompt = 'Answer in 1 direct, high-impact sentence suitable for fast audio feedback.';
      } else if (spokenDetail === 'detailed') {
        detailPrompt = 'Answer with a structured 3-to-4 sentence breakdown citing numerical metrics.';
      }

      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${userSpeech}\n\n[INSTRUCTION: ${detailPrompt}]`,
          context: getContextPayload(),
          coachingStyle,
          language: currentLanguage,
        }),
      });

      const data = await res.json();
      const answer = data.response || 'Understood. Reviewing your parameters.';

      const coachItem: TranscriptItem = {
        id: `coach_${Date.now()}`,
        sender: 'coach',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setTranscript((prev) => [...prev, coachItem]);

      // Speak response aloud
      await playSpokenResponse(answer);
    } catch (err) {
      const errItem: TranscriptItem = {
        id: `err_${Date.now()}`,
        sender: 'coach',
        text: 'I could not process that query. Check network connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setTranscript((prev) => [...prev, errItem]);
      setVoiceState('listening');
    }
  };

  // Start Voice Session
  const startVoiceSession = () => {
    stopAudioPlayback();
    setSpeechSupportError(null);
    setVoiceState('connecting');

    // Setup speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = currentLangConfig.speechLocale;

        recognition.onstart = () => {
          setVoiceState('listening');
          setSpeechSupportError(null);
        };

        recognition.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1];
          if (lastResult.isFinal) {
            const transcriptText = lastResult[0].transcript.trim();
            if (transcriptText) {
              handleUserVoiceQuery(transcriptText);
            }
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition notice:', e?.error);
          if (e?.error === 'not-allowed') {
            setSpeechSupportError('Microphone permission was denied. Please allow microphone access.');
            setVoiceState('disconnected');
          } else if (e?.error === 'no-speech') {
            // normal silence timeout, keep listening
          } else if (e?.error === 'language-not-supported') {
            setSpeechSupportError(`Speech recognition for ${currentLangConfig.label} is not supported in this browser. Fallback typing is available.`);
            // fallback language to en-US
            try {
              recognition.lang = 'en-US';
            } catch {}
          }
        };

        recognition.onend = () => {
          // Restart if still active
          if (voiceState !== 'disconnected' && !isMuted) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn('Speech recognition setup error:', err);
        setSpeechSupportError('Speech recognition could not be initialized. You can still use Chat & Vision mode.');
        setVoiceState('disconnected');
      }
    } else {
      // Browser without SpeechRecognition API: handle gracefully
      setSpeechSupportError(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or use Chat mode below.'
      );
      setVoiceState('disconnected');
    }
  };

  // End Voice Session
  const endVoiceSession = () => {
    stopAudioPlayback();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setVoiceState('disconnected');
  };

  // Toggle Mute
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVoiceState('listening');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    } else {
      setIsMuted(true);
      setVoiceState('muted');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }
  };

  // Chat Send
  const handleSendChat = async () => {
    if ((!inputText.trim() && !selectedImage) || isThinkingChat) return;

    const userMsg: TranscriptItem = {
      id: `chat_user_${Date.now()}`,
      sender: 'user',
      text: inputText.trim() || (selectedImage ? 'Attached screenshot for chart analysis' : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const promptToSend = inputText.trim();
    const imageToSend = selectedImage;
    setInputText('');
    setSelectedImage(null);
    setIsThinkingChat(true);

    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          image: imageToSend,
          context: getContextPayload(),
          coachingStyle,
          language: currentLanguage,
        }),
      });

      const data = await res.json();
      const reply = data.response || 'No response returned from coach.';

      const coachMsg: TranscriptItem = {
        id: `chat_coach_${Date.now()}`,
        sender: 'coach',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, coachMsg]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `chat_err_${Date.now()}`,
          sender: 'coach',
          text: 'Unable to connect to AI Coach. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinkingChat(false);
    }
  };

  // Handle Screenshot Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const [meta, base64] = result.split(',');
        const mimeType = meta.split(':')[1]?.split(';')[0] || file.type;
        setSelectedImage({ data: base64, mimeType });
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick audio prompt click
  const handleQuickVoicePrompt = (prompt: string) => {
    if (voiceState === 'disconnected') {
      startVoiceSession();
    }
    handleUserVoiceQuery(prompt);
  };

  return (
    <>
      {/* 1. Global Floating Action Button (FAB) */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-zinc-900 dark:bg-zinc-800 text-white rounded-full shadow-2xl border border-purple-500/40 hover:border-purple-400 hover:scale-105 active:scale-95 transition-all duration-200"
            title="Open TradePulse Live AI Voice Coach"
          >
            {/* Glowing Pulse Ring */}
            <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-purple-600 to-emerald-600 opacity-60 blur-sm group-hover:opacity-100 transition-opacity animate-pulse" />

            <div className="relative flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold tracking-tight">AI Coach</span>
              <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                Live
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 2. Floating AI Assistant Dialog Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 ${
            isMinimized
              ? 'bottom-5 right-5 w-72 h-14'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[440px] max-w-[460px] h-[600px] max-h-[calc(100vh-50px)]'
          } bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl ring-1 ring-purple-500/20 text-zinc-900 dark:text-zinc-100`}
        >
          {/* Header */}
          <div className="p-3 px-4 bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                    TradePulse AI
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                    {currentVoice}
                  </span>
                </div>
                {!isMinimized && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {voiceState === 'speaking'
                      ? `Speaking (${currentLangConfig.nativeLabel})…`
                      : voiceState === 'listening'
                      ? `Listening (${currentLangConfig.nativeLabel})…`
                      : voiceState === 'thinking'
                      ? 'Analyzing journal data…'
                      : 'Live Voice & Vision Coach'}
                  </p>
                )}
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Language Selector */}
              {!isMinimized && (
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700">
                  <Globe className="w-3 h-3 text-zinc-500 dark:text-zinc-400 mr-1 shrink-0" />
                  <select
                    value={currentLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value as VoiceLanguageCode)}
                    className="text-[11px] font-medium bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                    title="Change Voice & AI Language"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      >
                        {lang.label} ({lang.nativeLabel})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Voice Persona Dropdown */}
              {!isMinimized && (
                <select
                  value={currentVoice}
                  onChange={(e) => setCurrentVoice(e.target.value as any)}
                  className="text-[10px] font-mono px-1.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                  title="Change AI Voice persona"
                >
                  {VOICE_PERSONAS.map((v) => (
                    <option key={v} value={v} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                      {v}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  stopAudioPlayback();
                  endVoiceSession();
                  setIsOpen(false);
                }}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Mode Switcher Tabs */}
              <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/60 shrink-0 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleModeChange('voice')}
                    className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                      activeMode === 'voice'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Live Voice</span>
                  </button>
                  <button
                    onClick={() => handleModeChange('chat')}
                    className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                      activeMode === 'chat'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat &amp; Vision</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase">
                    {currentLanguage}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase hidden sm:inline">
                    {coachingStyle}
                  </span>
                </div>
              </div>

              {/* Mode A: Voice Live View */}
              {activeMode === 'voice' && (
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900">
                  {/* Central Visualizer Area */}
                  <div className="p-4 flex flex-col items-center justify-center border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-radial from-purple-900/10 dark:from-purple-950/30 to-transparent">
                    {/* Animated Sound Wave / Voice Orb */}
                    <div className="relative mb-3 flex items-center justify-center">
                      {/* Pulse rings */}
                      {(voiceState === 'listening' || voiceState === 'speaking') && (
                        <div className="absolute w-28 h-28 rounded-full bg-purple-500/10 dark:bg-purple-500/20 animate-ping" />
                      )}
                      {voiceState === 'thinking' && (
                        <div className="absolute w-24 h-24 rounded-full border-2 border-dashed border-purple-400 animate-spin" />
                      )}

                      <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                          voiceState === 'speaking'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-4 ring-emerald-500/30 scale-105'
                            : voiceState === 'listening'
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 ring-4 ring-purple-500/30'
                            : voiceState === 'thinking'
                            ? 'bg-gradient-to-br from-amber-500 to-purple-600'
                            : voiceState === 'muted'
                            ? 'bg-rose-600 ring-4 ring-rose-500/30'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        } text-white`}
                      >
                        {voiceState === 'muted' ? (
                          <MicOff className="w-8 h-8" />
                        ) : voiceState === 'speaking' ? (
                          <Volume2 className="w-8 h-8 animate-bounce" />
                        ) : voiceState === 'thinking' ? (
                          <Sparkles className="w-8 h-8 animate-spin" />
                        ) : voiceState === 'listening' ? (
                          <Mic className="w-8 h-8 animate-pulse" />
                        ) : (
                          <Mic className="w-8 h-8 text-zinc-600 dark:text-zinc-300" />
                        )}
                      </div>
                    </div>

                    {/* Dynamic Audio Bars Animation */}
                    <div className="flex items-center gap-1.5 h-6 mb-2">
                      {[40, 75, 100, 60, 85].map((height, i) => (
                        <span
                          key={i}
                          style={{
                            height:
                              voiceState === 'speaking' || voiceState === 'listening'
                                ? `${Math.max(15, (height * (i % 2 === 0 ? 1 : 0.7)))}%`
                                : '15%',
                          }}
                          className={`w-1 rounded-full transition-all duration-150 ${
                            voiceState === 'speaking'
                              ? 'bg-emerald-500 animate-pulse'
                              : voiceState === 'listening'
                              ? 'bg-purple-500 animate-pulse'
                              : 'bg-zinc-300 dark:bg-zinc-700'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Status Text & Controls */}
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block text-center mb-2">
                      {voiceState === 'disconnected' && `Ready in ${currentLangConfig.nativeLabel} (${currentLangConfig.label})`}
                      {voiceState === 'connecting' && `Connecting (${currentLangConfig.nativeLabel})…`}
                      {voiceState === 'listening' && `Listening in ${currentLangConfig.nativeLabel}…`}
                      {voiceState === 'thinking' && 'Reasoning over trade journal…'}
                      {voiceState === 'speaking' && `Speaking via ${currentVoice}…`}
                      {voiceState === 'muted' && 'Microphone is Muted'}
                    </span>

                    {/* Missing Speech Support Notice */}
                    {speechSupportError && (
                      <div className="mb-2.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-left max-w-sm">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>{speechSupportError}</span>
                      </div>
                    )}

                    {/* Voice Controls Bar */}
                    <div className="flex items-center gap-2">
                      {voiceState === 'disconnected' ? (
                        <button
                          onClick={startVoiceSession}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Start Voice Session</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={toggleMute}
                            className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                              isMuted
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                          >
                            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>

                          {voiceState === 'speaking' && (
                            <button
                              onClick={stopAudioPlayback}
                              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Interrupt speaking"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              <span>Interrupt</span>
                            </button>
                          )}

                          <button
                            onClick={endVoiceSession}
                            className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-colors border border-zinc-300/60 dark:border-zinc-700"
                          >
                            End Session
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Live Scrolling Transcript */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-0 text-xs">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block px-1">
                      Live Transcript ({currentLangConfig.nativeLabel})
                    </span>
                    {transcript.map((item) => (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border max-w-[85%] ${
                          item.sender === 'user'
                            ? 'ml-auto bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200'
                            : 'mr-auto bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                          <span className="font-bold">{item.sender === 'user' ? 'You' : `${currentVoice} Coach`}</span>
                          <span>{item.timestamp}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{item.text}</p>
                      </div>
                    ))}
                    <div ref={transcriptBottomRef} />
                  </div>

                  {/* Suggested Quick Prompts */}
                  <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                      {[
                        'Did I adhere to rules today?',
                        'Review my biggest loss',
                        'What is my top setup edge?',
                        'Am I overtrading?',
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickVoicePrompt(prompt)}
                          className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 whitespace-nowrap hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors shrink-0"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode B: Chat & Multimodal Vision View */}
              {activeMode === 'chat' && (
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900">
                  {/* Messages Feed */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-0 text-xs">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl border max-w-[90%] ${
                          msg.sender === 'user'
                            ? 'ml-auto bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200'
                            : 'mr-auto bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                          <span className="font-bold">{msg.sender === 'user' ? 'You' : 'AI Coach'}</span>
                          <div className="flex items-center gap-2">
                            <span>{msg.timestamp}</span>
                            {msg.sender === 'coach' && (
                              <button
                                onClick={() =>
                                  speakingMessageId === msg.id
                                    ? stopAudioPlayback()
                                    : playSpokenResponse(msg.text, msg.id)
                                }
                                className="p-0.5 text-zinc-500 hover:text-purple-600 dark:hover:text-purple-400"
                                title="Listen to this response"
                              >
                                {speakingMessageId === msg.id ? (
                                  <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))}

                    {isThinkingChat && (
                      <div className="p-3 mr-auto rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                        <span>Auditing trading records…</span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Image Attachment Preview */}
                  {selectedImage && (
                    <div className="p-2 px-3 bg-purple-50 dark:bg-purple-950/40 border-t border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
                      <div className="flex items-center gap-2 truncate">
                        <Camera className="w-4 h-4 shrink-0 text-purple-600" />
                        <span className="truncate">Chart screenshot ready for vision analysis</span>
                      </div>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="text-zinc-400 hover:text-rose-500 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Input Box */}
                  <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-purple-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Upload chart screenshot for vision audit"
                      >
                        <Camera className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendChat();
                          }
                        }}
                        placeholder={currentLangConfig.placeholderText}
                        className="flex-1 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />

                      <button
                        type="button"
                        onClick={handleSendChat}
                        disabled={(!inputText.trim() && !selectedImage) || isThinkingChat}
                        className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg transition-colors shadow-xs"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};
