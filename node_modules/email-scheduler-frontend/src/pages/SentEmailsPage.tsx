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
import {
  Search,
  ExternalLink,
  RefreshCw,
  MailCheck,
} from 'lucide-react';

export const SentEmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  const fetchSent = useCallback(async (page = 1, searchQuery = search) => {
    setLoading(true);
    try {
      let res;
      if (searchQuery.trim().length > 0) {
        res = await api.get('/emails/search', {
          params: { q: searchQuery, status: 'sent', page, limit: 15 },
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
        res = await api.get('/emails/sent', {
          params: { page, limit: 15 },
        });
        if (res.data.success) {
          setEmails(res.data.emails);
          setPagination(res.data.pagination);
        }
      }
    } catch (e: any) {
      error('Failed to load sent emails', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [search, error]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSent(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchSent]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <MailCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Sent & Delivered Logs
            </h1>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300">
              {pagination.total} Delivered
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            Real SMTP delivery logs with Ethereal email web previews.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => fetchSent(pagination.page)}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Search delivered emails by recipient or subject..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner message="Fetching delivery logs..." />
        ) : emails.length === 0 ? (
          <EmptyState
            title="No emails sent yet"
            description="Delivered campaigns and Ethereal preview links will appear here after workers process jobs."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Campaign Subject</th>
                  <th className="px-6 py-4">Delivery Timestamp</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ethereal Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {emails.map((email) => (
                  <tr
                    key={email.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                        ✓
                      </div>
                      <span>{email.recipient}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-700 dark:text-slate-300">
                      {email.subject}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {email.sentAt ? (
                        new Date(email.sentAt).toLocaleString()
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={email.status} />
                      {email.errorMessage && (
                        <p className="text-[10px] text-slate-500 mt-1 max-w-xs truncate" title={email.errorMessage}>
                          {email.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {email.previewUrl ? (
                        <a
                          href={email.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm"
                        >
                          <span>View Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          pagination={pagination}
          onPageChange={(page: number) => fetchSent(page, search)}
        />
      </div>
    </div>
  );
};
