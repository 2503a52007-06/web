import {
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { BookCoverImage } from '../components/BookCoverImage';
import { api } from '../lib/api';
import type { Reservation, UserProfile } from '../types/library';

interface ReservationModuleProps {
  user: UserProfile | null;
  reservations: Reservation[];
  loading: boolean;
  onRequireAuth: () => void;
  onRefresh: () => Promise<void>;
  onNavigateToSearch: () => void;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRemainingWindow(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hrs}h ${mins}m left to pick up`;
}

export function ReservationModule({
  user,
  reservations,
  loading,
  onRequireAuth,
  onRefresh,
  onNavigateToSearch,
}: ReservationModuleProps) {
  const [tab, setTab] = useState<'active' | 'checked_out' | 'history'>('active');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  if (!user) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">My Book Reservations</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Sign in with your university student account to view pickup codes, waitlist queue
          positions, and active loan due dates.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
        >
          Sign In to View Holds
        </button>
      </div>
    );
  }

  const activeAndWaitlist = reservations.filter(
    (r) => r.status === 'reserved' || r.status === 'waitlisted'
  );
  const checkedOut = reservations.filter((r) => r.status === 'checked_out');
  const history = reservations.filter(
    (r) => r.status === 'returned' || r.status === 'cancelled' || r.status === 'expired'
  );

  const visibleList =
    tab === 'active' ? activeAndWaitlist : tab === 'checked_out' ? checkedOut : history;

  async function handleCancel(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      await api.cancelReservation(id);
      setMessage({
        type: 'success',
        text: 'Reservation cancelled and shelf availability updated.',
      });
      await onRefresh();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to cancel reservation.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleExtend(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      await api.extendReservation(id);
      setMessage({
        type: 'success',
        text: 'Pickup deadline extended by 12 hours.',
      });
      await onRefresh();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to extend hold.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Reservations & Pickup Holds
          </h1>
          <p className="text-sm text-slate-600">
            Present your pickup code at the Central Library Circulation Desk before the hold window
            closes.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap tabular-nums ${
              tab === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Holds & Waitlist ({activeAndWaitlist.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('checked_out')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap tabular-nums ${
              tab === 'checked_out'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Checked Out ({checkedOut.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap tabular-nums ${
              tab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            History ({history.length})
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-md border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : visibleList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900">
            {tab === 'active'
              ? 'No active pickup holds or waitlist entries'
              : tab === 'checked_out'
              ? 'No books currently checked out'
              : 'No past reservation history yet'}
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Search the library catalog to reserve an available volume or join a waitlist queue.
          </p>
          <button
            type="button"
            onClick={onNavigateToSearch}
            className="mt-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
          >
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleList.map((res) => {
            const book = res.book;
            const isOverdue =
              res.status === 'checked_out' &&
              res.dueDate &&
              new Date(res.dueDate).getTime() < Date.now();

            return (
              <div
                key={res._id}
                className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-16 h-22 shrink-0 rounded overflow-hidden">
                    <BookCoverImage
                      src={book?.coverUrl || ''}
                      title={book?.title || 'Library Book'}
                      department={book?.department || 'General'}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      {res.status === 'reserved' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready for Pickup
                        </span>
                      )}
                      {res.status === 'waitlisted' && (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          Waitlist Position #{res.waitlistPosition}
                        </span>
                      )}
                      {res.status === 'checked_out' && (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isOverdue ? 'text-red-700' : 'text-blue-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {isOverdue ? 'Overdue Return' : 'Checked Out'}
                        </span>
                      )}
                      {res.status === 'returned' && (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Returned
                        </span>
                      )}
                      {(res.status === 'cancelled' || res.status === 'expired') && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <XCircle className="w-3.5 h-3.5" />
                          {res.status === 'cancelled' ? 'Cancelled' : 'Hold Expired'}
                        </span>
                      )}
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {book?.callNumber || '—'}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {book?.title || 'Unknown Title'}
                    </h3>
                    <p className="text-xs text-slate-600">{book?.author}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                      {book && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {book.floor} · {book.wing} · {book.shelf}
                        </span>
                      )}
                      {res.status === 'reserved' && res.expiresAt && (
                        <span className="font-mono text-slate-700 tabular-nums">
                          {formatRemainingWindow(res.expiresAt)} (until {formatDateTime(res.expiresAt)})
                        </span>
                      )}
                      {res.status === 'checked_out' && res.dueDate && (
                        <span className="font-mono text-slate-700 tabular-nums">
                          Due {formatDateTime(res.dueDate)}
                        </span>
                      )}
                      {res.status === 'returned' && res.returnedAt && (
                        <span className="font-mono text-slate-500 tabular-nums">
                          Returned {formatDateTime(res.returnedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right-side Pickup Code & Controls */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  {res.status === 'reserved' && (
                    <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-slate-500" />
                      <div>
                        <span className="block text-[10px] text-slate-500 leading-none">
                          Pickup Code
                        </span>
                        <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                          {res.pickupCode}
                        </span>
                      </div>
                    </div>
                  )}

                  {res.status === 'reserved' && !res.extendedOnce && (
                    <button
                      type="button"
                      disabled={busyId === res._id}
                      onClick={() => handleExtend(res._id)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      Extend +12h
                    </button>
                  )}

                  {(res.status === 'reserved' || res.status === 'waitlisted') && (
                    <button
                      type="button"
                      disabled={busyId === res._id}
                      onClick={() => handleCancel(res._id)}
                      className="px-3 py-2 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {res.status === 'waitlisted' ? 'Leave Waitlist' : 'Cancel Hold'}
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
