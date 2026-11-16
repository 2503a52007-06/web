import { Bookmark, LogOut, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { BookCoverImage } from '../components/BookCoverImage';
import { api } from '../lib/api';
import type { Book, Reservation, UserProfile } from '../types/library';

interface UserAccountModuleProps {
  user: UserProfile | null;
  reservations: Reservation[];
  onRequireAuth: () => void;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => Promise<void>;
  onNavigateToSearch: () => void;
  onReserveBook: (bookId: string) => Promise<void>;
}

const DEPARTMENTS = [
  'Computer Science',
  'Physics & Math',
  'Engineering',
  'Humanities',
  'Central Library Administration',
];

export function UserAccountModule({
  user,
  reservations,
  onRequireAuth,
  onUserUpdated,
  onLogout,
  onNavigateToSearch,
  onReserveBook,
}: UserAccountModuleProps) {
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || 'Computer Science');
  const [pickupReady, setPickupReady] = useState(user?.notificationPrefs.pickupReady ?? true);
  const [dueReminders, setDueReminders] = useState(user?.notificationPrefs.dueReminders ?? true);
  const [waitlistPromoted, setWaitlistPromoted] = useState(
    user?.notificationPrefs.waitlistPromoted ?? true
  );
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Book[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDepartment(user.department);
      setPickupReady(user.notificationPrefs.pickupReady);
      setDueReminders(user.notificationPrefs.dueReminders);
      setWaitlistPromoted(user.notificationPrefs.waitlistPromoted);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.bookmarks.length === 0) {
      setBookmarkedBooks([]);
      return;
    }
    let active = true;
    setLoadingBookmarks(true);
    api
      .getBooks({})
      .then((res) => {
        if (active) {
          setBookmarkedBooks(res.books.filter((b) => user.bookmarks.includes(b._id)));
        }
      })
      .finally(() => {
        if (active) setLoadingBookmarks(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Student Library Account</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Sign in or register with your university ID to manage alert preferences, borrowing
          limits, and saved reading lists.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const activeCount = reservations.filter(
    (r) => r.status === 'reserved' || r.status === 'checked_out' || r.status === 'waitlisted'
  ).length;
  const returnedCount = reservations.filter((r) => r.status === 'returned').length;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.updateProfile({
        name,
        department,
        notificationPrefs: {
          pickupReady,
          dueReminders,
          waitlistPromoted,
        },
      });
      onUserUpdated(res.user);
      setStatusMsg('Account details and notification preferences saved.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveBookmark(bookId: string) {
    if (!user) return;
    try {
      const res = await api.toggleBookmark(bookId);
      onUserUpdated({ ...user, bookmarks: res.bookmarks });
    } catch {
      // Ignore error
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Profile Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono text-slate-700">{user.studentId}</span>
            <span aria-hidden="true">·</span>
            <span>{user.role === 'admin' ? 'Librarian Administrator' : 'Student Member'}</span>
            <span aria-hidden="true">·</span>
            <span>{user.department}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{user.name}</h1>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      {/* 3-Column Account Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <span className="text-xs text-slate-500 block">Active Holds & Loans</span>
          <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1 block">
            {activeCount} / {user.maxHoldLimit}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <span className="text-xs text-slate-500 block">Completed Returns</span>
          <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1 block">
            {returnedCount}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <span className="text-xs text-slate-500 block">Saved Reading List</span>
          <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1 block">
            {user.bookmarks.length}
          </span>
        </div>
      </div>

      {/* Profile Settings & Saved Books Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-5"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Account & Alert Preferences
          </h2>

          {statusMsg && (
            <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900">
              {statusMsg}
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Academic Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-3">
            <span className="text-xs font-medium text-slate-700 block">
              Automated Alert Channels
            </span>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pickupReady}
                onChange={(e) => setPickupReady(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900 font-medium block">
                  Pickup Hold Confirmation
                </strong>
                Receive pickup codes and desk expiration windows immediately.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={waitlistPromoted}
                onChange={(e) => setWaitlistPromoted(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900 font-medium block">
                  Waitlist Promotion Notices
                </strong>
                Alert immediately when a returned copy promotes your queue slot.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dueReminders}
                onChange={(e) => setDueReminders(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900 font-medium block">
                  Return Due Reminders
                </strong>
                Remind 48 hours before a 14-day loan is due back.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 px-4 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving Preferences...' : 'Save Preferences'}
          </button>
        </form>

        {/* Saved Reading List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-slate-500" />
              Saved Reading List
            </h2>
            <button
              type="button"
              onClick={onNavigateToSearch}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Browse Catalog
            </button>
          </div>

          {loadingBookmarks ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : bookmarkedBooks.length === 0 ? (
            <div className="py-10 text-center space-y-2 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-900">No saved books yet</p>
              <p className="text-xs text-slate-500">
                Bookmark any title in Catalog Search to keep it handy for upcoming coursework.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {bookmarkedBooks.map((book) => (
                <div
                  key={book._id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-14 shrink-0 rounded overflow-hidden">
                      <BookCoverImage
                        src={book.coverUrl}
                        title={book.title}
                        department={book.department}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {book.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {book.author} · {book.availableCopies} of {book.totalCopies} available
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onReserveBook(book._id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md whitespace-nowrap"
                    >
                      {book.availableCopies > 0 ? 'Reserve' : 'Waitlist'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveBookmark(book._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                      aria-label={`Remove ${book.title} from saved list`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
