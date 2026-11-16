import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import type { AlertType, LibraryAlert, UserProfile } from '../types/library';

interface AlertsModuleProps {
  user: UserProfile | null;
  alerts: LibraryAlert[];
  loading: boolean;
  onRequireAuth: () => void;
  onRefresh: () => Promise<void>;
  onNavigateToReservations: () => void;
}

function getAlertMeta(type: AlertType) {
  switch (type) {
    case 'pickup_ready':
      return {
        label: 'Pickup Ready',
        colorClass: 'text-emerald-700',
        Icon: CheckCircle2,
      };
    case 'waitlist_promoted':
      return {
        label: 'Waitlist Promoted',
        colorClass: 'text-blue-700',
        Icon: Bell,
      };
    case 'due_soon':
      return {
        label: 'Due Reminder',
        colorClass: 'text-amber-700',
        Icon: Clock,
      };
    case 'overdue':
      return {
        label: 'Overdue Notice',
        colorClass: 'text-red-700',
        Icon: AlertTriangle,
      };
    default:
      return {
        label: 'Library Notice',
        colorClass: 'text-slate-600',
        Icon: Info,
      };
  }
}

export function AlertsModule({
  user,
  alerts,
  loading,
  onRequireAuth,
  onRefresh,
  onNavigateToReservations,
}: AlertsModuleProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'pickup' | 'due'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Alerts & Notifications</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Sign in to receive real-time pickup hold codes, waitlist promotion alerts, and return due
          date reminders.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
        >
          Sign In to View Alerts
        </button>
      </div>
    );
  }

  const unreadCount = alerts.filter((a) => !a.read).length;

  const visibleAlerts = alerts.filter((a) => {
    if (filter === 'unread') return !a.read;
    if (filter === 'pickup')
      return a.type === 'pickup_ready' || a.type === 'waitlist_promoted';
    if (filter === 'due') return a.type === 'due_soon' || a.type === 'overdue';
    return true;
  });

  async function handleMarkRead(id: string) {
    setBusyId(id);
    try {
      await api.markAlertRead(id);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    setBusyId('all');
    try {
      await api.markAllAlertsRead();
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Alerts & Notifications
          </h1>
          <p className="text-sm text-slate-600">
            Automated updates for confirmed pickup holds, waitlist promotions, and upcoming return
            deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={busyId === 'all'}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'all', label: `All (${alerts.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'pickup', label: 'Pickup & Waitlist' },
          { key: 'due', label: 'Due & Overdue' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key as typeof filter)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap tabular-nums ${
              filter === item.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : visibleAlerts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-2">
          <p className="text-base font-semibold text-slate-900">No alerts in this view</p>
          <p className="text-sm text-slate-500">
            New pickup confirmations, waitlist promotions, and due reminders will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {visibleAlerts.map((alert) => {
            const { label, colorClass, Icon } = getAlertMeta(alert.type);
            return (
              <div
                key={alert._id}
                className={`p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${
                  alert.read ? 'bg-white' : 'bg-blue-50/35'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1 font-medium ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {label}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {new Date(alert.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    {!alert.read && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-medium text-blue-700">Unread</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">{alert.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                    {alert.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.reservationId && (
                    <button
                      type="button"
                      onClick={onNavigateToReservations}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md whitespace-nowrap"
                    >
                      View Hold
                    </button>
                  )}
                  {!alert.read && (
                    <button
                      type="button"
                      disabled={busyId === alert._id}
                      onClick={() => handleMarkRead(alert._id)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-md whitespace-nowrap disabled:opacity-50"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
