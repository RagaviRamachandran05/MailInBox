import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Send,
  Users,
  Settings,
  Radio,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  onOpenCompose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCompose }) => {
  const { themeConfig } = useTheme();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/scheduled', label: 'Scheduled Queue', icon: <Clock className="w-4 h-4" /> },
    { to: '/sent', label: 'Sent Emails', icon: <Send className="w-4 h-4" /> },
    { to: '/senders', label: 'SMTP Senders', icon: <Users className="w-4 h-4" /> },
    { to: '/settings', label: 'Integrations & Slack', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200/90 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md hidden md:flex flex-col justify-between py-6 px-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Compose Action Button */}
        <div>
          <button
            onClick={onOpenCompose}
            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 shadow-md ${themeConfig.primaryButton}`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Compose Campaign</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2">
          <p className="px-3 text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            Core Modules
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {item.icon}
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-slate-50 to-transparent dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span>Live Bull Board</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        </a>

        <div className="px-3 text-[11px] text-slate-400 space-y-0.5">
          <p className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            AuraMail Scheduler Engine
          </p>
          <p className="text-[10px]">BullMQ • Redis • MySQL • ES</p>
        </div>
      </div>
    </aside>
  );
};
