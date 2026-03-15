import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchUserComplaints } from '../services/complaintService';
import { cn } from '../utils/cn';
import { ROUTES } from '../utils/routes';

type ComplaintStatus = 'pending' | 'in-progress' | 'completed' | 'rejected';

type Complaint = {
  _id: string;
  ticketId?: string;
  category?: string;
  location?: string;
  priority?: string;
  status?: ComplaintStatus;
  updatedAt?: string;
  createdAt?: string;
  assignedWorker?: {
    name?: string;
    email?: string;
    mobileNumber?: string;
  };
};

type Metric = {
  label: string;
  value: number | string;
  helper: string;
};

const statusTone: Record<ComplaintStatus, string> = {
  pending: 'bg-warning/10 text-warning-700 border-warning/30',
  'in-progress': 'bg-primary/10 text-primary-700 border-primary/30',
  completed: 'bg-success/10 text-success-700 border-success/30',
  rejected: 'bg-danger/10 text-danger-700 border-danger/30',
};

const getPriorityTone = (priority?: string) => {
  const normalized = (priority || 'normal').toLowerCase();
  if (normalized === 'high' || normalized === 'urgent') {
    return 'bg-danger/10 text-danger-700 border-danger/30';
  }
  if (normalized === 'medium') {
    return 'bg-warning/10 text-warning-700 border-warning/30';
  }
  if (normalized === 'low') {
    return 'bg-success/10 text-success-700 border-success/30';
  }
  return 'bg-neutral-50 text-neutral-700 border-neutral-200';
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const { complaints: rawComplaints = [] } = await fetchUserComplaints();
        const typedComplaints: Complaint[] = rawComplaints;
        const pending = typedComplaints.filter((c) => c.status === 'pending').length;
        const completed = typedComplaints.filter((c) => c.status === 'completed').length;

        setMetrics([
          {
            label: 'Total complaints',
            value: typedComplaints.length,
            helper: 'Lifetime issues you raised',
          },
          {
            label: 'Pending complaints',
            value: pending,
            helper: 'Awaiting worker dispatch',
          },
          {
            label: 'Completed complaints',
            value: completed,
            helper: 'Closed with resolution notes',
          },
        ]);

        const sorted = [...typedComplaints].sort((a, b) => {
          const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setRecentComplaints(sorted.slice(0, 6));
      } catch (err) {
        setError('Unable to load dashboard data right now.');
        setMetrics([
          { label: 'Total complaints', value: '—', helper: 'No data' },
          { label: 'Pending complaints', value: '—', helper: 'No data' },
          { label: 'Completed complaints', value: '—', helper: 'No data' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const cards = useMemo(
    () =>
      metrics.map((metric) => ({
        ...metric,
        value: loading ? '…' : metric.value,
      })),
    [metrics, loading],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Student overview</p>
          <h2 className="mt-2 text-2xl font-semibold text-neutral-900">
            Hi {user?.name || 'there'},
            {' '}
            <span className="font-normal text-neutral-700">welcome back.</span>
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Keep track of every complaint you raise and how quickly it is resolved.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 text-xs text-neutral-500 sm:flex-row sm:items-center sm:gap-4">
          <div className="order-2 sm:order-1 text-right">
            <p className="text-[11px] uppercase tracking-[0.2em]">Last synced</p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.complaintForm)}
            className="order-1 inline-flex items-center justify-center rounded-3xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Submit complaint
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-3xl border border-surface-border bg-gradient-to-br from-white to-neutral-50 p-6 shadow-soft"
          >
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">{card.label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900">{card.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{card.helper}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Recent complaints</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-900">Latest updates</h3>
            <p className="mt-1 text-xs text-neutral-500">Showing your most recent activity from the last few tickets.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.complaintHistory)}
            className="text-sm font-semibold text-primary hover:text-primary/80"
          >
            View all
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Desktop/tablet table view */}
        <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-surface-border/60 md:block">
          <table className="min-w-full divide-y divide-surface-border/60 text-left text-sm text-neutral-600">
            <thead>
              <tr className="bg-neutral-50 text-[11px] uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-semibold">Ticket</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Assigned worker</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60 bg-white">
              {!loading && recentComplaints.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-neutral-400">
                    No complaints found yet. Raise your first issue to see it here.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-neutral-400">
                    Loading complaints…
                  </td>
                </tr>
              )}
              {!loading &&
                recentComplaints.map((complaint) => {
                  const status = (complaint.status || 'pending') as ComplaintStatus;
                  return (
                    <tr key={complaint._id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-neutral-900">{complaint.ticketId || '—'}</td>
                      <td className="px-4 py-4 text-sm capitalize text-neutral-700">{complaint.category || '—'}</td>
                      <td className="px-4 py-4 text-sm text-neutral-700">{complaint.location || '—'}</td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex min-w-[96px] justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                            getPriorityTone(complaint.priority),
                          )}
                        >
                          {complaint.priority || 'Normal'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide', statusTone[status])}>
                          {status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-700">
                        {complaint.assignedWorker?.name ? (
                          <div>
                            <p className="font-semibold text-neutral-900">{complaint.assignedWorker.name}</p>
                            <p className="text-xs text-neutral-500">
                              {complaint.assignedWorker.email || complaint.assignedWorker.mobileNumber || 'Contact pending'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs uppercase tracking-wide text-neutral-400">Not assigned</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-500">{formatDateTime(complaint.updatedAt || complaint.createdAt)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="mt-6 space-y-4 md:hidden">
          {loading && (
            <div className="rounded-2xl border border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
              Loading complaints…
            </div>
          )}
          {!loading && recentComplaints.length === 0 && (
            <div className="rounded-2xl border border-dashed border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
              No complaints found yet. Raise your first issue to see it here.
            </div>
          )}
          {!loading &&
            recentComplaints.map((complaint) => {
              const status = (complaint.status || 'pending') as ComplaintStatus;
              return (
                <article
                  key={complaint._id}
                  className="rounded-2xl border border-surface-border/80 bg-white p-4 text-sm shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Ticket</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">{complaint.ticketId || '—'}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {complaint.category || '—'} • {complaint.location || 'Location not set'}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Assigned to{' '}
                        <span className="font-semibold text-neutral-800">
                          {complaint.assignedWorker?.name || '—'}
                        </span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                        statusTone[status],
                      )}
                    >
                      {status.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={cn(
                        'inline-flex min-w-[96px] justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                        getPriorityTone(complaint.priority),
                      )}
                    >
                      {complaint.priority || 'Normal'}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Updated {formatDateTime(complaint.updatedAt || complaint.createdAt)}
                    </span>
                  </div>
                </article>
              );
            })}
        </div>
      </section>
    </div>
  );
};

export default UserDashboard;
