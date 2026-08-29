import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Email, Pagination as PaginationType } from '../types';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Clock,
  Trash2,
  RefreshCw,
  Plus,
} from 'lucide-react';

export const ScheduledEmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { onOpenCompose } = useOutletContext<{ onOpenCompose: () => void }>();
  const { success, error } = useToast();

  const fetchScheduled = useCallback(async (page = 1, searchQuery = search) => {
    setLoading(true);
    try {
      let res;
      if (searchQuery.trim().length > 0) {
        res = await api.get('/emails/search', {
          params: { q: searchQuery, status: 'scheduled', page, limit: 15 },
        });
        if (res.data.success) {
          setEmails(res.data.data);
          setPagination({
            page,
            limit: 15,
            total: res.data.total,
            totalPages: Math.ceil(res.data.total / 15) || 1,
          });
        }
      } else {
        res = await api.get('/emails/scheduled', {
          params: { page, limit: 15 },
        });
        if (res.data.success) {
          setEmails(res.data.emails);
          setPagination(res.data.pagination);
        }
      }
    } catch (e: any) {
      error('Failed to load scheduled emails', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchScheduled(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchScheduled]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled email?')) return;
    setDeletingId(id);
    try {
      const res = await api.delete(`/emails/${id}`);
      if (res.data.success) {
        success('Scheduled email cancelled.');
        fetchScheduled(pagination.page);
      }
    } catch (e: any) {
      error('Could not cancel email', e.response?.data?.message || e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Scheduled Email Queue
            </h1>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
              {pagination.total} In Queue
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            Delayed BullMQ jobs waiting for their exact execution timestamp and rate limit slot.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => fetchScheduled(pagination.page)}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Queue
          </Button>
          <Button
            onClick={onOpenCompose}
            icon={<Plus className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
          >
            New Campaign
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Search queue by recipient email or subject..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading && emails.length === 0 ? (
          <LoadingSpinner message="Querying BullMQ scheduled jobs..." />
        ) : emails.length === 0 ? (
          <EmptyState
            title={search ? 'No matching scheduled emails found' : 'Queue is currently empty'}
            description={
              search
                ? 'Try refining your search keyword.'
                : 'Compose a new email campaign or launch a test demo to see jobs scheduled with delayed execution.'
            }
            actionText={search ? undefined : 'Schedule Campaign'}
            onAction={search ? undefined : onOpenCompose}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Recipient Email</th>
                  <th className="px-6 py-4">Campaign Subject</th>
                  <th className="px-6 py-4">Scheduled Execution</th>
                  <th className="px-6 py-4">Queue State</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {emails.map((email) => (
                  <tr
                    key={email.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                        @
                      </div>
                      <span>{email.recipient}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-700 dark:text-slate-300">
                      {email.subject}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{new Date(email.scheduledAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={email.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(email.id)}
                        disabled={deletingId === email.id}
                        className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        title="Cancel Scheduled Email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pagination={pagination}
          onPageChange={(page: number) => fetchScheduled(page, search)}
        />
      </div>
    </div>
  );
};
