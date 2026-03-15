import { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications, NotificationTone } from '../providers/RealtimeProvider';
import { cn } from '../utils/cn';
import { ROUTES } from '../utils/routes';

type NavItem = {
  label: string;
  description: string;
  to: string;
  roles?: Array<'student' | 'worker' | 'admin' | 'authority'>;
};

const navItems: NavItem[] = [
  { label: 'My Overview', description: 'Track raised complaints', to: ROUTES.dashboard, roles: ['student'] },
  { label: 'Worker Dispatch', description: 'Assigned maintenance jobs', to: ROUTES.worker, roles: ['worker'] },
  { label: 'Admin Insights', description: 'Campus wide analytics', to: ROUTES.admin, roles: ['admin'] },
  { label: 'Authority Desk', description: 'Repair approvals and risks', to: ROUTES.authority, roles: ['authority'] },
  { label: 'Raise Complaint', description: 'Log a new issue', to: ROUTES.complaintForm, roles: ['student', 'admin', 'authority'] },
  { label: 'Scan QR', description: 'Auto-fill room from asset tags', to: ROUTES.complaintScan, roles: ['student', 'worker', 'admin', 'authority'] },
  { label: 'Complaint History', description: 'Auditable trail of fixes', to: ROUTES.complaintHistory, roles: ['student', 'admin', 'authority'] },
];

const toneStyles: Record<NotificationTone, string> = {
  info: 'bg-primary/10 text-primary-700',
  warning: 'bg-warning/10 text-warning-700',
  success: 'bg-success/10 text-success-700',
  critical: 'bg-danger/10 text-danger-700',
};

const formatRelativeTime = (timestamp?: string) => {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) {
    const minutes = Math.floor(diffMs / 60_000);
    return `${minutes}m ago`;
  }
  if (diffMs < 86_400_000) {
    const hours = Math.floor(diffMs / 3_600_000);
    return `${hours}h ago`;
  }
  return date.toLocaleDateString();
};

const BellIcon = () => (
  <svg
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15.5 17.5H8.5a2 2 0 0 1-2-2V11a5.5 5.5 0 0 1 11 0v4.5a2 2 0 0 1-2 2Z" />
    <path d="M9.5 17.5v1a2.5 2.5 0 0 0 5 0v-1" />
  </svg>
);

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { notifications } = useNotifications();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 4);
  const hasNotifications = recentNotifications.length > 0;
  const userRole = user?.role;
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.roles?.length || (userRole ? item.roles.includes(userRole) : true)),
    [userRole],
  );

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="bg-surface text-neutral-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[88vw] max-w-72 border-r border-surface-border bg-white/95 shadow-soft transition-transform duration-300 ease-in-out backdrop-blur lg:static lg:translate-x-0',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-surface-border px-6 pb-6 pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">InfraFlow</p>
              <h1 className="mt-3 text-lg font-semibold text-neutral-900">Campus Operations Hub</h1>
              <p className="text-sm text-neutral-500">Monitor, dispatch, and resolve facility issues.</p>
            </div>

            <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMobileNav}
                  className={({ isActive }) =>
                    cn(
                      'rounded-3xl border border-transparent px-4 py-3.5 text-sm transition-all',
                      'hover:border-primary-200 hover:bg-primary/5',
                      isActive ? 'border-primary-200 bg-primary/10 text-primary-700 shadow-soft' : 'text-neutral-600',
                    )
                  }
                >
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs text-neutral-500">{item.description}</p>
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-surface-border px-6 py-6 text-sm text-neutral-500">
              <p className="font-semibold text-neutral-700">Shift summary</p>
              <p className="mt-2">Keep SLAs under 30 minutes for critical assets.</p>
            </div>
          </div>
        </aside>

        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-neutral-900/40 backdrop-blur-sm lg:hidden"
            onClick={closeMobileNav}
          />
        )}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-20 border-b border-surface-border bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="focus-ring -m-2 inline-flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-2xl border border-surface-border bg-white text-sm font-semibold lg:hidden"
                  onClick={() => setMobileNavOpen((prev) => !prev)}
                  aria-label="Toggle menu"
                >
                  <span className="h-0.5 w-5 bg-neutral-900" />
                  <span className="h-0.5 w-5 bg-neutral-900" />
                  <span className="h-0.5 w-5 bg-neutral-900" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary">Live Status</p>
                  <p className="max-w-[140px] truncate text-sm font-semibold text-neutral-900 sm:max-w-none sm:text-base">{user?.name ?? 'InfraFlow Operator'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <label className="relative hidden xl:block">
                  <span className="sr-only">Search</span>
                  <input
                    className="h-11 w-72 rounded-3xl border border-surface-border bg-neutral-50 pl-4 pr-4 text-sm text-neutral-700 placeholder:text-neutral-400"
                    type="search"
                    placeholder="Search assets, complaints, or workers"
                  />
                </label>
                <button
                  type="button"
                  className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-border bg-white text-sm font-semibold sm:h-11 sm:w-11"
                  aria-label="Notifications"
                >
                  <BellIcon />
                  {hasNotifications && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" />}
                </button>
                <div className="flex items-center gap-2 rounded-2xl border border-surface-border bg-white px-2.5 py-2 sm:gap-3 sm:rounded-3xl sm:px-4">
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-neutral-900">{user?.role ?? 'member'}</p>
                    <p className="text-xs uppercase tracking-wide text-neutral-400">Active</p>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-xl px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-7 lg:px-8 lg:py-8">
            <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="min-w-0 rounded-3xl border border-surface-border bg-white p-4 shadow-soft sm:p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Workstreams</h2>
                    <p className="text-sm text-neutral-500">Central place for every journey from report to resolution.</p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">SLA 94%</p>
                </div>
                <div className="mt-2 md:mt-4">
                  <Outlet />
                </div>
              </section>

              <section className="rounded-3xl border border-surface-border bg-white p-4 shadow-soft sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-primary">Notification Center</p>
                    <h3 className="mt-1 text-base font-semibold">Real-time signals</h3>
                  </div>
                  <button type="button" className="text-xs font-semibold text-primary">
                    View all
                  </button>
                </div>
                <ul className="mt-5 space-y-4">
                  {recentNotifications.length === 0 && (
                    <li className="rounded-2xl border border-dashed border-surface-border p-4 text-sm text-neutral-500">
                      Notifications from live events will appear here.
                    </li>
                  )}
                  {recentNotifications.map((note) => (
                    <li key={note.id} className="rounded-2xl border border-surface-border p-4">
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span className="font-semibold">{formatRelativeTime(note.createdAt)}</span>
                        <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide', toneStyles[note.tone] || toneStyles.info)}>
                          {note.tone.replace('-', ' ')}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-neutral-900">{note.title}</p>
                      <p className="mt-1 text-sm text-neutral-600">{note.message}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
