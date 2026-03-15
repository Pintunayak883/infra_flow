import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { ROUTES } from '../../utils/routes';

type MenuItem = {
  label: string;
  to: string;
  icon: () => JSX.Element;
};

type SidebarNavigationProps = {
  open?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
};
const IconBase = ({ children }: { children: React.ReactNode }) => (
  <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-surface-border bg-white text-neutral-700">
    {children}
  </span>
);

const LayoutIcon = () => (
  <IconBase>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 5.5h16M4 9.5h16M10 9v9.5M4 13.5h6M4 18.5h6" />
    </svg>
  </IconBase>
);

const AlertIcon = () => (
  <IconBase>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 9.5v3.5M12 16v.5" />
      <path d="M10.2 4.5 3.7 16.5a1.9 1.9 0 0 0 1.7 2.8h13.1a1.9 1.9 0 0 0 1.7-2.8L13.8 4.5a1.9 1.9 0 0 0-3.6 0Z" />
    </svg>
  </IconBase>
);

const FolderIcon = () => (
  <IconBase>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3.5 7.5a2 2 0 0 1 2-2H9l2 2h7.5a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z" />
    </svg>
  </IconBase>
);

const CheckIcon = () => (
  <IconBase>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M20 7.5 10 17.5l-5-5" />
    </svg>
  </IconBase>
);

const ShieldIcon = () => (
  <IconBase>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 20.5c4.5-2 7.5-4.7 7.5-8.9V6L12 3.5 4.5 6v5.6c0 4.2 3 6.9 7.5 8.9Z" />
      <path d="M9.5 12.5 11 14l3.5-3.5" />
    </svg>
  </IconBase>
);

const ChartIcon = () => (
  <IconBase>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4.5 19.5h15" />
      <path d="M8 16V9.5" />
      <path d="M12 16V5.5" />
      <path d="M16 16v-6" />
    </svg>
  </IconBase>
);

const PowerIcon = () => (
  <IconBase>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 3.5v7" />
      <path d="M7.5 6.5A7 7 0 1 0 16.5 6.5" />
    </svg>
  </IconBase>
);

const menuItems: MenuItem[] = [
  { label: 'Dashboard', to: ROUTES.dashboard, icon: LayoutIcon },
  { label: 'Submit Complaint', to: ROUTES.complaintForm, icon: AlertIcon },
  { label: 'My Complaints', to: ROUTES.complaintHistory, icon: FolderIcon },
  { label: 'Worker Tasks', to: ROUTES.worker, icon: CheckIcon },
  { label: 'Admin Panel', to: ROUTES.admin, icon: ShieldIcon },
  { label: 'Analytics', to: '/analytics', icon: ChartIcon },
];

const baseLinkClasses =
  'flex items-center gap-3 rounded-3xl border border-transparent px-4 py-3 text-sm font-medium transition-all';

export const SidebarNavigation = ({ open = false, onClose, onLogout }: SidebarNavigationProps) => (
  <>
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-72 border-r border-surface-border bg-white/95 shadow-soft transition-transform duration-300 ease-in-out backdrop-blur lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-surface-border px-6 pb-6 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">InfraFlow</p>
          <h1 className="mt-3 text-lg font-semibold text-neutral-900">Campus Operations</h1>
          <p className="text-sm text-neutral-500">Always-on facility intelligence.</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-6">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                cn(
                  baseLinkClasses,
                  'hover:border-primary-200 hover:bg-primary/5 text-neutral-600',
                  isActive && 'border-primary-200 bg-primary/10 text-primary-700 shadow-soft',
                )
              }
            >
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-surface-border px-6 py-6">
          <button
            type="button"
            className="w-full rounded-3xl border border-surface-border bg-white px-4 py-3 text-sm font-semibold text-danger transition hover:border-danger hover:bg-danger/5"
            onClick={() => {
              onLogout?.();
              onClose?.();
            }}
          >
            <div className="flex items-center gap-3">
              <PowerIcon />
              <span>Logout</span>
            </div>
          </button>
        </div>
      </div>
    </aside>

    {open && (
      <button
        type="button"
        aria-label="Close sidebar"
        className="fixed inset-0 z-30 bg-neutral-900/40 backdrop-blur-sm lg:hidden"
        onClick={() => onClose?.()}
      />
    )}
  </>
);
