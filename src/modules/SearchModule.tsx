import {
  Bookmark,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { BookCoverImage } from '../components/BookCoverImage';
import { api } from '../lib/api';
import type { Book, Reservation, UserProfile } from '../types/library';

interface SearchModuleProps {
  user: UserProfile | null;
  reservations: Reservation[];
  onRequireAuth: () => void;
  onReserveSuccess: (message: string) => Promise<void>;
  onUserUpdated: (user: UserProfile) => void;
  onNavigateToReservations: () => void;
}

const DEPARTMENTS = [
  'All',
  'Computer Science',
  'Physics & Math',
  'Engineering',
  'Humanities',
];

const FLOORS = ['All', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'];

export function SearchModule({
  user,
  reservations,
  onRequireAuth,
  onReserveSuccess,
  onUserUpdated,
  onNavigateToReservations,
}: SearchModuleProps) {
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('All');
  const [availability, setAvailability] = useState<'all' | 'available' | 'waitlist'>('all');
  const [floor, setFloor] = useState('All');
  const [sort, setSort] = useState<'title' | 'available' | 'newest'>('title');

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBookId, setActionBookId] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getBooks({
          q: query,
          department,
          availability,
          floor,
          sort,
        });
        if (active) {
          setBooks(res.books);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load catalog.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, department, availability, floor, sort]);

  function getActiveReservationForBook(bookId: string): Reservation | undefined {
    return reservations.find(
      (r) =>
        r.bookId === bookId &&
        (r.status === 'reserved' || r.status === 'checked_out' || r.status === 'waitlisted')
    );
  }

  async function handleReserve(book: Book) {
    if (!user) {
      onRequireAuth();
      return;
    }
    setActionBookId(book._id);
    setFeedback(null);
    try {
      const res = await api.createReservation(book._id);
      setFeedback({ type: 'success', text: res.message });
      await onReserveSuccess(res.message);
      // Refresh catalog availability counts immediately
      const refreshed = await api.getBooks({
        q: query,
        department,
        availability,
        floor,
        sort,
      });
      setBooks(refreshed.books);
      if (selectedBook?._id === book._id) {
        const updatedMatch = refreshed.books.find((b) => b._id === book._id);
        if (updatedMatch) setSelectedBook(updatedMatch);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not complete reservation.',
      });
    } finally {
      setActionBookId(null);
    }
  }

  async function handleToggleBookmark(bookId: string) {
    if (!user) {
      onRequireAuth();
      return;
    }
    try {
      const res = await api.toggleBookmark(bookId);
      onUserUpdated({ ...user, bookmarks: res.bookmarks });
    } catch {
      // Ignore transient bookmark errors
    }
  }

  function resetFilters() {
    setQuery('');
    setDepartment('All');
    setAvailability('all');
    setFloor('All');
    setSort('title');
  }

  return (
    <div className="space-y-6">
      {/* Header & Search Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Library Catalog Search
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Check live shelf copy counts, locate exact wing and shelf coordinates, and lock in a
              24-hour desk pickup hold before walking to the stacks.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
            {loading ? 'Searching catalog...' : `${books.length} titles matched`}
          </div>
        </div>

        {/* Search Bar + Selectors */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by book title, author, ISBN, or call number..."
              aria-label="Search library catalog"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="lg:col-span-2">
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              aria-label="Filter by library floor"
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {FLOORS.map((f) => (
                <option key={f} value={f}>
                  {f === 'All' ? 'All Floors' : f}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={availability}
              onChange={(e) =>
                setAvailability(e.target.value as 'all' | 'available' | 'waitlist')
              }
              aria-label="Filter by copy availability"
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Availability</option>
              <option value="available">On Shelf Now</option>
              <option value="waitlist">Waitlist Only</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'title' | 'available' | 'newest')}
              aria-label="Sort results"
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="title">Sort: Title A–Z</option>
              <option value="available">Sort: Most Available</option>
              <option value="newest">Sort: Newest Edition</option>
            </select>
          </div>
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {DEPARTMENTS.map((dept) => {
            const active = department === dept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setDepartment(dept)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {dept}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-4 px-4 py-3 rounded-md border text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{feedback.text}</span>
          <div className="flex items-center gap-3 shrink-0">
            {feedback.type === 'success' && (
              <button
                type="button"
                onClick={onNavigateToReservations}
                className="text-xs font-semibold underline hover:no-underline whitespace-nowrap"
              >
                View My Reservations
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 opacity-70 hover:opacity-100"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center space-y-3">
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800"
          >
            Retry Search
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-5 flex gap-4 animate-pulse"
            >
              <div className="w-24 h-32 bg-slate-200 rounded shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
                <div className="h-8 bg-slate-200 rounded w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && books.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900">
            No library volumes match your current filters
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Try clearing your search query or switching back to all departments and floors.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Populated Catalog Grid */}
      {!loading && !error && books.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {books.map((book) => {
            const activeRes = getActiveReservationForBook(book._id);
            const isBookmarked = user?.bookmarks.includes(book._id) ?? false;
            const available = book.availableCopies > 0;
            const isBusy = actionBookId === book._id;

            return (
              <article
                key={book._id}
                className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedBook(book)}
                    className="w-24 h-32 shrink-0 rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <BookCoverImage
                      src={book.coverUrl}
                      title={book.title}
                      department={book.department}
                      className="w-full h-full"
                    />
                  </button>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBook(book)}
                          className="text-left text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors line-clamp-2"
                        >
                          {book.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(book._id)}
                          aria-label={isBookmarked ? 'Remove bookmark' : 'Save to reading list'}
                          className={`p-1 rounded transition-colors shrink-0 ${
                            isBookmarked
                              ? 'text-blue-700 bg-blue-50'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          <Bookmark
                            className="w-4 h-4"
                            fill={isBookmarked ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 truncate">{book.author}</p>

                      {/* Zero-pill unboxed metadata with typographic separators */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                        <span>{book.department}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px]">{book.callNumber}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {book.floor} · {book.wing} · {book.shelf}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium tabular-nums">
                        {available ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-700">
                              {book.availableCopies} of {book.totalCopies} available on shelf
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="text-amber-700">
                              0 of {book.totalCopies} on shelf · {book.waitlistCount ?? 0} in queue
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                  {activeRes ? (
                    <button
                      type="button"
                      onClick={onNavigateToReservations}
                      className="flex-1 py-2 px-3 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors whitespace-nowrap"
                    >
                      {activeRes.status === 'reserved'
                        ? `Held (${activeRes.pickupCode})`
                        : activeRes.status === 'waitlisted'
                        ? `Waitlisted (#${activeRes.waitlistPosition})`
                        : 'Currently Checked Out'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReserve(book)}
                      className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-60 ${
                        available
                          ? 'bg-blue-700 hover:bg-blue-800 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isBusy
                        ? 'Processing...'
                        : available
                        ? 'Reserve for Pickup'
                        : 'Join Waitlist'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedBook(book)}
                    className="py-2 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
                  >
                    Shelf Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Book Details & Shelf Locator Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-detail-title"
        >
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <span className="text-xs font-mono text-slate-500">
                ISBN {selectedBook.isbn} · {selectedBook.callNumber}
              </span>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                aria-label="Close book details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-5">
                <BookCoverImage
                  src={selectedBook.coverUrl}
                  title={selectedBook.title}
                  department={selectedBook.department}
                  className="w-28 h-40 rounded shrink-0"
                />
                <div className="space-y-2">
                  <h2 id="book-detail-title" className="text-lg font-semibold text-slate-900">
                    {selectedBook.title}
                  </h2>
                  <p className="text-sm text-slate-600">{selectedBook.author}</p>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-2">
                    <span>{selectedBook.department}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedBook.edition}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{selectedBook.publishedYear}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed pt-1">
                    {selectedBook.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-y border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Shelf Coordinates</span>
                  <span className="font-medium text-slate-900 mt-0.5 block">
                    {selectedBook.floor} · {selectedBook.wing} · {selectedBook.shelf}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Shelf Availability</span>
                  <span
                    className={`font-medium mt-0.5 block tabular-nums ${
                      selectedBook.availableCopies > 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {selectedBook.availableCopies} of {selectedBook.totalCopies} copies ready
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pickup Policy</span>
                  <span className="font-medium text-slate-900 mt-0.5 block">
                    24h desk hold · 14-day loan
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBook(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Close
                </button>
                {!getActiveReservationForBook(selectedBook._id) ? (
                  <button
                    type="button"
                    disabled={actionBookId === selectedBook._id}
                    onClick={() => handleReserve(selectedBook)}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md disabled:opacity-60"
                  >
                    {selectedBook.availableCopies > 0
                      ? 'Confirm 24h Pickup Hold'
                      : 'Join Waitlist Queue'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(null);
                      onNavigateToReservations();
                    }}
                    className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                  >
                    Manage Existing Hold
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
