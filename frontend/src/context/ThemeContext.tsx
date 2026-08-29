import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  themeConfig: {
    name: string;
    primaryColor: string;
    accentColor: string;
    bgClass: string;
    cardClass: string;
    textClass: string;
    badgeScheduled: string;
    badgeSent: string;
    badgeFailed: string;
    primaryButton: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('auramail_theme_mode') as ThemeMode) || 'light';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('auramail_theme_mode', newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'theme-light', 'theme-dark');
    if (theme === 'dark') {
      root.classList.add('dark', 'theme-dark');
    } else {
      root.classList.add('light', 'theme-light');
    }
  }, [theme]);

  const getThemeConfig = () => {
    if (theme === 'dark') {
      return {
        name: 'Obsidian Black (Dark)',
        primaryColor: '#6366f1',
        accentColor: '#38bdf8',
        bgClass: 'bg-[#090d16]',
        cardClass: 'bg-[#0f172a]/95 border-slate-800 shadow-xl',
        textClass: 'text-slate-100',
        badgeScheduled: 'bg-slate-800 text-slate-200 border-slate-700',
        badgeSent: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
        badgeFailed: 'bg-slate-800 text-slate-400 border-slate-700',
        primaryButton: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30',
      };
    }

    return {
      name: 'Studio White (Light)',
      primaryColor: '#4f46e5',
      accentColor: '#0284c7',
      bgClass: 'bg-[#f8fafc]',
      cardClass: 'bg-white border-slate-200/90 shadow-card-soft',
      textClass: 'text-slate-900',
      badgeScheduled: 'bg-slate-100 text-slate-800 border-slate-300',
      badgeSent: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      badgeFailed: 'bg-slate-100 text-slate-600 border-slate-300',
      primaryButton: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20',
    };
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        themeConfig: getThemeConfig(),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
