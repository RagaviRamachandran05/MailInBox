import React, { useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import confetti from 'canvas-confetti';
import {
  Zap,
  Play,
  Flame,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface InteractiveDemoSimulatorProps {
  onRefreshTrigger: () => void;
}

export const InteractiveDemoSimulator: React.FC<InteractiveDemoSimulatorProps> = ({
  onRefreshTrigger,
}) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const { success, error } = useToast();

  const handleSimulateQuickBatch = async (leadCount: number, limit = 200) => {
    setRunning(true);
    setProgress(15);
    setActiveStep(`Generating ${leadCount} test lead profiles...`);

    try {
      const recipients = Array.from(
        { length: leadCount },
        (_, i) => `live.demo.${Date.now().toString().slice(-4)}.${i + 1}@aura-enterprise.io`
      );

      setProgress(40);
      setActiveStep('Enqueuing into BullMQ delayed queue (2s interval)...');

      const payload = {
        subject: `[LIVE DEMO] High-Priority System Update & Notification`,
        body: `Hello,\n\nThis is an automated staggered dispatch processed live via BullMQ worker concurrency and Redis Lua rate limiting.\n\nExecution Timestamp: ${new Date().toISOString()}`,
        recipients,
        startTime: new Date(Date.now() + 1000).toISOString(),
        delayBetweenEmails: 2000,
        hourlyLimit: limit,
      };

      const res = await api.post('/emails/schedule', payload);

      if (res.data.success) {
        setProgress(85);
        setActiveStep('Worker is actively consuming jobs...');

        try {
          confetti({
            particleCount: 75,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#6366f1', '#38bdf8', '#10b981', '#ffffff'],
          });
        } catch (e) {}

        setTimeout(() => {
          setProgress(100);
          setActiveStep('Complete! Dispatched successfully.');
          success(
            'Live Demo Batch Enqueued!',
            `${leadCount} emails scheduled. Watch them dispatch in real-time below!`
          );
          onRefreshTrigger();
          setTimeout(() => {
            setRunning(false);
            setProgress(0);
            setActiveStep(null);
          }, 3000);
        }, 1200);
      }
    } catch (err: any) {
      error('Simulation Failed', err.response?.data?.message || 'Could not trigger test campaign.');
      setRunning(false);
      setProgress(0);
      setActiveStep(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-slate-900 border border-slate-800 p-6 text-white shadow-2xl space-y-5">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white">
                Interactive Campaign Dispatch Simulator
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                1-CLICK DEMO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Trigger instant real-time staggered email dispatches and watch BullMQ background workers in action.
            </p>
          </div>
        </div>

        {/* Action Preset Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSimulateQuickBatch(3, 200)}
            disabled={running}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Launch 3-Lead Batch (2s Delay)</span>
          </button>

          <button
            onClick={() => handleSimulateQuickBatch(5, 3)}
            disabled={running}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
            title="Schedules 5 emails with 3/hr limit to demonstrate rate limit shift"
          >
            <Flame className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test Rate-Limit Shift (3/hr)</span>
          </button>
        </div>
      </div>

      {/* Live Simulation Progress Bar */}
      {running && (
        <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {activeStep}
            </span>
            <span className="font-mono font-bold text-slate-300">{progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-slate-300">
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span><strong>Stagger Spacing:</strong> 2,000ms pause between recipients</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span><strong>Audience:</strong> Fast CSV & Lead List Import</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span><strong>Zero Duplicate:</strong> Redis lock idempotency</span>
        </div>
      </div>

    </div>
  );
};
