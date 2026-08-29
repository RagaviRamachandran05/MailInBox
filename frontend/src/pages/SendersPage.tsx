import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Sender } from '../types';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Mail,
  Trash2,
} from 'lucide-react';

export const SendersPage: React.FC = () => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [etherealUser, setEtherealUser] = useState('');
  const [etherealPassword, setEtherealPassword] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [isDefault, setIsDefault] = useState(false);

  const { success, error } = useToast();

  const fetchSenders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/senders');
      if (res.data.success) {
        setSenders(res.data.data);
      }
    } catch (e: any) {
      error('Failed to load senders', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenders();
  }, []);

  const handleCreateSender = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/senders', {
        name,
        email,
        etherealUser: etherealUser || undefined,
        etherealPassword: etherealPassword || undefined,
        hourlyLimit: Number(hourlyLimit),
        isDefault,
      });

      if (res.data.success) {
        success('Sender added successfully');
        setModalOpen(false);
        setName('');
        setEmail('');
        setEtherealUser('');
        setEtherealPassword('');
        fetchSenders();
      }
    } catch (err: any) {
      error('Failed to create sender', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sender profile?')) return;
    try {
      await api.delete(`/senders/${id}`);
      success('Sender removed');
      fetchSenders();
    } catch (e: any) {
      error('Could not remove sender', e.response?.data?.message || e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              SMTP Sender Identities
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
              {senders.length} Active
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure multi-sender routing with individual hourly rate limits and Ethereal SMTP accounts.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Add New Sender
        </Button>
      </div>

      {/* Senders Grid */}
      {loading ? (
        <LoadingSpinner message="Fetching sender identities..." />
      ) : senders.length === 0 ? (
        <EmptyState
          title="No Senders Configured"
          description="Add a sender identity to assign specific rate limits and SMTP configurations."
          actionText="Add Sender"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {senders.map((sender) => (
            <div
              key={sender.id}
              className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 relative group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {sender.name}
                    </h3>
                    <p className="text-xs text-slate-500">{sender.email}</p>
                  </div>
                </div>

                {sender.isDefault && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                    Default
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Hourly Rate Limit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{sender.hourlyLimit} emails/hr</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>SMTP Provider:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">Ethereal Sandbox</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                <span>Created {new Date(sender.createdAt).toLocaleDateString()}</span>
                {!sender.isDefault && (
                  <button
                    onClick={() => handleDelete(sender.id)}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
                    title="Remove sender"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Sender Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Sender Identity"
        subtitle="Configure a new sender with specific hourly rate limit constraints"
      >
        <form onSubmit={handleCreateSender} className="space-y-4">
          <Input
            label="Display Name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="e.g. Marketing Outbound"
            required
          />

          <Input
            label="Sender Email Address"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="marketing@reachinbox.com"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ethereal User (Optional)"
              value={etherealUser}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEtherealUser(e.target.value)}
              placeholder="auto-generated if empty"
            />
            <Input
              label="Ethereal Password (Optional)"
              type="password"
              value={etherealPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEtherealPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Input
            label="Hourly Rate Limit"
            type="number"
            value={hourlyLimit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHourlyLimit(Number(e.target.value))}
            min={1}
            helperText="Maximum number of emails allowed per hour for this sender"
            required
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsDefault(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isDefault" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Set as default sender for new campaigns
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Sender
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
