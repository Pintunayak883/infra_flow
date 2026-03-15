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
  roomNumber?: string;
  category?: string;
  status?: ComplaintStatus;
  priority?: string;
  updatedAt?: string;
  createdAt?: string;
  description?: string;
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
  icon: string;
  color: string;
};

const statusTone: Record<ComplaintStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'in-progress': 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const getPriorityTone = (priority?: string) => {
  const normalized = (priority || 'normal').toLowerCase();
  if (normalized === 'high' || normalized === 'urgent') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (normalized === 'medium') {
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  }
  if (normalized === 'low') {
    return 'bg-green-50 text-green-700 border-green-200';
  }
  return 'bg-gray-50 text-gray-700 border-gray-200';
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

const StudentDashboard = () => {
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
        const inProgress = typedComplaints.filter((c) => c.status === 'in-progress').length;
        const completed = typedComplaints.filter((c) => c.status === 'completed').length;

        setMetrics([
          {
            label: 'Total complaints',
            value: typedComplaints.length,
            helper: 'Lifetime issues reported',
            icon: '📋',
            color: 'from-blue-500 to-blue-600',
          },
          {
            label: 'Pending',
            value: pending,
            helper: 'Awaiting response',
            icon: '⏳',
            color: 'from-yellow-500 to-yellow-600',
          },
          {
            label: 'In progress',
            value: inProgress,
            helper: 'Being worked on',
            icon: '🔧',
            color: 'from-blue-500 to-blue-600',
          },
          {
            label: 'Completed',
            value: completed,
            helper: 'Successfully resolved',
            icon: '✅',
            color: 'from-green-500 to-green-600',
          },
        ]);

        const sorted = [...typedComplaints].sort((a, b) => {
          const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setRecentComplaints(sorted.slice(0, 5));
      } catch (err) {
        setError('Unable to load dashboard data right now.');
        setMetrics([
          { label: 'Total complaints', value: '—', helper: 'No data', icon: '📋', color: 'from-gray-500 to-gray-600' },
          { label: 'Pending', value: '—', helper: 'No data', icon: '⏳', color: 'from-gray-500 to-gray-600' },
          { label: 'In progress', value: '—', helper: 'No data', icon: '🔧', color: 'from-gray-500 to-gray-600' },
          { label: 'Completed', value: '—', helper: 'No data', icon: '✅', color: 'from-gray-500 to-gray-600' },
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

  const quickActions = [
    {
      title: 'Report Issue',
      description: 'Submit a new complaint with photos',
      icon: '📷',
      action: () => navigate(ROUTES.complaintForm),
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      textColor: 'text-blue-700',
    },
    {
      title: 'Scan QR Code',
      description: 'Quick room identification',
      icon: '📱',
      action: () => navigate(ROUTES.complaintScan),
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      textColor: 'text-purple-700',
    },
    {
      title: 'View History',
      description: 'All your past complaints',
      icon: '📚',
      action: () => navigate(ROUTES.complaintHistory),
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
      textColor: 'text-green-700',
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Student Dashboard</p>
          <h1 className="mt-1.5 text-xl font-bold text-neutral-900 sm:mt-2 sm:text-2xl lg:text-3xl">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="mt-1 text-xs text-neutral-600 sm:text-sm">
            Track your maintenance requests and report campus issues quickly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-neutral-500">
            <p className="text-[11px] uppercase tracking-[0.2em]">Last updated</p>
            <p className="text-sm font-semibold text-neutral-800">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <section className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <button
            key={action.title}
            onClick={action.action}
            className={cn(
              'group flex min-h-[88px] items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-md sm:min-h-[108px] sm:gap-4 sm:p-6',
              action.color,
            )}
          >
            <div className={cn('text-2xl', action.textColor)}>{action.icon}</div>
            <div className="min-w-0 flex-1">
              <h3 className={cn('truncate text-sm font-semibold sm:text-base', action.textColor)}>{action.title}</h3>
              <p className="mt-1 text-xs text-neutral-600 sm:text-sm">{action.description}</p>
            </div>
            <div className={cn('text-xl transition-transform group-hover:translate-x-1', action.textColor)}>
              →
            </div>
          </button>
        ))}
      </section>

      {/* Metrics Cards */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900 sm:mb-4 sm:text-lg">Your Complaint Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl border border-surface-border bg-gradient-to-br from-white to-neutral-50 p-4 shadow-sm transition hover:shadow-md sm:p-6"
            >
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">{card.value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{card.helper}</p>
                </div>
                <div className="text-2xl">{card.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 sm:text-lg">Recent Activity</h2>
            <p className="text-xs text-neutral-600 sm:text-sm">Your latest complaint updates</p>
          </div>
          <button
            onClick={() => navigate(ROUTES.complaintHistory)}
            className="rounded-xl px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/5 hover:text-primary/80"
          >
            View all →
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Desktop Table */}
        <div className="mt-6 hidden overflow-x-auto rounded-xl border border-surface-border/60 lg:block">
          <table className="min-w-full divide-y divide-surface-border/60 text-left text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Ticket
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Room
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Issue
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Priority
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Assigned worker
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60 bg-white">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-500">
                    Loading recent complaints…
                  </td>
                </tr>
              )}
              {!loading && recentComplaints.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-500">
                    No complaints yet. Submit your first issue to get started!
                  </td>
                </tr>
              )}
              {!loading &&
                recentComplaints.map((complaint) => {
                  const status = (complaint.status || 'pending') as ComplaintStatus;
                  return (
                    <tr key={complaint._id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-neutral-900">
                        {complaint.ticketId || `#${complaint._id.slice(-6)}`}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-700">
                        {complaint.roomNumber || '—'}
                      </td>
                      <td className="px-4 py-4 text-sm capitalize text-neutral-700">
                        {complaint.category || 'General'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                            statusTone[status],
                          )}
                        >
                          {status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex min-w-[80px] justify-center rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                            getPriorityTone(complaint.priority),
                          )}
                        >
                          {complaint.priority || 'Normal'}
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
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-500">
                        {formatDateTime(complaint.updatedAt || complaint.createdAt)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="mt-6 space-y-4 lg:hidden">
          {loading && (
            <div className="rounded-xl border border-surface-border/60 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
              Loading recent complaints…
            </div>
          )}
          {!loading && recentComplaints.length === 0 && (
            <div className="rounded-xl border border-dashed border-surface-border/60 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
              No complaints yet. Submit your first issue to get started!
            </div>
          )}
          {!loading &&
            recentComplaints.map((complaint) => {
              const status = (complaint.status || 'pending') as ComplaintStatus;
              return (
                <article
                  key={complaint._id}
                  className="rounded-xl border border-surface-border/80 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900">
                          {complaint.ticketId || `#${complaint._id.slice(-6)}`}
                        </p>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            statusTone[status],
                          )}
                        >
                          {status.replace('-', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {complaint.roomNumber || 'Room not specified'} • {complaint.category || 'General issue'}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Assigned to{' '}
                        <span className="font-semibold text-neutral-800">
                          {complaint.assignedWorker?.name || '—'}
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-neutral-700 line-clamp-2">
                        {complaint.description || 'No description provided'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                        getPriorityTone(complaint.priority),
                      )}
                    >
                      {complaint.priority || 'Normal'} Priority
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatDateTime(complaint.updatedAt || complaint.createdAt)}
                    </span>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      {/* Help Section */}
      <section className="rounded-2xl border border-surface-border bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="font-semibold text-neutral-900">Need Help?</h3>
            <p className="mt-1 text-sm text-neutral-700">
              Having trouble with the complaint system? Here are some tips:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-neutral-600">
              <li>• Include clear photos to help maintenance teams understand the issue</li>
              <li>• Be specific about room numbers and exact locations</li>
              <li>• Use the voice input feature for detailed descriptions</li>
              <li>• Check complaint status regularly for updates</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;