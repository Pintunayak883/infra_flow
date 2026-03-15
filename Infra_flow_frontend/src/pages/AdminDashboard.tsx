import { ReactNode, useEffect, useMemo, useState } from 'react';
import { assignWorkerToComplaint, fetchAllComplaints, updateComplaintStatus } from '../services/complaintService';
import { fetchAdminDashboardData } from '../services/dashboardService';
import { useNotifications } from '../providers/RealtimeProvider';
import { cn } from '../utils/cn';

type Totals = {
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
};

type WorkerWorkload = {
  workerId: string;
  name: string;
  availability: string;
  currentLoad: number;
  maxLoad: number;
  specialization?: string;
  sla?: number;
};

type CostApprovalStatus = 'pending' | 'approved' | 'rejected';

type CostApproval = {
  id: string;
  department: string;
  asset: string;
  amount: number;
  requestedBy: string;
  status: CostApprovalStatus;
  eta: string;
};

type AssetRepairStat = {
  assetId: string;
  name: string;
  location?: string;
  assetTag?: string;
  assetType?: string;
  repairsLast30Days: number;
  lastRepairDate?: string;
  downtimeHours?: number;
};

type AdminComplaintStatus = 'pending' | 'in-progress' | 'completed' | 'rejected';

type AdminComplaint = {
  _id: string;
  ticketId?: string;
  roomNumber?: string;
  category?: string;
  status?: AdminComplaintStatus;
  priority?: string;
  createdAt?: string;
  assignedWorker?: {
    _id?: string;
    name?: string;
  };
};

interface AdminDashboardData {
  totals: Totals;
  complaintsByCategory: Record<string, number>;
  complaintsPerMonth: Array<{ month: string; count: number }>;
  workerWorkload: WorkerWorkload[];
  workerRoster?: WorkerWorkload[];
  costApprovals?: CostApproval[];
  assetRepairStats?: AssetRepairStat[];
}

const DEFAULT_DATA: AdminDashboardData = {
  totals: {
    total: 0,
    pending: 0,
    completed: 0,
    inProgress: 0,
  },
  complaintsByCategory: {},
  complaintsPerMonth: [],
  workerWorkload: [],
  workerRoster: [],
  costApprovals: [],
  assetRepairStats: [],
};

const sectionLinks = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'complaints', label: 'Complaints' },
  { id: 'workers', label: 'Workers' },
  { id: 'approvals', label: 'Cost Approvals' },
  { id: 'alerts', label: 'Risk Alerts' },
];

const AdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<string>('');
  const [complaintsLoading, setComplaintsLoading] = useState<boolean>(true);
  const [complaintsError, setComplaintsError] = useState('');

  const [costApprovals, setCostApprovals] = useState<CostApproval[]>([]);

  const [selectedWorkers, setSelectedWorkers] = useState<Record<string, string>>({});
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, AdminComplaintStatus>>({});
  const [assigningIds, setAssigningIds] = useState<Record<string, boolean>>({});
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const { notifications } = useNotifications();

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const dashboardData = await fetchAdminDashboardData();
      const payload: AdminDashboardData = {
        ...DEFAULT_DATA,
        ...(dashboardData || {}),
      };
      payload.workerRoster = payload.workerRoster || payload.workerWorkload;
      payload.costApprovals = payload.costApprovals || [];
      payload.complaintsPerMonth = payload.complaintsPerMonth || [];
      payload.assetRepairStats = payload.assetRepairStats || [];

      setData(payload);
      setCostApprovals(payload.costApprovals || []);
    } catch {
      setError('Unable to load analytics right now.');
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async (status?: string) => {
    setComplaintsLoading(true);
    setComplaintsError('');
    try {
      const filters = status ? { status } : undefined;
      const { complaints: payload = [] } = await fetchAllComplaints(filters);
      const typedComplaints = payload as AdminComplaint[];
      setComplaints(typedComplaints);

      const initialStatuses: Record<string, AdminComplaintStatus> = {};
      typedComplaints.forEach((item) => {
        initialStatuses[item._id] = (item.status || 'pending') as AdminComplaintStatus;
      });
      setSelectedStatuses(initialStatuses);
    } catch {
      setComplaintsError('Unable to load complaints for admin view.');
      setComplaints([]);
    } finally {
      setComplaintsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchComplaints(complaintStatusFilter || undefined);
  }, [complaintStatusFilter]);

  const hasNewComplaintBadge = useMemo(
    () => notifications.some((note) => note.title === 'New complaint submitted'),
    [notifications],
  );

  const categorySeries = useMemo(() => {
    const entries = Object.entries(data.complaintsByCategory || {});
    if (!entries.length) return [];
    const max = Math.max(...entries.map(([, value]) => value));
    return entries.map(([label, value]) => ({ label, value, percent: max ? (value / max) * 100 : 0 }));
  }, [data.complaintsByCategory]);

  const monthSeries = useMemo(() => {
    if (!data.complaintsPerMonth?.length) return [];
    const max = Math.max(...data.complaintsPerMonth.map((item) => item.count));
    return data.complaintsPerMonth.map((item) => ({ ...item, percent: max ? (item.count / max) * 100 : 0 }));
  }, [data.complaintsPerMonth]);

  const workerSeries = useMemo(() => {
    if (!data.workerWorkload?.length) return [];
    return data.workerWorkload.map((worker) => ({
      ...worker,
      percent: worker.maxLoad ? (worker.currentLoad / worker.maxLoad) * 100 : 0,
    }));
  }, [data.workerWorkload]);

  const predictiveAlerts = useMemo(() => {
    if (!data.assetRepairStats?.length) return [];
    return data.assetRepairStats
      .filter((asset) => asset.repairsLast30Days > 3)
      .sort((a, b) => b.repairsLast30Days - a.repairsLast30Days)
      .slice(0, 5);
  }, [data.assetRepairStats]);

  const handleAssignWorker = async (complaintId: string) => {
    const workerId = selectedWorkers[complaintId];
    if (!workerId) {
      setActionError('Select a worker before assigning.');
      return;
    }

    setActionError('');
    setActionMessage('');
    setAssigningIds((prev) => ({ ...prev, [complaintId]: true }));

    try {
      await assignWorkerToComplaint(complaintId, workerId);
      setActionMessage('Worker assigned successfully.');
      await fetchComplaints(complaintStatusFilter || undefined);
      await fetchDashboard();
    } catch {
      setActionError('Unable to assign worker. Please retry.');
    } finally {
      setAssigningIds((prev) => ({ ...prev, [complaintId]: false }));
    }
  };

  const handleUpdateStatus = async (complaintId: string) => {
    const status = selectedStatuses[complaintId];
    if (!status) {
      setActionError('Select a status before updating.');
      return;
    }

    setActionError('');
    setActionMessage('');
    setUpdatingStatusIds((prev) => ({ ...prev, [complaintId]: true }));

    try {
      await updateComplaintStatus(complaintId, status);
      setActionMessage('Complaint status updated.');
      await fetchComplaints(complaintStatusFilter || undefined);
      await fetchDashboard();
    } catch {
      setActionError('Unable to update complaint status.');
    } finally {
      setUpdatingStatusIds((prev) => ({ ...prev, [complaintId]: false }));
    }
  };

  const handleCostApproval = (requestId: string, nextStatus: CostApprovalStatus) => {
    setCostApprovals((prev) =>
      prev.map((item) => (item.id === requestId ? { ...item, status: nextStatus } : item)),
    );
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-surface-border bg-white p-5 shadow-soft">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Admin dashboard</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-neutral-900">Smart Campus Command Center</h2>
            {hasNewComplaintBadge && (
              <span className="inline-flex items-center rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-danger">
                New complaint
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500">
            Monitor complaints, assign workers, approve costs, and keep campus operations on track.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            fetchDashboard();
            fetchComplaints(complaintStatusFilter || undefined);
          }}
          className="rounded-2xl border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Refresh data
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-surface-border bg-white p-4 shadow-soft lg:sticky lg:top-24 lg:h-fit">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">Navigation</p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sectionLinks.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="whitespace-nowrap rounded-2xl border border-surface-border bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-primary/40 hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          {error && (
            <div className="rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {actionError && (
            <div className="rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
              {actionError}
            </div>
          )}
          {actionMessage && (
            <div className="rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success-700">
              {actionMessage}
            </div>
          )}

          <section id="overview">
            <AnalyticsCards totals={data.totals} loading={loading} />
          </section>

          <section id="analytics" className="grid gap-6 xl:grid-cols-3">
            <ChartCard title="Complaints by category" description="Distribution by maintenance stream" spanClass="xl:col-span-1">
              <CategoryBarChart data={categorySeries} emptyLabel="No category data" />
            </ChartCard>
            <ChartCard title="Complaints per month" description="Submission trend" spanClass="xl:col-span-1">
              <ColumnChart data={monthSeries} emptyLabel="No monthly data" />
            </ChartCard>
            <ChartCard title="Worker workload" description="Current load vs capacity" spanClass="xl:col-span-1">
              <WorkloadChart data={workerSeries} emptyLabel="No worker assignments" />
            </ChartCard>
          </section>

          <section id="complaints">
            <AdminComplaintsSection
              complaints={complaints}
              loading={complaintsLoading}
              error={complaintsError}
              statusFilter={complaintStatusFilter}
              onStatusFilterChange={setComplaintStatusFilter}
              workers={data.workerRoster || []}
              selectedWorkers={selectedWorkers}
              onWorkerChange={(complaintId, workerId) => {
                setSelectedWorkers((prev) => ({ ...prev, [complaintId]: workerId }));
              }}
              onAssignWorker={handleAssignWorker}
              assigningIds={assigningIds}
              selectedStatuses={selectedStatuses}
              onStatusChange={(complaintId, status) => {
                setSelectedStatuses((prev) => ({ ...prev, [complaintId]: status }));
              }}
              onUpdateStatus={handleUpdateStatus}
              updatingStatusIds={updatingStatusIds}
            />
          </section>

          <section id="workers">
            <WorkerManagementTable workers={data.workerRoster || []} loading={loading} />
          </section>

          <section id="approvals">
            <CostApprovalPanel requests={costApprovals} loading={loading} onReview={handleCostApproval} />
          </section>

          <section id="alerts">
            <PredictiveAlertsPanel alerts={predictiveAlerts} loading={loading} />
          </section>
        </div>
      </div>
    </section>
  );
};

const AnalyticsCards = ({ totals, loading }: { totals: Totals; loading: boolean }) => {
  const cards = [
    { label: 'Total complaints', value: totals.total, helper: 'Across all departments' },
    { label: 'Pending', value: totals.pending, helper: 'Need assignment or review' },
    { label: 'In progress', value: totals.inProgress, helper: 'Active maintenance tasks' },
    { label: 'Completed', value: totals.completed, helper: 'Resolved tickets' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{card.label}</p>
          <p className="mt-3 text-4xl font-semibold text-neutral-900">{loading ? '…' : card.value}</p>
          <p className="text-sm text-neutral-500">{card.helper}</p>
        </div>
      ))}
    </div>
  );
};

const ChartCard = ({
  title,
  description,
  children,
  spanClass,
}: {
  title: string;
  description: string;
  children: ReactNode;
  spanClass?: string;
}) => (
  <section className={cn('rounded-3xl border border-surface-border bg-white p-6 shadow-soft', spanClass)}>
    <div className="mb-4">
      <p className="text-xs uppercase tracking-[0.3em] text-primary">{title}</p>
      <h3 className="mt-1 text-lg font-semibold text-neutral-900">{description}</h3>
    </div>
    {children}
  </section>
);

const CategoryBarChart = ({
  data,
  emptyLabel,
}: {
  data: Array<{ label: string; value: number; percent: number }>;
  emptyLabel: string;
}) => {
  if (!data.length) {
    return <p className="text-sm text-neutral-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span className="capitalize">{item.label}</span>
            <span className="font-semibold text-neutral-900">{item.value}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-neutral-100">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const ColumnChart = ({
  data,
  emptyLabel,
}: {
  data: Array<{ month: string; count: number; percent: number }>;
  emptyLabel: string;
}) => {
  if (!data.length) {
    return <p className="text-sm text-neutral-400">{emptyLabel}</p>;
  }

  return (
    <div className="flex h-48 items-end gap-3">
      {data.map((item) => (
        <div key={item.month} className="flex-1 text-center text-xs font-semibold text-neutral-500">
          <div className="relative mx-auto mb-2 flex h-36 w-full flex-col justify-end rounded-2xl bg-primary/10">
            <div
              className="mx-auto w-full rounded-2xl bg-primary"
              style={{ height: `${Math.max(item.percent, 8)}%`, minHeight: '12%' }}
            />
          </div>
          <p>{item.month}</p>
          <p className="text-neutral-900">{item.count}</p>
        </div>
      ))}
    </div>
  );
};

const WorkloadChart = ({
  data,
  emptyLabel,
}: {
  data: Array<WorkerWorkload & { percent: number }>;
  emptyLabel: string;
}) => {
  if (!data.length) {
    return <p className="text-sm text-neutral-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((worker) => (
        <div key={worker.workerId}>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-neutral-900">{worker.name}</p>
              <p className="text-xs uppercase tracking-wide text-neutral-400">{worker.availability}</p>
            </div>
            <p className="text-xs font-semibold text-neutral-500">
              {worker.currentLoad}/{worker.maxLoad}
            </p>
          </div>
          <div className="mt-2 h-3 rounded-full bg-neutral-100">
            <div className="h-3 rounded-full bg-success" style={{ width: `${Math.min(worker.percent, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const WorkerManagementTable = ({ workers, loading }: { workers: WorkerWorkload[]; loading: boolean }) => (
  <section className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Worker management</p>
        <h3 className="mt-1 text-lg font-semibold text-neutral-900">Availability, skills and workload</h3>
      </div>
      <span className="text-xs text-neutral-400">{workers.length} members</span>
    </div>

    <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-surface-border/60 md:block">
      <table className="min-w-full divide-y divide-surface-border/60 text-left text-sm text-neutral-600">
        <thead>
          <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-3 py-2 font-semibold">Worker</th>
            <th className="px-3 py-2 font-semibold">Specialization</th>
            <th className="px-3 py-2 font-semibold">Assigned</th>
            <th className="px-3 py-2 font-semibold">Max load</th>
            <th className="px-3 py-2 font-semibold">SLA hit %</th>
            <th className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/60 bg-white">
          {loading && (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-neutral-400">
                Loading worker roster...
              </td>
            </tr>
          )}
          {!loading && workers.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-neutral-400">
                No worker data available.
              </td>
            </tr>
          )}
          {!loading &&
            workers.map((worker) => (
              <tr key={worker.workerId} className="transition-colors hover:bg-neutral-50/60">
                <td className="px-3 py-3 text-sm font-semibold text-neutral-900">{worker.name}</td>
                <td className="px-3 py-3 text-sm text-neutral-700">{worker.specialization || 'General'}</td>
                <td className="px-3 py-3 text-sm text-neutral-700">{worker.currentLoad}</td>
                <td className="px-3 py-3 text-sm text-neutral-700">{worker.maxLoad}</td>
                <td className="px-3 py-3 text-sm text-neutral-700">{worker.sla ? `${worker.sla}%` : '-'}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {worker.availability}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>

    <div className="mt-4 space-y-4 md:hidden">
      {loading && (
        <div className="rounded-2xl border border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
          Loading worker roster...
        </div>
      )}
      {!loading && workers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
          No worker data available.
        </div>
      )}
      {!loading &&
        workers.map((worker) => (
          <article
            key={worker.workerId}
            className="rounded-2xl border border-surface-border/80 bg-white p-4 text-sm shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{worker.name}</p>
                <p className="text-xs text-neutral-500">{worker.specialization || 'General'}</p>
              </div>
              <span className="inline-flex rounded-full border border-neutral-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                {worker.availability}
              </span>
            </div>
            <div className="mt-3 grid gap-3 text-xs text-neutral-600 sm:grid-cols-3">
              <div>
                <p className="uppercase tracking-wide text-neutral-400">Assigned</p>
                <p className="text-sm font-semibold text-neutral-900">{worker.currentLoad}</p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-neutral-400">Max load</p>
                <p className="text-sm font-semibold text-neutral-900">{worker.maxLoad}</p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-neutral-400">SLA hit %</p>
                <p className="text-sm font-semibold text-neutral-900">{worker.sla ? `${worker.sla}%` : '-'}</p>
              </div>
            </div>
          </article>
        ))}
    </div>
  </section>
);

const CostApprovalPanel = ({
  requests,
  loading,
  onReview,
}: {
  requests: CostApproval[];
  loading: boolean;
  onReview: (requestId: string, status: CostApprovalStatus) => void;
}) => (
  <section className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
    <p className="text-xs uppercase tracking-[0.3em] text-primary">Cost approvals</p>
    <h3 className="mt-1 text-lg font-semibold text-neutral-900">Approve or reject repair budgets</h3>
    <div className="mt-4 space-y-4">
      {loading && <p className="text-sm text-neutral-400">Loading requests...</p>}
      {!loading && requests.length === 0 && <p className="text-sm text-neutral-400">No pending approvals.</p>}
      {!loading &&
        requests.map((request) => (
          <div key={request.id} className="rounded-2xl border border-surface-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{request.asset}</p>
                <p className="text-xs text-neutral-500">
                  {request.department} • Requested by {request.requestedBy}
                </p>
              </div>
              <span className="text-sm font-semibold text-neutral-900">
                INR {Intl.NumberFormat('en-IN', { notation: 'compact' }).format(request.amount)}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
              <span>ETA {request.eta}</span>
              <span
                className={cn(
                  'rounded-full border px-3 py-1 font-semibold uppercase tracking-wide',
                  request.status === 'approved'
                    ? 'border-success/40 bg-success/10 text-success-700'
                    : request.status === 'pending'
                      ? 'border-warning/40 bg-warning/10 text-warning-700'
                      : 'border-danger/40 bg-danger/10 text-danger',
                )}
              >
                {request.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success-700 transition hover:bg-success/20"
                onClick={() => onReview(request.id, 'approved')}
              >
                Approve
              </button>
              <button
                type="button"
                className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/20"
                onClick={() => onReview(request.id, 'rejected')}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
    </div>
  </section>
);

const PredictiveAlertsPanel = ({ alerts, loading }: { alerts: AssetRepairStat[]; loading: boolean }) => {
  const formatDate = (value?: string) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';
    return Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
  };

  return (
    <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Predictive maintenance</p>
          <h3 className="mt-1 text-lg font-semibold text-neutral-900">Assets at risk of repeat failure</h3>
          <p className="text-sm text-neutral-600">Auto-flagged assets with more than three repairs in 30 days.</p>
        </div>
        <span className="rounded-full border border-primary/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {alerts.length} alerts
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {loading && <p className="text-sm text-neutral-500">Analyzing repair history...</p>}
        {!loading && alerts.length === 0 && (
          <p className="text-sm text-neutral-500">No assets breached threshold in the last 30 days.</p>
        )}
        {!loading &&
          alerts.map((asset) => (
            <article key={asset.assetId} className="rounded-2xl border border-white/40 bg-white/80 px-4 py-4 backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{asset.name}</p>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    {asset.assetType || 'Infrastructure'} • {asset.location || 'Unknown location'}
                  </p>
                </div>
                <span className="rounded-full border border-danger/50 bg-danger/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-danger">
                  {asset.repairsLast30Days} repairs / 30d
                </span>
              </div>
              <div className="mt-3 grid gap-4 text-xs text-neutral-600 sm:grid-cols-3">
                <div>
                  <p className="uppercase tracking-wide text-neutral-400">Last repair</p>
                  <p className="text-sm font-semibold text-neutral-900">{formatDate(asset.lastRepairDate)}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-neutral-400">Downtime 30d</p>
                  <p className="text-sm font-semibold text-neutral-900">{asset.downtimeHours ?? '-'} hrs</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-neutral-400">Recommendation</p>
                  <p className="text-sm font-semibold text-neutral-900">Evaluate replacement over repeated repair.</p>
                </div>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
};

const statusPill = (status?: string) => {
  const normalized = (status || 'pending').toLowerCase();
  if (normalized === 'completed') return 'border-success/30 bg-success/10 text-success-700';
  if (normalized === 'in-progress') return 'border-primary/30 bg-primary/10 text-primary-700';
  if (normalized === 'rejected') return 'border-danger/30 bg-danger/10 text-danger';
  return 'border-warning/30 bg-warning/10 text-warning-700';
};

const priorityPill = (priority?: string) => {
  const normalized = (priority || 'normal').toLowerCase();
  if (normalized === 'high' || normalized === 'urgent') return 'border-danger/30 bg-danger/10 text-danger';
  if (normalized === 'medium') return 'border-warning/30 bg-warning/10 text-warning-700';
  return 'border-neutral-200 bg-neutral-50 text-neutral-700';
};

const AdminComplaintsSection = ({
  complaints,
  loading,
  error,
  statusFilter,
  onStatusFilterChange,
  workers,
  selectedWorkers,
  onWorkerChange,
  onAssignWorker,
  assigningIds,
  selectedStatuses,
  onStatusChange,
  onUpdateStatus,
  updatingStatusIds,
}: {
  complaints: AdminComplaint[];
  loading: boolean;
  error: string;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  workers: WorkerWorkload[];
  selectedWorkers: Record<string, string>;
  onWorkerChange: (complaintId: string, workerId: string) => void;
  onAssignWorker: (complaintId: string) => void;
  assigningIds: Record<string, boolean>;
  selectedStatuses: Record<string, AdminComplaintStatus>;
  onStatusChange: (complaintId: string, status: AdminComplaintStatus) => void;
  onUpdateStatus: (complaintId: string) => void;
  updatingStatusIds: Record<string, boolean>;
}) => {
  const formatDate = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString();
  };

  return (
    <section className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Complaints table</p>
          <h3 className="mt-1 text-lg font-semibold text-neutral-900">View, assign and monitor complaints</h3>
          <p className="text-sm text-neutral-500">Update ticket status and assign workers directly from this panel.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">Filter by status:</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="rounded-2xl border border-surface-border bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-surface-border/60 lg:block">
        <table className="min-w-full divide-y divide-surface-border/60 text-left text-sm text-neutral-600">
          <thead>
            <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3 font-semibold">Ticket</th>
              <th className="px-4 py-3 font-semibold">Room</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Assign Worker</th>
              <th className="px-4 py-3 font-semibold">Update Status</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60 bg-white">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-neutral-400">
                  Loading complaints...
                </td>
              </tr>
            )}
            {!loading && complaints.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-neutral-400">
                  No complaints match this filter.
                </td>
              </tr>
            )}
            {!loading &&
              complaints.map((complaint) => (
                <tr key={complaint._id} className="transition-colors hover:bg-neutral-50/60">
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-neutral-900">
                    {complaint.ticketId || complaint._id.slice(-6)}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">{complaint.roomNumber || '-'}</td>
                  <td className="px-4 py-4 text-sm capitalize text-neutral-700">{complaint.category || '-'}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={cn('inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase', priorityPill(complaint.priority))}>
                      {complaint.priority || 'normal'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span className={cn('inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase', statusPill(complaint.status))}>
                      {complaint.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex gap-2">
                      <select
                        value={selectedWorkers[complaint._id] || ''}
                        onChange={(event) => onWorkerChange(complaint._id, event.target.value)}
                        className="rounded-xl border border-surface-border bg-white px-2 py-1 text-xs"
                      >
                        <option value="">Choose worker</option>
                        {workers.map((worker) => (
                          <option key={worker.workerId} value={worker.workerId}>
                            {worker.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onAssignWorker(complaint._id)}
                        disabled={Boolean(assigningIds[complaint._id])}
                        className="rounded-xl border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60"
                      >
                        {assigningIds[complaint._id] ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex gap-2">
                      <select
                        value={selectedStatuses[complaint._id] || 'pending'}
                        onChange={(event) => onStatusChange(complaint._id, event.target.value as AdminComplaintStatus)}
                        className="rounded-xl border border-surface-border bg-white px-2 py-1 text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(complaint._id)}
                        disabled={Boolean(updatingStatusIds[complaint._id])}
                        className="rounded-xl border border-success/40 bg-success/10 px-2 py-1 text-xs font-semibold text-success-700 transition hover:bg-success/20 disabled:opacity-60"
                      >
                        {updatingStatusIds[complaint._id] ? 'Saving...' : 'Update'}
                      </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-500">{formatDate(complaint.createdAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-4 lg:hidden">
        {loading && (
          <div className="rounded-2xl border border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
            Loading complaints...
          </div>
        )}
        {!loading && complaints.length === 0 && (
          <div className="rounded-2xl border border-dashed border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
            No complaints match this filter.
          </div>
        )}
        {!loading &&
          complaints.map((complaint) => (
            <article
              key={complaint._id}
              className="rounded-2xl border border-surface-border/80 bg-white p-4 text-sm shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Ticket</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {complaint.ticketId || complaint._id.slice(-6)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Room {complaint.roomNumber || '-'} • {complaint.category || 'General'}
                  </p>
                </div>
                <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide', statusPill(complaint.status))}>
                  {complaint.status || 'pending'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className={cn('inline-flex min-w-[96px] justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide', priorityPill(complaint.priority))}>
                  {complaint.priority || 'normal'}
                </span>
                <span className="text-xs text-neutral-500">{formatDate(complaint.createdAt)}</span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <select
                  value={selectedWorkers[complaint._id] || ''}
                  onChange={(event) => onWorkerChange(complaint._id, event.target.value)}
                  className="rounded-xl border border-surface-border bg-white px-3 py-2 text-xs"
                >
                  <option value="">Choose worker</option>
                  {workers.map((worker) => (
                    <option key={worker.workerId} value={worker.workerId}>
                      {worker.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onAssignWorker(complaint._id)}
                  disabled={Boolean(assigningIds[complaint._id])}
                  className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60"
                >
                  {assigningIds[complaint._id] ? 'Assigning...' : 'Assign worker'}
                </button>
                <select
                  value={selectedStatuses[complaint._id] || 'pending'}
                  onChange={(event) => onStatusChange(complaint._id, event.target.value as AdminComplaintStatus)}
                  className="rounded-xl border border-surface-border bg-white px-3 py-2 text-xs"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(complaint._id)}
                  disabled={Boolean(updatingStatusIds[complaint._id])}
                  className="rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs font-semibold text-success-700 transition hover:bg-success/20 disabled:opacity-60"
                >
                  {updatingStatusIds[complaint._id] ? 'Saving...' : 'Update status'}
                </button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
};

export default AdminDashboard;
