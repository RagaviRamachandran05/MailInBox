import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import {
  ShieldCheck,
  Sun,
  Moon,
  ArrowRight,
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Sparkles,
  Layers,
  Clock,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, loginWithGoogle, loginWithGoogleCredential, loginWithPassword, googleClientId, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('rragavi054@gmail.com');
  const [password, setPassword] = useState('Ragavi@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Initialize Google Identity Services (GIS) on mount when Client ID is present
  useEffect(() => {
    if (!googleClientId) return;

    const initGsi = () => {
      if ((window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response?.credential) {
                setGoogleLoading(true);
                try {
                  await loginWithGoogleCredential(response.credential);
                  success('Welcome to AuraMail!', 'Signed in successfully via Google.');
                  navigate('/dashboard');
                } catch (err: any) {
                  error('Google Sign-In failed', err.response?.data?.message || 'Could not verify token.');
                } finally {
                  setGoogleLoading(false);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
        } catch (e) {
          console.warn('GIS Init notice:', e);
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId, loginWithGoogleCredential, navigate, success, error]);

  const handleGoogleClick = () => {
    if ((window as any).google?.accounts?.id && googleClientId) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          loginWithGoogle();
        }
      });
    } else {
      loginWithGoogle();
    }
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Email Required', 'Please enter your email address.');
      return;
    }
    if (!password) {
      error('Password Required', 'Please enter your password.');
      return;
    }
    setSubmitting(true);
    try {
      const userName = name.trim() || (email.includes('ragavi') ? 'Ragavi' : email.split('@')[0]);
      await loginWithPassword(email.trim(), password, userName);
      success(
        isRegister ? 'Account Created!' : 'Welcome Back!',
        `Signed in as ${userName} (${email.trim()})`
      );
      navigate('/dashboard');
    } catch (err: any) {
      error('Authentication Failed', err.response?.data?.message || 'Could not sign in with provided credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#0b0f19] dark:via-[#10172a] dark:to-[#080c14] text-slate-900 dark:text-slate-100 transition-colors duration-500 relative overflow-hidden font-sans">
      {/* Ambient background glowing orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-slate-500/10 dark:bg-slate-500/5 blur-[120px] pointer-events-none" />

      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between p-6 max-w-7xl w-full mx-auto z-10">
        <div className="flex items-center gap-3.5 group cursor-pointer">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-900 dark:bg-indigo-600 shadow-sm text-white font-black text-2xl transition-transform duration-300 group-hover:scale-105">
            A
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              AuraMail
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                PRO
              </span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Enterprise Email Scheduler
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 shadow-sm transition-all duration-200 active:scale-95"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-slate-200 animate-spin-slow" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-800" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-[32px] p-8 sm:p-10 shadow-xl space-y-6 transition-all duration-300">
          
          {/* Badge & Title */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Distributed BullMQ Scheduler Engine</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {isRegister ? 'Create an Account' : 'Sign In to AuraMail'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {isRegister
                ? 'Register with your email and password to start scheduling campaigns.'
                : 'Sign in with your email & password or continue with Google.'}
            </p>
          </div>

          {/* Quick Google One-Click Auth Button */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleClick}
              disabled={googleLoading}
              className="w-full relative group overflow-hidden flex items-center justify-center gap-3.5 py-3 px-5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/90 font-bold text-sm text-slate-800 dark:text-slate-100 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:border-indigo-400 active:scale-[0.99]"
            >
              <svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.4 0 10.6 0 13s.6 4.6 1.6 6.6l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.1L1.6 16.1C3.5 19.9 7.4 23 12 23z"
                />
              </svg>
              
              <span className="tracking-tight">
                {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200/80 dark:border-slate-800 w-full" />
            <span className="bg-white/90 dark:bg-slate-900/90 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Or Sign In With Email & Password
            </span>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailPasswordAuth} className="space-y-4">
            
            {/* Optional Full Name (Only on Register) */}
            {isRegister && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ragavi"
                    required={isRegister}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Email Address Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {!isRegister && (
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me / Terms */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900"
                />
                <span>Keep me signed in</span>
              </label>

              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 rounded-xl transition-all duration-200 hover:scale-[1.01]"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isRegister ? 'Create Account & Enter' : 'Sign In to Workspace'}
            </Button>
          </form>

          {/* Architecture Pillars */}
          <div className="pt-1 grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Idempotency</span>
              <span className="text-[9px] text-slate-400">Zero Duplicates</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 flex flex-col items-center gap-1">
              <Zap className="w-4 h-4 text-sky-500" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Redis Lua</span>
              <span className="text-[9px] text-slate-400">Sliding Rate Limits</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 flex flex-col items-center gap-1">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">BullMQ Live</span>
              <span className="text-[9px] text-slate-400">Worker Monitoring</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 z-10 flex items-center justify-center gap-2">
        <Clock className="w-3.5 h-3.5 text-indigo-500" />
        <span>AuraMail Enterprise Email Scheduler • Real-Time Distributed Architecture</span>
      </footer>
    </div>
  );
};

