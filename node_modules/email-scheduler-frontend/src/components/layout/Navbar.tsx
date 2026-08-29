import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { SlackStatus, QueueStats } from '../../types';
import {
  Radio,
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [slackRes, queueRes] = await Promise.all([
          api.get('/slack/status').catch(() => ({ data: { data: { connected: false } } })),
          api.get('/queue/stats').catch(() => ({ data: { data: null } })),
        ]);
        if (slackRes.data?.data) setSlackStatus(slackRes.data.data);
        if (queueRes.data?.data) setQueueStats(queueRes.data.data);
      } catch (e) {
        // Silent error
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors duration-200">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-black text-xl shadow-sm">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                AuraMail
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                BULLMQ
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
              Distributed Delayed Email Scheduler
            </p>
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Slack Status Indicator */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              slackStatus.connected
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                slackStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>
              {slackStatus.connected
                ? `Slack: ${slackStatus.teamName || 'Active'}`
                : 'Slack: Disconnected'}
            </span>
          </div>

          {/* BullMQ Live Pulse */}
          <a
            href="/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 transition-colors group"
            title="Open Live BullMQ Bull Board"
          >
            <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:animate-spin" />
            <span>BullMQ Live</span>
            {queueStats && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-bold">
                {queueStats.waiting + queueStats.active + queueStats.delayed}
              </span>
            )}
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
          </a>

          {/* Professional 2-Tone Light & Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all active:scale-95"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-slate-200 animate-spin-slow" />
                <span className="hidden sm:inline text-slate-200">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-800" />
                <span className="hidden sm:inline text-slate-700">Dark Mode</span>
              </>
            )}
          </button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-bold flex items-center justify-center text-xs">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="text-left hidden xl:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {user?.name || 'Engineer'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {user?.email || 'authenticated'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>

                <a
                  href="/admin/queues"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Radio className="w-4 h-4 text-indigo-500" />
                  <span>BullMQ Live Dashboard</span>
                </a>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
