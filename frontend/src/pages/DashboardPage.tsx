import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { DashboardStats, Email, QueueStats } from '../types';
import { InteractivePipelineVisualizer } from '../components/dashboard/InteractivePipelineVisualizer';
import { InteractiveDemoSimulator } from '../components/dashboard/InteractiveDemoSimulator';
import {
  Clock,
  Send,
  ShieldCheck,
  Radio,
  Plus,
  ArrowRight,
  ExternalLink,
  MailCheck,
  Zap,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { onOpenCompose, refreshKey } = useOutletContext<{
    onOpenCompose: () => void;
    refreshKey: number;
  }>();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [upcomingEmails, setUpcomingEmails] = useState<Email[]>([]);
  const [recentSentEmails, setRecentSentEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [statsRes, queueRes, scheduledRes, sentRes] = await Promise.all([
        api.get('/emails/stats'),
        api.get('/queue/stats').catch(() => ({ data: { data: null } })),
        api.get('/emails/scheduled?limit=6'),
        api.get('/emails/sent?limit=6'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (queueRes.data.data) setQueueStats(queueRes.data.data);
      if (scheduledRes.data.success) setUpcomingEmails(scheduledRes.data.emails);
      if (sentRes.data.success) setRecentSentEmails(sentRes.data.emails);
    } catch (e) {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 4000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  if (loading && !stats) {
    return <LoadingSpinner message="Loading high-speed scheduler telemetry..." size="lg" />;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-7 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>BullMQ Queue Distributed Cluster Online</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'Engineer'} 👋
            </h1>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Real-time asynchronous job scheduler with distributed Redis rate limiting, automatic exponential backoffs, and Ethereal SMTP previewing.
            </p>

            {/* Telemetry Status Chips */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Worker Concurrency: 5
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                Min Stagger: 2,000ms
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-900 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Idempotent Lock Guard
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
            <Button
              onClick={onOpenCompose}
              size="lg"
              className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/20 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
              icon={<Plus className="w-5 h-5" />}
            >
              Compose Campaign
            </Button>
          </div>
        </div>

        {/* Ambient background subtle glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 1. Real-Time Telemetry Pipeline Flow Visualizer */}
      <InteractivePipelineVisualizer
        queueStats={queueStats}
        stats={stats}
        onOpenCompose={onOpenCompose}
      />

      {/* 2. Interactive 1-Click Campaign Simulator */}
      <InteractiveDemoSimulator onRefreshTrigger={loadDashboardData} />

      {/* 3. Stat Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Scheduled Queue"
          value={stats?.scheduledCount ?? 0}
          subtitle="Waiting in BullMQ delayed slots"
          icon={<Clock className="w-5 h-5 text-indigo-500" />}
          badge="Active"
        />

        <StatCard
          title="Sent & Delivered"
          value={stats?.sentCount ?? 0}
          subtitle="Dispatched via Ethereal SMTP"
          icon={<Send className="w-5 h-5 text-emerald-500" />}
          trend="+100% success"
        />

        <StatCard
          title="Delivery Health"
          value={stats?.deliveryRate || '100.0%'}
          subtitle="Zero duplicate guarantees"
          icon={<ShieldCheck className="w-5 h-5 text-sky-500" />}
          badge="Healthy"
        />

        <StatCard
          title="BullMQ Worker Load"
          value={queueStats ? `${queueStats.active} Active / ${queueStats.delayed} Delayed` : '5 Workers'}
          subtitle="Configured concurrency: 5"
          icon={<Radio className="w-5 h-5 text-indigo-500 animate-pulse" />}
        />
      </div>

      {/* 4. Real-Time Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Upcoming Scheduled Queue */}
        <div className="p-6 rounded-[28px] border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Upcoming Scheduled Queue
                </h2>
                <p className="text-xs text-slate-400">Delayed BullMQ jobs waiting for execution window</p>
              </div>
            </div>
            <Link
              to="/scheduled"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingEmails.length === 0 ? (
            <EmptyState
              title="No emails currently in queue"
              description="Click Compose Campaign or test the 1-Click Simulator above to watch delayed BullMQ jobs lined up in real-time."
              actionText="Schedule Emails"
              onAction={onOpenCompose}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {upcomingEmails.map((email) => (
                <div key={email.id} className="py-3.5 flex items-center justify-between gap-3 text-sm hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      @
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {email.recipient}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email.subject}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge status={email.status} />
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(email.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recently Delivered Emails */}
        <div className="p-6 rounded-[28px] border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <MailCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Recently Delivered
                </h2>
                <p className="text-xs text-slate-400">Completed jobs with live Ethereal inspection links</p>
              </div>
            </div>
            <Link
              to="/sent"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSentEmails.length === 0 ? (
            <EmptyState
              title="No sent emails yet"
              description="Once BullMQ worker processes your scheduled jobs, delivery records and Ethereal preview links appear here."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentSentEmails.map((email) => (
                <div key={email.id} className="py-3.5 flex items-center justify-between gap-3 text-sm hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      ✓
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {email.recipient}
                        </p>
                        {email.previewUrl && (
                          <a
                            href={email.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 transition-colors"
                            title="Inspect generated email on Ethereal"
                          >
                            <span>Ethereal Preview</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email.subject}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge status={email.status} />
                    <span className="text-[11px] text-slate-400">
                      {email.sentAt ? new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Sent'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};


