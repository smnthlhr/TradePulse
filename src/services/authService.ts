import { User, UserPreferences } from '../types/trade';

const AUTH_USER_KEY = 'tradepulse_auth_user';
const USERS_REGISTRY_KEY = 'tradepulse_users_registry';

export const DEFAULT_PREFERENCES: UserPreferences = {
  name: 'Somnath Trader',
  email: 'mr.somnath2020@gmail.com',
  avatarUrl: undefined,
  authProvider: 'google',
  googleId: 'google_1048291048',
  defaultCurrency: 'INR',
  timeZone: 'Asia/Kolkata',
  timeFormat: '12h',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: 'en-IN',
  theme: 'dark',
  privacyMode: false,
  tradingProfile: {
    assetClasses: ['equity', 'futures', 'options'],
    primaryStyles: ['Day trading', 'Swing trading'],
  },
  onboardingCompleted: true,
  // AI Settings
  aiProvider: 'builtin',
  hasByokKey: false,
  coachingStyle: 'balanced',
  aiMemoryEnabled: true,
  screenshotAnalysisEnabled: true,
  chatHistoryEnabled: true,
  voiceModeEnabled: true,
  autoTranscript: true,
  selectedVoice: 'Zephyr',
  voiceLanguage: 'en',
  aiDefaultMode: 'voice',
  spokenDetail: 'normal',
  dashboardWidgets: {
    balance: true,
    profitabilityScore: true,
    disciplineScore: true,
    currentStreak: true,
    secondaryMetrics: true,
    performanceChart: true,
    aiInsight: true,
    needsAttention: true,
    calendar: true,
    todayStats: true,
    strategyEdge: true,
    recentTrades: true,
  },
  // Trading Rules & Risk Limits (Section 1)
  tradingRules: {
    maxTradesPerDay: 3,
    riskPerTradePct: 1,
    maxDailyLossPct: 2,
    minPlannedRR: 2,
    maxConsecutiveLosses: 2,
    stopTradingAfterDailyLoss: true,
    allowedTradingHoursStart: '09:15',
    allowedTradingHoursEnd: '15:30',
    stopAfterLossesRuleEnabled: true,
    oneTradeMode: false,
    strictDisciplineMode: false,
  },
};

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      } else {
        // Create initial default Google authenticated user
        const defaultUser: User = {
          id: 'user_primary',
          email: 'mr.somnath2020@gmail.com',
          name: 'Somnath Trader',
          avatarUrl: undefined,
          authProvider: 'google',
          googleId: 'google_1048291048',
          preferences: DEFAULT_PREFERENCES,
          createdAt: '2026-01-01T00:00:00.000Z',
        };
        this.saveUser(defaultUser);
        this.currentUser = defaultUser;
      }
    } catch {
      this.currentUser = null;
    }
  }

  public getCurrentUser(): User | null {
    if (!this.currentUser) {
      this.loadSession();
    }
    return this.currentUser;
  }

  public saveUser(user: User): void {
    this.currentUser = user;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    const registry = this.getUsersRegistry();
    registry[user.email.toLowerCase()] = user;
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
  }

  public updatePreferences(partial: Partial<UserPreferences>): User | null {
    if (!this.currentUser) return null;
    const updated: User = {
      ...this.currentUser,
      preferences: {
        ...this.currentUser.preferences,
        ...partial,
      },
    };
    this.saveUser(updated);
    return updated;
  }

  public getUsersRegistry(): Record<string, User> {
    try {
      const reg = localStorage.getItem(USERS_REGISTRY_KEY);
      return reg ? JSON.parse(reg) : {};
    } catch {
      return {};
    }
  }

  /**
   * Google Sign-In with official profile parameters
   */
  public loginWithGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): { success: boolean; user: User } {
    const emailKey = profile.email.toLowerCase();
    const registry = this.getUsersRegistry();
    let existing = registry[emailKey];

    if (!existing) {
      existing = {
        id: `user_${profile.googleId}`,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        authProvider: 'google',
        googleId: profile.googleId,
        preferences: {
          ...DEFAULT_PREFERENCES,
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          onboardingCompleted: false, // show onboarding wizard
        },
        createdAt: new Date().toISOString(),
      };
    } else {
      existing.name = profile.name;
      if (profile.avatarUrl) existing.avatarUrl = profile.avatarUrl;
      existing.authProvider = 'google';
      existing.googleId = profile.googleId;
    }

    this.saveUser(existing);
    return { success: true, user: existing };
  }

  public logout(): void {
    localStorage.removeItem(AUTH_USER_KEY);
    this.currentUser = null;
  }

  public deleteAccount(userId: string): void {
    if (this.currentUser && this.currentUser.id === userId) {
      const emailKey = this.currentUser.email.toLowerCase();
      const registry = this.getUsersRegistry();
      delete registry[emailKey];
      localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
      this.logout();
    }
  }
}

export const authService = new AuthService();
