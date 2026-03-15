import { useEffect, useMemo, useState } from 'react';
import { ComplaintStatus, fetchWorkerAssignments, updateComplaintStatus } from '../services/complaintService';
import { cn } from '../utils/cn';

type WorkerTask = {
  _id: string;
  ticketId?: string;
  roomNumber?: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical' | string;
  status?: ComplaintStatus | string;
  photoUrl?: string;
  createdAt?: string;
};

const STATUS_OPTIONS: ComplaintStatus[] = ['pending', 'in-progress', 'completed'];

const statusBadge: Record<string, string> = {
  pending: 'bg-warning/10 text-warning-700 border-warning/30',
  'in-progress': 'bg-primary/10 text-primary-700 border-primary/30',
  completed: 'bg-success/10 text-success-700 border-success/30',
};

const priorityBadge: Record<string, string> = {
  low: 'border-neutral-200 text-neutral-600 bg-neutral-50',
  normal: 'border-neutral-200 text-neutral-700 bg-neutral-50',
  high: 'border-warning/40 text-warning-700 bg-warning/10',
  critical: 'border-danger/40 text-danger bg-danger/10',
};

const WorkerDashboard = () => {
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Record<string, ComplaintStatus>>({});

  const fetchTasks = async () => {
    try {
      const { complaints = [] } = await fetchWorkerAssignments();
      const typed = complaints as WorkerTask[];
      setTasks(typed);

      const defaults: Record<string, ComplaintStatus> = {};
      typed.forEach((task) => {
        const status = task.status as ComplaintStatus;
        defaults[task._id] = STATUS_OPTIONS.includes(status) ? status : 'pending';
      });
      setSelectedStatus(defaults);
    } catch {
      setError('Unable to load assigned tasks.');
      setTasks([]);
    } finally {
      setLoading(false);
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const stats = useMemo(() => {
    const pending = tasks.filter((task) => (task.status || 'pending') === 'pending').length;
    const inProgress = tasks.filter((task) => (task.status || 'pending') === 'in-progress').length;
    const completed = tasks.filter((task) => (task.status || 'pending') === 'completed').length;

    return {
      total: tasks.length,
      pending,
      inProgress,
      completed,
    };
  }, [tasks]);

  const handleStatusUpdate = async (taskId: string) => {
    const targetStatus = selectedStatus[taskId] || 'pending';

    setUpdatingId(taskId);
    setError('');
    try {
      await updateComplaintStatus(taskId, targetStatus);
      await fetchTasks();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to update task status.');
      setUpdatingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-surface-border bg-white p-5 shadow-soft">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Worker dashboard</p>
          <h2 className="mt-2 text-2xl font-semibold text-neutral-900">Assigned complaints</h2>
          <p className="text-sm text-neutral-500">Review task details, check evidence, and update repair status.</p>
        </div>
        <button
          type="button"
          onClick={fetchTasks}
          className="rounded-2xl border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Refresh
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total assigned" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} tone="pending" />
        <StatCard label="In progress" value={stats.inProgress} tone="in-progress" />
        <StatCard label="Completed" value={stats.completed} tone="completed" />
      </section>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-surface-border/70 bg-white px-4 py-6 text-sm text-neutral-500">
          Fetching tasks...
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-surface-border/80 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          No active assignments right now.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {tasks.map((task) => {
          const statusKey = (task.status || 'pending') as ComplaintStatus;
          const priorityKey = (task.priority || 'normal').toLowerCase();

          return (
            <article
              key={task._id}
              className="flex flex-col overflow-hidden rounded-3xl border border-surface-border bg-white shadow-soft"
            >
              {task.photoUrl ? (
                <div className="h-44 w-full overflow-hidden border-b border-surface-border bg-neutral-100">
                  <img src={task.photoUrl} alt={task.title || 'Complaint evidence'} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-44 w-full items-center justify-center border-b border-surface-border bg-neutral-50 text-sm text-neutral-400">
                  No photo evidence
                </div>
              )}

              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Room {task.roomNumber || '-'}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-neutral-900">{task.title || 'Maintenance task'}</h3>
                    <p className="text-[11px] text-neutral-500">
                      Created {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                      priorityBadge[priorityKey] || priorityBadge.normal,
                    )}
                  >
                    {task.priority || 'Normal'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className="rounded-full border border-neutral-200 px-3 py-1 text-neutral-600">
                    {task.category || 'General'}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-3 py-1',
                      statusBadge[statusKey] || 'border-neutral-200 text-neutral-600',
                    )}
                  >
                    {statusKey.replace('-', ' ')}
                  </span>
                </div>

                <p className="text-sm leading-6 text-neutral-600">{task.description || 'No issue description provided.'}</p>

                <div className="mt-auto rounded-2xl border border-surface-border/70 bg-neutral-25 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">Ticket</p>
                  <p className="text-sm font-semibold text-neutral-800">{task.ticketId || task._id.slice(-6)}</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={selectedStatus[task._id] || statusKey}
                      onChange={(event) =>
                        setSelectedStatus((prev) => ({
                          ...prev,
                          [task._id]: event.target.value as ComplaintStatus,
                        }))
                      }
                      className="rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-700"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      type="button"
                      disabled={updatingId === task._id}
                      onClick={() => handleStatusUpdate(task._id)}
                      className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-neutral-800 disabled:opacity-60"
                    >
                      {updatingId === task._id ? 'Updating...' : 'Update status'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const StatCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'pending' | 'in-progress' | 'completed';
}) => {
  const toneClass =
    tone === 'pending'
      ? 'border-warning/30 bg-warning/5'
      : tone === 'in-progress'
        ? 'border-primary/30 bg-primary/5'
        : tone === 'completed'
          ? 'border-success/30 bg-success/5'
          : 'border-surface-border bg-white';

  return (
    <div className={cn('rounded-2xl border p-4 shadow-soft', toneClass)}>
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
};

export default WorkerDashboard;
