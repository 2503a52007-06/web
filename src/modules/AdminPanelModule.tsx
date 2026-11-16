import {
  Bell,
  BookPlus,
  Check,
  Pencil,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, setStoredToken } from '../lib/api';
import type { AdminOverview, Book, Reservation, UserProfile } from '../types/library';

interface AdminPanelModuleProps {
  user: UserProfile | null;
  onUserAuthenticated: (user: UserProfile) => Promise<void> | void;
  onCirculationUpdated: () => Promise<void>;
  onExitToCatalog: () => void;
}

const DEPARTMENTS = [
  'Computer Science',
  'Physics & Math',
  'Engineering',
  'Humanities',
];

export function AdminPanelModule({
  user,
  onUserAuthenticated,
  onCirculationUpdated,
  onExitToCatalog,
}: AdminPanelModuleProps) {
  const [subTab, setSubTab] = useState<
    'circulation' | 'inventory' | 'students' | 'broadcast'
  >('circulation');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'reserved' | 'checked_out' | 'overdue' | 'waitlisted'
  >('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Embedded Admin Portal Sign-In state
  const [adminEmail, setAdminEmail] = useState('librarian@university.edu');
  const [adminPassword, setAdminPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Quick Pickup Code verification
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Add Book modal
  const [showAddBook, setShowAddBook] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newCall, setNewCall] = useState('');
  const [newDept, setNewDept] = useState(DEPARTMENTS[0]);
  const [newFloor, setNewFloor] = useState('Floor 2');
  const [newWing, setNewWing] = useState('Wing A');
  const [newShelf, setNewShelf] = useState('Shelf 05');
  const [newCopies, setNewCopies] = useState(3);
  const [newYear, setNewYear] = useState(2025);
  const [newEdition, setNewEdition] = useState('1st Edition');
  const [newDesc, setNewDesc] = useState('');

  // Edit Book modal
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editDept, setEditDept] = useState(DEPARTMENTS[0]);
  const [editFloor, setEditFloor] = useState('');
  const [editWing, setEditWing] = useState('');
  const [editShelf, setEditShelf] = useState('');
  const [editCopies, setEditCopies] = useState(1);

  // Broadcast Alert state
  const [alertTarget, setAlertTarget] = useState('all');
  const [alertType, setAlertType] = useState('due_soon');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  async function loadAdminData() {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    try {
      const [ov, resList, bookList] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminReservations(),
        api.getBooks({}),
      ]);
      setOverview(ov.overview);
      setAllReservations(resList.reservations);
      setStudents(resList.students);
      setBooks(bookList.books);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to load Admin Portal data.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, [user?._id, user?.role]);

  async function handleAdminSignIn(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await api.login(adminEmail, adminPassword);
      if (res.user.role !== 'admin') {
        setAuthError('This account does not have Librarian Admin Portal privileges.');
        setAuthLoading(false);
        return;
      }
      setStoredToken(res.token);
      await onUserAuthenticated(res.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Admin sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleDemoAdminLogin() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await api.login('librarian@university.edu', 'admin123');
      setStoredToken(res.token);
      await onUserAuthenticated(res.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Demo librarian sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-8 space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-11 h-11 mx-auto rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Library Admin Portal</h1>
          <p className="text-sm text-slate-600">
            Sign in with staff credentials to verify pickup codes, manage book inventory, adjust
            student hold limits, and dispatch overdue alerts.
          </p>
        </div>

        {user && user.role !== 'admin' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
            Currently signed in as <strong>{user.name}</strong> (Student). Use librarian
            credentials below to enter the Admin Portal.
          </div>
        )}

        {authError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
            {authError}
          </div>
        )}

        <form onSubmit={handleAdminSignIn} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Staff Email
            </label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter librarian password (admin123)"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-2.5 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-60"
          >
            {authLoading ? 'Signing In...' : 'Sign In to Admin Portal'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 space-y-2.5">
          <p className="text-xs text-slate-500 text-center">
            Demo credentials: <span className="font-mono">librarian@university.edu</span> /{' '}
            <span className="font-mono">admin123</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleDemoAdminLogin}
              className="flex-1 py-2 px-4 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors disabled:opacity-60"
            >
              Enter Admin Portal (Demo Librarian)
            </button>
            <button
              type="button"
              onClick={onExitToCatalog}
              className="py-2 px-4 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleVerifyPickupCode(e: FormEvent) {
    e.preventDefault();
    if (!pickupCodeInput.trim()) return;
    setVerifyingCode(true);
    setFeedback(null);
    try {
      const res = await api.verifyPickupCode(pickupCodeInput.trim());
      setPickupCodeInput('');
      setFeedback({
        type: 'success',
        text: `Verified ${res.reservation.pickupCode} for ${
          res.reservation.user?.name || 'student'
        }. "${res.reservation.book?.title || 'Book'}" is now checked out for 14 days.`,
      });
      await Promise.all([loadAdminData(), onCirculationUpdated()]);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Invalid pickup code.',
      });
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleCheckout(resId: string) {
    setBusyId(resId);
    setFeedback(null);
    try {
      await api.checkoutReservation(resId);
      setFeedback({
        type: 'success',
        text: 'Pickup verified. 14-day loan started and student notified.',
      });
      await Promise.all([loadAdminData(), onCirculationUpdated()]);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to process checkout.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReturn(resId: string) {
    setBusyId(resId);
    setFeedback(null);
    try {
      await api.returnReservation(resId);
      setFeedback({
        type: 'success',
        text: 'Book returned. Shelf count updated and next waitlisted student promoted automatically.',
      });
      await Promise.all([loadAdminData(), onCirculationUpdated()]);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to process return.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSendOverdueReminder(res: Reservation) {
    if (!res.user) return;
    setBusyId(res._id);
    setFeedback(null);
    try {
      await api.broadcastAlert({
        userId: res.user._id,
        type: 'overdue',
        title: `Overdue Return Notice: ${res.book?.title || 'Library Book'}`,
        message: `Your loan for "${
          res.book?.title || 'this volume'
        }" is past its due date. Please return it to the Central Library Circulation Desk immediately.`,
      });
      setFeedback({
        type: 'success',
        text: `Overdue alert sent to ${res.user.name} (${res.user.studentId}).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send overdue notice.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdjustCopies(book: Book, delta: number) {
    setBusyId(book._id);
    setFeedback(null);
    try {
      await api.updateBook(book._id, {
        totalCopies: Math.max(1, book.totalCopies + delta),
      });
      await loadAdminData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Cannot update copy count.',
      });
    } finally {
      setBusyId(null);
    }
  }

  function openEditBook(book: Book) {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditDept(book.department);
    setEditFloor(book.floor);
    setEditWing(book.wing);
    setEditShelf(book.shelf);
    setEditCopies(book.totalCopies);
  }

  async function handleSaveBookEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingBook) return;
    setFeedback(null);
    try {
      await api.updateBook(editingBook._id, {
        title: editTitle,
        author: editAuthor,
        department: editDept,
        floor: editFloor,
        wing: editWing,
        shelf: editShelf,
        totalCopies: Number(editCopies),
      });
      setEditingBook(null);
      setFeedback({ type: 'success', text: `Updated "${editTitle}" in catalog.` });
      await loadAdminData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update book.',
      });
    }
  }

  async function handleDeleteBook(bookId: string) {
    setBusyId(bookId);
    setFeedback(null);
    try {
      await api.deleteBook(bookId);
      setFeedback({ type: 'success', text: 'Title removed from catalog.' });
      await loadAdminData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Cannot delete title.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateBook(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createBook({
        title: newTitle,
        author: newAuthor,
        isbn: newIsbn,
        callNumber: newCall,
        department: newDept,
        floor: newFloor,
        wing: newWing,
        shelf: newShelf,
        totalCopies: Number(newCopies),
        publishedYear: Number(newYear),
        edition: newEdition,
        description: newDesc,
      });
      setShowAddBook(false);
      setNewTitle('');
      setNewAuthor('');
      setNewIsbn('');
      setNewCall('');
      setNewDesc('');
      setFeedback({ type: 'success', text: 'New book added to the catalog.' });
      await loadAdminData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to add book.',
      });
    }
  }

  async function handleUpdateStudentLimit(student: UserProfile, delta: number) {
    setBusyId(student._id);
    setFeedback(null);
    try {
      const nextLimit = Math.max(1, Math.min(15, student.maxHoldLimit + delta));
      await api.updateStudent(student._id, { maxHoldLimit: nextLimit });
      setFeedback({
        type: 'success',
        text: `Updated ${student.name}'s hold limit to ${nextLimit} books.`,
      });
      await loadAdminData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update student limit.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleBroadcast(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await api.broadcastAlert({
        userId: alertTarget,
        type: alertType,
        title: alertTitle,
        message: alertMessage,
      });
      setAlertTitle('');
      setAlertMessage('');
      setFeedback({
        type: 'success',
        text: `Alert delivered to ${res.sentCount} student account(s).`,
      });
      await onCirculationUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send alert.',
      });
    }
  }

  const filteredReservations = allReservations.filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') {
      return (
        r.status === 'checked_out' &&
        Boolean(r.dueDate && new Date(r.dueDate).getTime() < Date.now())
      );
    }
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Admin Portal Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Library Admin Portal
          </h1>
          <p className="text-sm text-slate-600">
            Verify student pickup codes, process returns with automatic waitlist promotion, manage
            catalog inventory, and oversee member hold limits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={onExitToCatalog}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
          >
            Student Catalog
          </button>
          <button
            type="button"
            onClick={() => setShowAddBook(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
          >
            <BookPlus className="w-4 h-4" />
            Add Catalog Title
          </button>
        </div>
      </div>

      {/* 4-Column Circulation KPI Strip */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <span className="text-xs text-slate-500 block">Catalog Volume Copies</span>
            <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1 block">
              {overview.availableCopies} / {overview.totalCopies}
            </span>
            <span className="text-xs text-slate-500 mt-1 block tabular-nums">
              {overview.totalTitles} distinct titles
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <span className="text-xs text-slate-500 block">Pending Desk Pickups</span>
            <span className="text-2xl font-semibold text-emerald-700 font-mono tabular-nums mt-1 block">
              {overview.activeHolds}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">24h hold queue</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <span className="text-xs text-slate-500 block">Active Checkouts</span>
            <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1 block">
              {overview.checkedOutCount}
            </span>
            <span className="text-xs text-slate-500 mt-1 block tabular-nums">
              {overview.waitlistedCount} waitlisted requests
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <span className="text-xs text-slate-500 block">Overdue Returns</span>
            <span
              className={`text-2xl font-semibold font-mono tabular-nums mt-1 block ${
                overview.overdueCount > 0 ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {overview.overdueCount}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Require follow-up notice</span>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`flex items-center justify-between gap-4 px-4 py-3 rounded-md border text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Portal Sub-tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('circulation')}
          className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            subTab === 'circulation'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Circulation Desk
        </button>
        <button
          type="button"
          onClick={() => setSubTab('inventory')}
          className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            subTab === 'inventory'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Catalog Inventory ({books.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('students')}
          className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            subTab === 'students'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Student Directory ({students.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('broadcast')}
          className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            subTab === 'broadcast'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Dispatch Alerts
        </button>
      </div>

      {/* Sub-tab 1: Circulation Desk */}
      {subTab === 'circulation' && (
        <div className="space-y-4">
          {/* Quick Pickup Code Verification Bar */}
          <form
            onSubmit={handleVerifyPickupCode}
            className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <QrCode className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-xs font-medium text-slate-800">
                Fast Desk Checkout — Enter student pickup code:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pickupCodeInput}
                onChange={(e) => setPickupCodeInput(e.target.value)}
                placeholder="e.g. PK-4821"
                aria-label="Student pickup code"
                className="w-40 px-3 py-1.5 text-xs font-mono uppercase bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={verifyingCode || !pickupCodeInput.trim()}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {verifyingCode ? 'Verifying...' : 'Verify & Check Out'}
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">
                All Campus Holds & Loans
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
                {(
                  [
                    ['all', 'All'],
                    ['reserved', 'Ready Pickup'],
                    ['checked_out', 'Checked Out'],
                    ['overdue', 'Overdue'],
                    ['waitlisted', 'Waitlist'],
                  ] as const
                ).map(([st, label]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Due / Expiry</th>
                    <th className="py-3 px-4 text-right">Desk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Loading circulation records...
                      </td>
                    </tr>
                  ) : filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No circulation records in this view.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((res) => {
                      const isOverdue =
                        res.status === 'checked_out' &&
                        res.dueDate &&
                        new Date(res.dueDate).getTime() < Date.now();
                      return (
                        <tr key={res._id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">
                              {res.user?.name || 'Student'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {res.user?.studentId || '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 max-w-xs truncate">
                              {res.book?.title || res.bookId}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {res.book?.callNumber}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-800 tabular-nums">
                            {res.pickupCode}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {res.status === 'reserved' && (
                              <span className="text-emerald-700">Ready Pickup</span>
                            )}
                            {res.status === 'checked_out' && (
                              <span className={isOverdue ? 'text-red-700' : 'text-blue-700'}>
                                {isOverdue ? 'Overdue' : 'Checked Out'}
                              </span>
                            )}
                            {res.status === 'waitlisted' && (
                              <span className="text-amber-700">
                                Waitlist #{res.waitlistPosition}
                              </span>
                            )}
                            {res.status === 'returned' && (
                              <span className="text-slate-500">Returned</span>
                            )}
                            {(res.status === 'cancelled' || res.status === 'expired') && (
                              <span className="text-slate-400">
                                {res.status === 'cancelled' ? 'Cancelled' : 'Expired'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                            {res.status === 'reserved' && res.expiresAt
                              ? new Date(res.expiresAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : res.dueDate
                              ? new Date(res.dueDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              {res.status === 'reserved' && (
                                <button
                                  type="button"
                                  disabled={busyId === res._id}
                                  onClick={() => handleCheckout(res._id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Mark Checked Out
                                </button>
                              )}
                              {isOverdue && (
                                <button
                                  type="button"
                                  disabled={busyId === res._id}
                                  onClick={() => handleSendOverdueReminder(res)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors disabled:opacity-50"
                                >
                                  <Bell className="w-3.5 h-3.5" />
                                  Remind
                                </button>
                              )}
                              {res.status === 'checked_out' && (
                                <button
                                  type="button"
                                  disabled={busyId === res._id}
                                  onClick={() => handleReturn(res._id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Mark Returned
                                </button>
                              )}
                              {(res.status === 'returned' ||
                                res.status === 'cancelled' ||
                                res.status === 'expired') && (
                                <span className="text-slate-400">Completed</span>
                              )}
                              {res.status === 'waitlisted' && (
                                <span className="text-slate-500">Auto-promotes on return</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Catalog Inventory */}
      {subTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Title & Author</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Shelf Location</th>
                  <th className="py-3 px-4 text-right">Available / Total</th>
                  <th className="py-3 px-4 text-right">Inventory Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {books.map((book) => (
                  <tr key={book._id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{book.title}</div>
                      <div className="text-slate-500">
                        {book.author} · <span className="font-mono">{book.callNumber}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{book.department}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {book.floor} · {book.wing} · {book.shelf}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium">
                      <span
                        className={
                          book.availableCopies > 0 ? 'text-emerald-700' : 'text-amber-700'
                        }
                      >
                        {book.availableCopies}
                      </span>{' '}
                      / {book.totalCopies}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === book._id}
                          onClick={() => handleAdjustCopies(book, -1)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 font-mono"
                          title="Decrease total copies"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          disabled={busyId === book._id}
                          onClick={() => handleAdjustCopies(book, 1)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 font-mono"
                          title="Increase total copies"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditBook(book)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 rounded"
                          aria-label={`Edit ${book.title}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === book._id}
                          onClick={() => handleDeleteBook(book._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                          aria-label={`Remove ${book.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Student Directory */}
      {subTab === 'students' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-900">
              Registered Student Members
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Active Holds / Loans</th>
                  <th className="py-3 px-4 text-right">Max Hold Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {students.map((student) => {
                  const activeForStudent = allReservations.filter(
                    (r) =>
                      r.userId === student._id &&
                      (r.status === 'reserved' ||
                        r.status === 'checked_out' ||
                        r.status === 'waitlisted')
                  ).length;

                  return (
                    <tr key={student._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{student.name}</div>
                        <div className="text-slate-500">{student.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{student.studentId}</td>
                      <td className="py-3 px-4 text-slate-700">{student.department}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {activeForStudent}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busyId === student._id || student.maxHoldLimit <= 1}
                            onClick={() => handleUpdateStudentLimit(student, -1)}
                            className="px-2 py-0.5 bg-white border border-slate-300 rounded hover:bg-slate-50 font-mono disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="font-mono tabular-nums font-semibold text-slate-900 w-6 text-center">
                            {student.maxHoldLimit}
                          </span>
                          <button
                            type="button"
                            disabled={busyId === student._id || student.maxHoldLimit >= 15}
                            onClick={() => handleUpdateStudentLimit(student, 1)}
                            className="px-2 py-0.5 bg-white border border-slate-300 rounded hover:bg-slate-50 font-mono disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Dispatch Alerts */}
      {subTab === 'broadcast' && (
        <form
          onSubmit={handleBroadcast}
          className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl space-y-4"
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Send Direct Student Alert
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Recipient
              </label>
              <select
                value={alertTarget}
                onChange={(e) => setAlertTarget(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Registered Students ({students.length})</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.studentId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Alert Category
              </label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="due_soon">Due Date Reminder</option>
                <option value="overdue">Overdue Return Notice</option>
                <option value="pickup_ready">Pickup Desk Notice</option>
                <option value="system">General Library Notice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Alert Subject
            </label>
            <input
              type="text"
              required
              value={alertTitle}
              onChange={(e) => setAlertTitle(e.target.value)}
              placeholder="e.g. Extended Exam Week Pickup Hours"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Message Body
            </label>
            <textarea
              required
              rows={3}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="Write clear instructions including shelf desk or return deadline..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
          >
            Dispatch Alert
          </button>
        </form>
      )}

      {/* Add Book Modal */}
      {showAddBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                Add New Library Volume
              </h2>
              <button
                type="button"
                onClick={() => setShowAddBook(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBook} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Book Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Computer Networking: A Top-Down Approach"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Author(s)
                  </label>
                  <input
                    type="text"
                    required
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="James F. Kurose, Keith W. Ross"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ISBN-13
                  </label>
                  <input
                    type="text"
                    required
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    placeholder="978-0136681557"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Call Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newCall}
                    onChange={(e) => setNewCall(e.target.value)}
                    placeholder="TK5105.875 .K87"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Wing & Shelf
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newWing}
                      onChange={(e) => setNewWing(e.target.value)}
                      placeholder="Wing A"
                      className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-md"
                    />
                    <input
                      type="text"
                      value={newShelf}
                      onChange={(e) => setNewShelf(e.target.value)}
                      placeholder="Shelf 05"
                      className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Total Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newCopies}
                    onChange={(e) => setNewCopies(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Year & Edition
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={newYear}
                      onChange={(e) => setNewYear(Number(e.target.value))}
                      className="w-full px-2.5 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                    <input
                      type="text"
                      value={newEdition}
                      onChange={(e) => setNewEdition(e.target.value)}
                      className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Summary
                  </label>
                  <textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Short catalog summary..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBook(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
                >
                  Add to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {editingBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Edit Book Details</h2>
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBookEdit} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  required
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Total Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editCopies}
                    onChange={(e) => setEditCopies(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Wing
                  </label>
                  <input
                    type="text"
                    value={editWing}
                    onChange={(e) => setEditWing(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Shelf
                  </label>
                  <input
                    type="text"
                    value={editShelf}
                    onChange={(e) => setEditShelf(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
