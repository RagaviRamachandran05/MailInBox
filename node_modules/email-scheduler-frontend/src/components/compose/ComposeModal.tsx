import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Sender } from '../../types';
import confetti from 'canvas-confetti';
import {
  Upload,
  Send,
  CheckCircle2,
  FileText,
  Layers,
  Zap,
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [subject, setSubject] = useState('Welcome to our platform & product updates');
  const [body, setBody] = useState(
    'Hello,\n\nWe are thrilled to welcome you! This message was scheduled and delivered safely via our automated background queue.\n\nBest regards,\nThe Outreach Team'
  );
  const [startTime, setStartTime] = useState(() => {
    const now = new Date(Date.now() + 60000); // 1 min in future
    return now.toISOString().slice(0, 16);
  });
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2000);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');

  // CSV / Recipients state
  const [rawTextRecipients, setRawTextRecipients] = useState('');
  const [validRecipients, setValidRecipients] = useState<string[]>([]);
  const [invalidRecipients, setInvalidRecipients] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error, warning } = useToast();

  // Load senders
  useEffect(() => {
    if (isOpen) {
      api
        .get('/senders')
        .then((res) => {
          if (res.data.success && res.data.data) {
            setSenders(res.data.data);
            const defaultSender = res.data.data.find((s: Sender) => s.isDefault);
            if (defaultSender) setSelectedSenderId(defaultSender.id);
            else if (res.data.data.length > 0) setSelectedSenderId(res.data.data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Client-side CSV/Text parsing & validation
  const parseEmails = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const tokens = text
      .split(/[\r\n,;]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && !t.startsWith('email') && !t.startsWith('recipient'));

    const validSet = new Set<string>();
    const invalidList: string[] = [];
    let duplicates = 0;

    tokens.forEach((token) => {
      if (emailRegex.test(token)) {
        if (validSet.has(token)) {
          duplicates++;
        } else {
          validSet.add(token);
        }
      } else {
        invalidList.push(token);
      }
    });

    setValidRecipients(Array.from(validSet));
    setInvalidRecipients(invalidList);
    setDuplicateCount(duplicates);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawTextRecipients(content);
      parseEmails(content);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawTextRecipients(val);
    setFileName(null);
    parseEmails(val);
  };

  const handleQuickPreset = (count: number) => {
    const sample = Array.from({ length: count }, (_, i) => `lead.${i + 1}@acme-corp.com`).join('\n');
    setRawTextRecipients(sample);
    setFileName(`sample_${count}_leads.csv`);
    parseEmails(sample);
  };

  const handleQuickTimePreset = (minutes: number) => {
    const target = new Date(Date.now() + minutes * 60000);
    setStartTime(target.toISOString().slice(0, 16));
  };

  const calculateTotalDuration = () => {
    if (validRecipients.length <= 1) return 'Instant';
    const totalMs = (validRecipients.length - 1) * delayBetweenEmails;
    const seconds = Math.round(totalMs / 1000);
    if (seconds < 60) return `~${seconds} seconds`;
    const mins = Math.round(seconds / 60);
    return `~${mins} minute${mins > 1 ? 's' : ''}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      return warning('Subject is required');
    }
    if (!body.trim()) {
      return warning('Email body is required');
    }
    if (validRecipients.length === 0) {
      return error('No valid recipients', 'Please upload a CSV or paste valid email addresses.');
    }

    setLoading(true);
    try {
      const payload = {
        subject,
        body,
        recipients: validRecipients,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails: Number(delayBetweenEmails),
        hourlyLimit: Number(hourlyLimit),
        senderId: selectedSenderId || undefined,
      };

      const res = await api.post('/emails/schedule', payload);

      if (res.data.success) {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#f43f5e', '#f59e0b', '#7c3aed', '#ec4899'],
          });
        } catch (e) {}

        success(
          'Campaign Scheduled Successfully!',
          `${res.data.data.scheduledEmails} emails enqueued into BullMQ delayed queue.`
        );

        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      error(
        'Scheduling Failed',
        err.response?.data?.message || 'An error occurred while scheduling campaign.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose & Schedule Email Campaign"
      subtitle="Configure sender mailbox, email message content, and audience CSV list"
      maxWidth="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: Message Content & Sender (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Step 1 Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Email Message Details
              </h4>
            </div>

            {/* Sender Identity Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Sender Mailbox
              </label>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-medium"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} • {s.email} {s.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Campaign Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Important Product Updates & Announcements"
                required
              />
            </div>

            {/* Body Editor */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Email Body Content
              </label>
              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email message content here..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-sans leading-relaxed"
                required
              />
            </div>
          </div>

          {/* RIGHT PANEL: Audience & Schedule Engine (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Step 2 Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Audience & Schedule
              </h4>
            </div>

            {/* Recipients CSV / Paste Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Recipients List
                </label>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px]">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(5)}
                    className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] hover:bg-indigo-100 transition-colors"
                  >
                    5 Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(20)}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-200 transition-colors"
                  >
                    20 Leads
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-2xl p-3 text-center cursor-pointer transition-colors bg-slate-50/60 dark:bg-slate-900/40 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-5 h-5 mx-auto text-slate-400 group-hover:text-indigo-500 mb-1 transition-colors" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {fileName ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> {fileName}
                    </span>
                  ) : (
                    'Upload CSV or TXT File'
                  )}
                </p>
                <p className="text-[10px] text-slate-400">Click to browse or drop file here</p>
              </div>

              {/* Manual Entry Textarea */}
              <textarea
                rows={2}
                value={rawTextRecipients}
                onChange={handleTextChange}
                placeholder="Or paste emails separated by commas or new lines..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-mono"
              />

              {/* Live Validation Counter Badges */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{validRecipients.length} Valid Leads</span>
                </div>
                {invalidRecipients.length > 0 && (
                  <span className="text-slate-500 font-semibold text-[11px]">
                    {invalidRecipients.length} invalid skipped
                  </span>
                )}
                {duplicateCount > 0 && (
                  <span className="text-slate-500 font-semibold text-[11px]">
                    {duplicateCount} dupes removed
                  </span>
                )}
              </div>
            </div>

            {/* Timing & Delay Grid */}
            <div className="space-y-3 pt-1">
              {/* Start Time with Shortcuts */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Dispatch Start Time
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <button
                      type="button"
                      onClick={() => handleQuickTimePreset(1)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Now (+1m)
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleQuickTimePreset(15)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      +15m
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              {/* Delay & Rate Limit Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Stagger Delay
                  </label>
                  <select
                    value={delayBetweenEmails}
                    onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    <option value={2000}>2s (Standard)</option>
                    <option value={5000}>5s (Gentle)</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Hourly Limit
                  </label>
                  <select
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    <option value={200}>200/hr (Default)</option>
                    <option value={100}>100/hr</option>
                    <option value={50}>50/hr</option>
                    <option value={3}>3/hr (Demo Limit)</option>
                  </select>
                </div>
              </div>

              {/* Live Calculation Preview Banner */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Execution Estimate</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  {validRecipients.length > 0 ? (
                    <>
                      <strong>{validRecipients.length} emails</strong> will take approx.{' '}
                      <strong className="text-indigo-600 dark:text-indigo-400">{calculateTotalDuration()}</strong> to dispatch via BullMQ worker.
                    </>
                  ) : (
                    'Add leads to view duration calculation.'
                  )}
                </p>
              </div>

            </div>

          </div>
        </div>

        {/* FOOTER BAR */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>
              {validRecipients.length > 0 ? (
                <>Ready to dispatch <strong>{validRecipients.length} emails</strong> to BullMQ queue.</>
              ) : (
                'Select leads or load CSV to activate scheduler.'
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={validRecipients.length === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              icon={<Send className="w-4 h-4" />}
            >
              {loading ? 'Enqueuing Jobs...' : `Schedule ${validRecipients.length} Emails`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

