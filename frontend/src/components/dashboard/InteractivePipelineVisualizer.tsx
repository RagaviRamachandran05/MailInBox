import React from 'react';
import { QueueStats, DashboardStats } from '../../types';
import {
  Inbox,
  Clock,
  Zap,
  Radio,
  MailCheck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface InteractivePipelineVisualizerProps {
  queueStats: QueueStats | null;
  stats: DashboardStats | null;
  onOpenCompose: () => void;
}

export const InteractivePipelineVisualizer: React.FC<InteractivePipelineVisualizerProps> = ({
  queueStats,
  stats,
  onOpenCompose,
}) => {
  const delayedCount = queueStats?.delayed ?? stats?.scheduledCount ?? 0;
  const activeCount = queueStats?.active ?? 0;
  const deliveredCount = stats?.sentCount ?? 0;

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Real-Time Queue Telemetry Pipeline
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                LIVE
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive visualization of asynchronous BullMQ background workers and distributed rate limiter
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCompose}
          className="self-start sm:self-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1.5"
        >
          <span>Enqueue New Batch</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Visual Pipeline Stream */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        
        {/* Node 1: Inbound Lead Source */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-3 group hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Stage 01</span>
            <Inbox className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">CSV / API</div>
            <p className="text-[11px] text-slate-500">Inbound Lead Stream</p>
          </div>
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Auto-deduplicated
          </div>
        </div>

        {/* Node 2: BullMQ Delayed Engine */}
        <div className="p-4 rounded-2xl bg-sky-500/10 dark:bg-sky-950/30 border border-sky-300/60 dark:border-sky-800/60 flex flex-col justify-between space-y-3 group hover:border-sky-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-sky-400">Stage 02</span>
            <Clock className="w-4 h-4 text-sky-500 animate-spin-slow" />
          </div>
          <div>
            <div className="text-2xl font-black text-sky-600 dark:text-sky-400">{delayedCount}</div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">BullMQ Delayed Slot</p>
          </div>
          <div className="pt-2 border-t border-sky-200 dark:border-sky-900/60 text-[10px] text-sky-700 dark:text-sky-300 font-semibold">
            2,000ms Stagger Interval
          </div>
        </div>

        {/* Node 3: Redis Distributed Rate Limiter */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-300/60 dark:border-indigo-800/60 flex flex-col justify-between space-y-3 group hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Stage 03</span>
            <Zap className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">200 / hr</div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Redis Lua Limiter</p>
          </div>
          <div className="pt-2 border-t border-indigo-200 dark:border-indigo-900/60 text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
            Auto-Shifts Overflow
          </div>
        </div>

        {/* Node 4: Worker Concurrency Pool */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300/60 dark:border-slate-700 flex flex-col justify-between space-y-3 group hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">Stage 04</span>
            <Radio className="w-4 h-4 text-indigo-500 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{activeCount > 0 ? activeCount : '5 Active'}</div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Parallel Workers</p>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
            Exponential Backoff
          </div>
        </div>

        {/* Node 5: Ethereal SMTP Delivered */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-800/60 flex flex-col justify-between space-y-3 group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Stage 05</span>
            <MailCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{deliveredCount}</div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Dispatched & Logged</p>
          </div>
          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/60 text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
            Web Previews Ready
          </div>
        </div>

      </div>

      {/* Live Pulsing Pipeline Connector Bar */}
      <div className="hidden md:block w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 pipeline-flow" />
    </div>
  );
};
