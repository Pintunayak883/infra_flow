import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

export type NotificationTone = 'info' | 'warning' | 'success' | 'critical';

export type NotificationMessage = {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  createdAt: string;
  meta?: Record<string, unknown>;
};

type NotificationInput = Omit<NotificationMessage, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

type NotificationContextValue = {
  notifications: NotificationMessage[];
  pushNotification: (notification: NotificationInput) => string;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const formatTicketId = (id?: string) => {
  if (!id) return 'ticket';
  const suffix = id.toString().slice(-4).toUpperCase();
  return `ticket #${suffix}`;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [toasts, setToasts] = useState<NotificationMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const timeoutsRef = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = timeoutsRef.current[id];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete timeoutsRef.current[id];
    }
  }, []);

  const registerNotification = useCallback(
    (notification: NotificationInput) => {
      const payload: NotificationMessage = {
        ...notification,
        id: notification.id || generateId(),
        createdAt: notification.createdAt || new Date().toISOString(),
      };

      setNotifications((prev) => [payload, ...prev].slice(0, 30));
      setToasts((prev) => [...prev, payload]);

      const timeoutId = window.setTimeout(() => removeToast(payload.id), 6000);
      timeoutsRef.current[payload.id] = timeoutId;

      return payload.id;
    },
    [removeToast],
  );

  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    cleanupSocket();
    Object.values(timeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutsRef.current = {};
  }, [cleanupSocket]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      cleanupSocket();
      setToasts([]);
      setNotifications([]);
      return;
    }

    const endpoint = (import.meta.env.VITE_SOCKET_URL as string) || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket = io(endpoint, {
      transports: ['websocket'],
      query: {
        userId: user.id,
        role: user.role,
      },
    });

    socketRef.current = socket;

    const handleWorkerTask = (payload: any) => {
      registerNotification({
        title: 'New complaint assigned',
        message: `Room ${payload.roomNumber || '—'} · ${payload.category || 'general'} issue is now on your list.`,
        tone: 'warning',
        meta: { complaintId: payload.complaintId },
      });
    };

    const handleNewComplaint = (payload: any) => {
      registerNotification({
        title: 'New complaint submitted',
        message: `Room ${payload.roomNumber || '—'} · ${payload.category || 'general'} issue reported.`,
        tone: 'warning',
        meta: { complaintId: payload.complaintId },
      });
    };

    const handleComplaintAssigned = (payload: any) => {
      registerNotification({
        title: 'Worker assigned',
        message: `${formatTicketId(payload.complaintId)} assigned to ${payload.workerName || 'maintenance team'}.`,
        tone: 'info',
        meta: { complaintId: payload.complaintId },
      });
    };

    const handleStatusUpdated = (payload: any) => {
      const statusLabel = typeof payload.status === 'string' ? payload.status.replace('-', ' ') : 'updated';
      const tone: NotificationTone = payload.status === 'completed' ? 'success' : 'info';
      const title = payload.status === 'completed' ? 'Repair completed' : 'Complaint status updated';
      registerNotification({
        title,
        message: `${formatTicketId(payload.complaintId)} is now ${statusLabel}.`,
        tone,
        meta: { complaintId: payload.complaintId },
      });
    };

    socket.on('worker:new-task', handleWorkerTask);
    socket.on('complaint:assigned', handleComplaintAssigned);
    socket.on('complaint:status-updated', handleStatusUpdated);
    socket.on('complaint:new', handleNewComplaint);

    return () => {
      socket.off('worker:new-task', handleWorkerTask);
      socket.off('complaint:assigned', handleComplaintAssigned);
      socket.off('complaint:status-updated', handleStatusUpdated);
      socket.off('complaint:new', handleNewComplaint);
      cleanupSocket();
    };
  }, [cleanupSocket, isAuthenticated, registerNotification, user?.id, user?.role]);

  const contextValue = useMemo(
    () => ({
      notifications,
      pushNotification: registerNotification,
    }),
    [notifications, registerNotification],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationToasts toasts={toasts} onDismiss={removeToast} />
    </NotificationContext.Provider>
  );
};

const toneStyles: Record<NotificationTone, string> = {
  info: 'border-primary/30 bg-primary/5 text-primary-800',
  warning: 'border-warning/40 bg-warning/10 text-warning-800',
  success: 'border-success/40 bg-success/10 text-success-800',
  critical: 'border-danger/40 bg-danger/10 text-danger',
};

const NotificationToasts = ({
  toasts,
  onDismiss,
}: {
  toasts: NotificationMessage[];
  onDismiss: (id: string) => void;
}) => (
  <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={cn('pointer-events-auto rounded-3xl border px-4 py-3 shadow-soft backdrop-blur', toneStyles[toast.tone])}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="mt-1 text-xs text-neutral-700">{toast.message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="text-sm text-neutral-500"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      </div>
    ))}
  </div>
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a RealtimeProvider');
  }
  return context;
};
