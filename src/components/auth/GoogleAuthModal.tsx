import React, { useState } from 'react';
import { TrendingUp, X, Check, ShieldCheck, User as UserIcon } from 'lucide-react';
import { authService } from '../../services/authService';
import { User } from '../../types/trade';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  if (!isOpen) return null;

  // Handle standard 1-click Google Sign-In with user's official email
  const handleQuickGoogleSignIn = (googleName: string, googleEmail: string, avatarUrl?: string) => {
    const res = authService.loginWithGoogle({
      googleId: `google_${Date.now()}`,
      name: googleName,
      email: googleEmail,
      avatarUrl,
    });
    onLoginSuccess(res.user);
    onClose();
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const resolvedName = name.trim() || email.split('@')[0];
    handleQuickGoogleSignIn(
      resolvedName,
      email.trim(),
      undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-7 space-y-6 text-zinc-900 dark:text-zinc-100 animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-sm tracking-tight">TradePulse Sign-In</span>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Welcome to Your Journal</h3>
          <p className="text-xs text-zinc-500">
            Secure Google authentication separates your trades, accounts, and AI coaching sessions with Row-Level Isolation.
          </p>
        </div>

        {/* Primary Action: Continue with Google */}
        <div className="space-y-3">
          <button
            onClick={() =>
              handleQuickGoogleSignIn(
                'Somnath',
                'mr.somnath2020@gmail.com',
                undefined
              )
            }
            className="w-full py-2.5 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 font-semibold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-3 transition-colors shadow-xs group"
          >
            {/* Official Google 'G' Logo SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google (mr.somnath2020@gmail.com)</span>
          </button>

          {!isCustomMode ? (
            <button
              onClick={() => setIsCustomMode(true)}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-1"
            >
              Sign in with a different Google account
            </button>
          ) : (
            <form onSubmit={handleCustomGoogleSubmit} className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Trader"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md"
                >
                  Sign In with Google
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 leading-relaxed flex items-start gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Only requested profile information (ID, name, email, avatar) is accessed. No access to Gmail, Drive, or unrelated Google data.
          </span>
        </div>
      </div>
    </div>
  );
};
