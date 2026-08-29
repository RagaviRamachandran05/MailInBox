import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { QueueStats } from '../../types';
import {
  Wrench,
  X,
  Radio,
  Zap,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface DevSandboxDrawerProps {
  onCampaignCreated?: () => void;
}

export const DevSandboxDrawer: React.FC<DevSandboxDrawerProps> = ({ onCampaignCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [seeding, setSeeding] = useState(false);
  const { success, error } = useToast();

  const fetchStats = async () => {
    try {
      const res = await api.get('/queue/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      const interval = setInterval(fetchStats, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleQuickSeed = async (count: number, delayMs: number = 2000, hourlyLimit: number = 200) => {
    setSeeding(true);
    try {
      const recipients = Array.from({ length: count }, (_, i) => `lead.${i + 1}.test@example.com`);
      const now = new Date(Date.now() + 5000); // 5 seconds in future

      const res = await api.post('/emails/schedule', {
        subject: `Automated Test Campaign #${Math.floor(Math.random() * 1000)}`,
        body: 'Hello {{email}},\n\nThis is a real automated delayed email processed through BullMQ and Redis atomic rate limiting!\n\nBest regards,\nAuraMail Engine',
        recipients,
        startTime: now.toISOString(),
        delayBetweenEmails: delayMs,
        hourlyLimit,
      });

      if (res.data.success) {
        success(
          'Test Campaign Scheduled!',
          `${res.data.data.scheduledEmails} emails enqueued in BullMQ with ${delayMs}ms stagger.`
        );
        fetchStats();
        if (onCampaignCreated) onCampaignCreated();
      }
    } catch (err: any) {
      error('Failed to schedule test campaign', err.response?.data?.message || err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shadow-2xl hover:scale-105 transition-all duration-200 border border-slate-700/60 group"
      >
        <Wrench className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-45 transition-transform" />
        <span>Dev & Demo Tools</span>
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />

          <div className="fixed inset-y-0 left-0 max-w-sm w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-slideIn">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Demo & QA Tools
                    </h3>
                    <p className="text-xs text-slate-500">Live BullMQ & Rate Limiting</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Live Queue Monitor */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    BullMQ Live Metrics
                  </span>
                  <button
                    onClick={fetchStats}
                    className="text-xs text-slate-400 hover:text-indigo-500"
                    title="Refresh stats"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 block">Delayed (Scheduled)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{stats?.delayed ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 block">Active (Sending)</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{stats?.active ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 block">Waiting</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{stats?.waiting ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 block">Completed</span>
                    <span className="font-bold text-emerald-600 text-sm">{stats?.completed ?? 0}</span>
                  </div>
                </div>

                <a
                  href="/admin/queues"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Bull Board</span>
                </a>
              </div>

              {/* Quick Preset Generators */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  1-Click Test Scenarios
                </span>

                <button
                  onClick={() => handleQuickSeed(5, 2000, 200)}
                  disabled={seeding}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      ⚡ Schedule 5 Emails (2s Stagger)
                    </span>
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Verifies 2000ms delay spacing between BullMQ jobs.
                  </p>
                </button>

                <button
                  onClick={() => handleQuickSeed(8, 1000, 3)}
                  disabled={seeding}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-400 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      ⚡ Rate-Limit Test (3 emails/hr limit)
                    </span>
                    <Zap className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Schedules 8 emails with 3/hr limit. First 3 send, next 5 auto-reschedule to next hour & notify Slack!
                  </p>
                </button>
              </div>

              {/* System Architecture Highlights */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>Production Guarantees</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>BullMQ delayed jobs (Zero cron / intervals)</li>
                  <li>Transactional MySQL state locks (Zero duplicate sends)</li>
                  <li>Redis Lua atomic hourly rate limiter</li>
                  <li>Auto-reschedules without marking failed</li>
                  <li>Elasticsearch full-text fuzzy search</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-400">
                AuraMail Enterprise Architecture
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
