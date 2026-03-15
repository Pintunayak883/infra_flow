import { useEffect, useMemo, useState } from 'react';
import { fetchUserComplaints } from '../services/complaintService';
import { cn } from '../utils/cn';

type ComplaintStatus = 'pending' | 'in-progress' | 'completed' | 'rejected';

type Complaint = {
  _id: string;
  ticketId?: string;
  roomNumber?: string;
  category?: string;
  status?: ComplaintStatus;
  priority?: string;
  createdAt?: string;
  description?: string;
};

const statusBadge: Record<ComplaintStatus, string> = {
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

const ComplaintHistory = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { complaints: userComplaints = [] } = await fetchUserComplaints();
        setComplaints(userComplaints as Complaint[]);
      } catch (err) {
        setError('Unable to load complaint history right now.');
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formattedComplaints = useMemo(() => complaints.slice().sort((a, b) => {
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  }), [complaints]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-6">
          <div className="text-2xl">📚</div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Complaint history</p>
            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">All submissions</h2>
          </div>
        </div>
        <p className="mb-4 text-sm text-neutral-600 sm:mb-6">
          Review past complaints, statuses, and priority levels.
        </p>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-600">
            Showing <span className="font-semibold text-neutral-900">{formattedComplaints.length}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Sort by:</span>
            <select className="min-h-[36px] rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs sm:min-h-[40px]">
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Status</option>
            </select>
          </div>
        </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Desktop/tablet table view */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-surface-border/60 lg:block">
        <table className="min-w-full divide-y divide-surface-border/60 text-left text-sm text-neutral-600">
          <thead>
            <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3 font-semibold">Complaint ID</th>
              <th className="px-4 py-3 font-semibold">Room</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60 bg-white">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-400">
                  Loading complaints…
                </td>
              </tr>
            )}
            {!loading && formattedComplaints.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-400">
                  No complaint records yet.
                </td>
              </tr>
            )}
            {!loading &&
              formattedComplaints.map((complaint) => {
                const status = (complaint.status || 'pending') as ComplaintStatus;
                return (
                  <tr key={complaint._id} className="transition-colors hover:bg-neutral-50/60">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-neutral-900">
                      {complaint.ticketId || complaint._id.slice(-6)}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-700">{complaint.roomNumber || '—'}</td>
                    <td className="px-4 py-4 text-sm capitalize text-neutral-700">{complaint.category || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide', statusBadge[status])}>
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
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-500">
                      {complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-4 lg:hidden">
        {loading && (
          <div className="rounded-xl border border-surface-border/60 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
            Loading complaints…
          </div>
        )}
        {!loading && formattedComplaints.length === 0 && (
          <div className="rounded-xl border border-dashed border-surface-border/60 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
            No complaint records yet.
          </div>
        )}
        {!loading &&
          formattedComplaints.map((complaint) => {
            const status = (complaint.status || 'pending') as ComplaintStatus;
            return (
              <article
                key={complaint._id}
                className="rounded-xl border border-surface-border/80 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-neutral-900">
                        {complaint.ticketId || `#${complaint._id.slice(-6)}`}
                      </p>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          statusBadge[status],
                        )}
                      >
                        {status.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mb-2">
                      {complaint.roomNumber || 'Room not specified'} • {complaint.category || 'General issue'}
                    </p>
                    <p className="text-sm text-neutral-700 line-clamp-2">
                      {complaint.description || 'No description provided'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                      getPriorityTone(complaint.priority),
                    )}
                  >
                    {complaint.priority || 'Normal'} Priority
                  </span>
                  <span className="text-xs text-neutral-500">
                    {complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : '—'}
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

export default ComplaintHistory;
