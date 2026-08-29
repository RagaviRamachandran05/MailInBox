import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SlackStatus } from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import {
  MessageSquare,
  AlertTriangle,
  Radio,
  ExternalLink,
  Server,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const { success, error } = useToast();

  const fetchSlackStatus = async () => {
    try {
      const res = await api.get('/slack/status');
      if (res.data.success) {
        setSlackStatus(res.data.data);
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchSlackStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get('slack') === 'success') {
      success('Slack Connected!', 'Automated rate limit alerts are now active for your workspace.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('slack') === 'error') {
      error('Slack Connection Failed', 'Please verify your Slack OAuth credentials in .env');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnectSlack = async () => {
    try {
      const res = await api.get('/slack/connect');
      if (res.data.success && res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err: any) {
      error(
        'Slack OAuth Not Configured',
        err.response?.data?.message || 'Please configure SLACK_CLIENT_ID & SLACK_CLIENT_SECRET in backend .env'
      );
    }
  };

  const [testingSlack, setTestingSlack] = useState(false);

  const handleTestSlack = async () => {
    setTestingSlack(true);
    try {
      const res = await api.post('/slack/test');
      if (res.data.success) {
        success('Slack Notification Sent!', 'Check your Slack channel for the live confirmation alert.');
      }
    } catch (err: any) {
      error('Slack Test Failed', err.response?.data?.message || 'Could not send test message to Slack.');
    } finally {
      setTestingSlack(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Integrations & System Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage Slack notifications, live BullMQ monitoring, and distributed engine parameters.
        </p>
      </div>

      {/* Slack Integration Card */}
      <div className="p-6 rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-300/60 dark:border-emerald-900/60 shadow-sm">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Slack Real-Time Notifications
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive instant alerts whenever a sender hits their hourly limit and BullMQ auto-reschedules remaining emails.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {slackStatus.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected: {slackStatus.teamName || 'Webhook Active'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Not Connected</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            ⚡ Automated Deduplicated Alert Workflow:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>When the distributed rate limit is reached, BullMQ reschedules jobs to the next hour.</li>
            <li>A real Slack notification block is dispatched to your connected channel.</li>
            <li>Redis deduplication key (<code className="text-indigo-600 dark:text-indigo-400 font-mono">slack-rate-limit-notified</code>) prevents spam across multiple concurrent workers.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-400 font-medium">
            {slackStatus.connected ? 'Your Slack Webhook is active and receiving alerts.' : 'Connect your Slack team.'}
          </span>

          <div className="flex items-center gap-3">
            {slackStatus.connected && (
              <Button
                variant="secondary"
                onClick={handleTestSlack}
                loading={testingSlack}
                icon={<MessageSquare className="w-4 h-4" />}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Send Test Alert to Slack
              </Button>
            )}

            {!slackStatus.connected && (
              <Button
                onClick={handleConnectSlack}
                icon={<MessageSquare className="w-4 h-4" />}
              >
                Connect Slack Workspace
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bull Board Monitoring Card */}
      <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Bull Board Live Dashboard
              </h2>
              <p className="text-xs text-slate-500">
                Direct visual dashboard of the BullMQ Redis queue state.
              </p>
            </div>
          </div>

          <a
            href="/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            <span>Open /admin/queues</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <p className="text-xs text-slate-500">
          Provides real-time inspection for Waiting, Active, Delayed, Completed, and Failed jobs with retry capabilities.
        </p>
      </div>

      {/* Engine Architecture Parameters Card */}
      <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Active System Runtime Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex justify-between">
            <span className="text-slate-500">BullMQ Worker Concurrency:</span>
            <span className="font-bold text-slate-900 dark:text-white">5 parallel jobs</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex justify-between">
            <span className="text-slate-500">Minimum Inter-Email Delay:</span>
            <span className="font-bold text-slate-900 dark:text-white">2,000 ms</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex justify-between">
            <span className="text-slate-500">Distributed Rate Limiter:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Redis Lua Atomic Counter</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex justify-between">
            <span className="text-slate-500">Full-Text Search Engine:</span>
            <span className="font-bold text-purple-600">Elasticsearch 8.x</span>
          </div>
        </div>
      </div>
    </div>
  );
};
