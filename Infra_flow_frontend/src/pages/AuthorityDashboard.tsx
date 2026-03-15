import { useEffect, useMemo, useState } from 'react';
import { fetchAllComplaints } from '../services/complaintService';
import { fetchAdminDashboardData } from '../services/dashboardService';
import { cn } from '../utils/cn';

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
  assetType?: string;
  repairsLast30Days: number;
  downtimeHours?: number;
  lastRepairDate?: string;
};

type ComplaintRecord = {
  _id: string;
  ticketId?: string;
  roomNumber?: string;
  category?: string;
  priority?: string;
  status?: string;
  description?: string;
  createdAt?: string;
};

type ApprovalHistoryItem = {
  requestId: string;
  asset: string;
  amount: number;
  department: string;
  decidedBy: string;
  decision: 'approved' | 'rejected';
  decidedAt: string;
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString();
};

const statusClass = (status: CostApprovalStatus) => {
  if (status === 'approved') return 'border-success/40 bg-success/10 text-success-700';
  if (status === 'rejected') return 'border-danger/40 bg-danger/10 text-danger';
  return 'border-warning/40 bg-warning/10 text-warning-700';
};

const issueRiskClass = (priority?: string) => {
  const normalized = (priority || '').toLowerCase();
  if (normalized === 'critical') return 'border-danger/40 bg-danger/10 text-danger';
  if (normalized === 'high') return 'border-warning/40 bg-warning/10 text-warning-700';
  return 'border-neutral-200 bg-neutral-50 text-neutral-700';
};

const AuthorityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvals, setApprovals] = useState<CostApproval[]>([]);
  const [majorIssues, setMajorIssues] = useState<ComplaintRecord[]>([]);
  const [assetAlerts, setAssetAlerts] = useState<AssetRepairStat[]>([]);
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, complaintsData] = await Promise.all([
        fetchAdminDashboardData(),
        fetchAllComplaints(),
      ]);

      const allApprovals = (dashboardData?.costApprovals || []) as CostApproval[];
      const filteredApprovals = allApprovals.filter((item) => item.amount > 3000);
      setApprovals(filteredApprovals);

      const previousHistory: ApprovalHistoryItem[] = filteredApprovals
        .filter((item) => item.status === 'approved' || item.status === 'rejected')
        .map((item) => ({
          requestId: item.id,
          asset: item.asset,
          amount: item.amount,
          department: item.department,
          decidedBy: 'Authority Panel',
          decision: item.status as 'approved' | 'rejected',
          decidedAt: new Date().toISOString(),
        }));
      setHistory(previousHistory);

      const alerts = ((dashboardData?.assetRepairStats || []) as AssetRepairStat[])
        .filter((asset) => asset.repairsLast30Days >= 3)
        .sort((a, b) => b.repairsLast30Days - a.repairsLast30Days)
        .slice(0, 6);
      setAssetAlerts(alerts);

      const complaints = (complaintsData?.complaints || []) as ComplaintRecord[];
      const flagged = complaints
        .filter((issue) => {
          const p = (issue.priority || '').toLowerCase();
          const category = (issue.category || '').toLowerCase();
          return (
            p === 'high' ||
            p === 'critical' ||
            ['electrical', 'network', 'equipment'].includes(category)
          );
        })
        .sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        })
        .slice(0, 8);
      setMajorIssues(flagged);
    } catch {
      setError('Unable to load authority dashboard data.');
      setApprovals([]);
      setMajorIssues([]);
      setAssetAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingApprovals = useMemo(
    () => approvals.filter((item) => item.status === 'pending'),
    [approvals],
  );

  const approvedCount = useMemo(
    () => approvals.filter((item) => item.status === 'approved').length,
    [approvals],
  );

  const rejectedCount = useMemo(
    () => approvals.filter((item) => item.status === 'rejected').length,
    [approvals],
  );

  const totalExposure = useMemo(
    () => pendingApprovals.reduce((sum, item) => sum + item.amount, 0),
    [pendingApprovals],
  );

  const handleDecision = (requestId: string, decision: 'approved' | 'rejected') => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === requestId ? { ...item, status: decision } : item)),
    );

    const selected = approvals.find((item) => item.id === requestId);
    if (!selected) return;

    setHistory((prev) => [
      {
        requestId,
        asset: selected.asset,
        amount: selected.amount,
        department: selected.department,
        decidedBy: 'Authority Panel',
        decision,
        decidedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Authority dashboard</p>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-900">Repair Cost Approval Center</h2>
            <p className="text-sm text-neutral-500">
              Review high-value requests above INR 3000, decide approvals, and monitor infrastructure risk.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="rounded-2xl border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending approvals" value={pendingApprovals.length} tone="pending" />
        <MetricCard label="Approved" value={approvedCount} tone="approved" />
        <MetricCard label="Rejected" value={rejectedCount} tone="rejected" />
        <MetricCard
          label="Open cost exposure"
          value={`INR ${Intl.NumberFormat('en-IN', { notation: 'compact' }).format(totalExposure)}`}
          tone="neutral"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary">Approval panel</p>
              <h3 className="mt-1 text-lg font-semibold text-neutral-900">Requests above INR 3000</h3>
            </div>
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-surface-border/60 lg:block">
            <table className="min-w-full divide-y divide-surface-border/60 text-left text-sm text-neutral-600">
              <thead>
                <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-3 font-semibold">Asset</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">ETA</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-400">
                      Loading approvals...
                    </td>
                  </tr>
                )}
                {!loading && approvals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-400">
                      No repair requests above INR 3000.
                    </td>
                  </tr>
                )}
                {!loading &&
                  approvals.map((request) => (
                    <tr key={request.id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="px-4 py-4 text-sm font-semibold text-neutral-900">{request.asset}</td>
                      <td className="px-4 py-4 text-sm text-neutral-700">{request.department}</td>
                      <td className="px-4 py-4 text-sm text-neutral-700">
                        INR {Intl.NumberFormat('en-IN').format(request.amount)}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-500">{request.eta}</td>
                      <td className="px-4 py-4">
                        <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide', statusClass(request.status))}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDecision(request.id, 'approved')}
                            className="rounded-xl border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success-700 transition hover:bg-success/20"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision(request.id, 'rejected')}
                            className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/20"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 lg:hidden">
            {loading && (
              <div className="rounded-2xl border border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
                Loading approvals...
              </div>
            )}
            {!loading && approvals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
                No repair requests above INR 3000.
              </div>
            )}
            {!loading &&
              approvals.map((request) => (
                <article key={request.id} className="rounded-2xl border border-surface-border/80 bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{request.asset}</p>
                      <p className="text-xs text-neutral-500">{request.department} • ETA {request.eta}</p>
                    </div>
                    <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide', statusClass(request.status))}>
                      {request.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-neutral-800">
                    INR {Intl.NumberFormat('en-IN').format(request.amount)}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision(request.id, 'approved')}
                      className="flex-1 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision(request.id, 'rejected')}
                      className="flex-1 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section className="space-y-6">
          <article className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Major issues</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-900">Infrastructure risk monitor</h3>
            <div className="mt-4 space-y-3">
              {loading && <p className="text-sm text-neutral-500">Loading flagged issues...</p>}
              {!loading && majorIssues.length === 0 && (
                <p className="text-sm text-neutral-500">No high-risk infrastructure complaints currently.</p>
              )}
              {!loading &&
                majorIssues.map((issue) => (
                  <div key={issue._id} className="rounded-2xl border border-surface-border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {issue.ticketId || issue._id.slice(-6)} • Room {issue.roomNumber || '-'}
                        </p>
                        <p className="text-xs text-neutral-500 capitalize">
                          {issue.category || 'General'} • {issue.status || 'pending'}
                        </p>
                      </div>
                      <span className={cn('rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide', issueRiskClass(issue.priority))}>
                        {issue.priority || 'normal'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-600 line-clamp-2">
                      {issue.description || 'No description available.'}
                    </p>
                  </div>
                ))}
            </div>
          </article>

          <article className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-soft">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Asset alerts</p>
            <h3 className="mt-1 text-lg font-semibold text-neutral-900">Repeat repair hotspots</h3>
            <div className="mt-4 space-y-3">
              {loading && <p className="text-sm text-neutral-600">Analyzing asset repair trends...</p>}
              {!loading && assetAlerts.length === 0 && (
                <p className="text-sm text-neutral-600">No hotspot assets detected in this cycle.</p>
              )}
              {!loading &&
                assetAlerts.map((asset) => (
                  <div key={asset.assetId} className="rounded-2xl border border-white/40 bg-white/80 px-3 py-3">
                    <p className="text-sm font-semibold text-neutral-900">{asset.name}</p>
                    <p className="text-xs text-neutral-500">
                      {asset.location || 'Unknown location'} • {asset.repairsLast30Days} repairs / 30d
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      Downtime: {asset.downtimeHours ?? '-'} hrs • Last repair: {formatDate(asset.lastRepairDate)}
                    </p>
                  </div>
                ))}
            </div>
          </article>
        </section>
      </div>

      <section className="rounded-3xl border border-surface-border bg-white p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Repair history</p>
        <h3 className="mt-1 text-lg font-semibold text-neutral-900">Decision history log</h3>

        <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-surface-border/60 md:block">
          <table className="min-w-full divide-y divide-surface-border/60 text-left text-sm text-neutral-600">
            <thead>
              <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Decision</th>
                <th className="px-4 py-3 font-semibold">By</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60 bg-white">
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-400">
                    No approval history yet.
                  </td>
                </tr>
              )}
              {history.map((item) => (
                <tr key={`${item.requestId}-${item.decidedAt}`}>
                  <td className="px-4 py-4 text-sm font-semibold text-neutral-900">{item.asset}</td>
                  <td className="px-4 py-4 text-sm text-neutral-700">{item.department}</td>
                  <td className="px-4 py-4 text-sm text-neutral-700">INR {Intl.NumberFormat('en-IN').format(item.amount)}</td>
                  <td className="px-4 py-4">
                    <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide', statusClass(item.decision))}>
                      {item.decision}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">{item.decidedBy}</td>
                  <td className="px-4 py-4 text-sm text-neutral-500">{formatDate(item.decidedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3 md:hidden">
          {history.length === 0 && (
            <div className="rounded-2xl border border-dashed border-surface-border/60 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-500">
              No approval history yet.
            </div>
          )}
          {history.map((item) => (
            <article key={`${item.requestId}-${item.decidedAt}`} className="rounded-2xl border border-surface-border px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{item.asset}</p>
                  <p className="text-xs text-neutral-500">{item.department} • {formatDate(item.decidedAt)}</p>
                </div>
                <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide', statusClass(item.decision))}>
                  {item.decision}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-600">
                INR {Intl.NumberFormat('en-IN').format(item.amount)} • {item.decidedBy}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};

const MetricCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'pending' | 'approved' | 'rejected' | 'neutral';
}) => {
  const toneClass =
    tone === 'pending'
      ? 'border-warning/30 bg-warning/5'
      : tone === 'approved'
        ? 'border-success/30 bg-success/5'
        : tone === 'rejected'
          ? 'border-danger/30 bg-danger/5'
          : 'border-surface-border bg-white';

  return (
    <div className={cn('rounded-2xl border p-4 shadow-soft', toneClass)}>
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
};

export default AuthorityDashboard;
