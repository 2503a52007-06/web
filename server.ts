import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  AUTH_COOKIE_NAME,
  extractTokenFromRequest,
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from './server/auth.ts';
import {
  generateId,
  generatePickupCode,
  promoteNextWaitlistOrRelease,
  readDb,
  reconcileExpiredHolds,
  toPublicUser,
  writeDb,
  type StoredUser,
} from './server/db.ts';
import type { AdminOverview, AlertType, Book, Reservation } from './src/types/library.ts';

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
}

const PORT = Number(process.env.PORT) || 3000;

function attachSessionCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function getDbWithReconciliation() {
  const db = readDb();
  if (reconcileExpiredHolds(db)) {
    writeDb(db);
  }
  return db;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    return;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  const db = getDbWithReconciliation();
  const user = db.users.find((u) => u._id === payload.userId);
  if (!user) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }
  req.authUser = user;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.authUser?.role !== 'admin') {
      res.status(403).json({ error: 'Librarian admin privileges required for this action.' });
      return;
    }
    next();
  });
}

function enrichReservation(
  resItem: Reservation,
  books: Book[],
  users: StoredUser[],
  includeUser = false
): Reservation {
  const book = books.find((b) => b._id === resItem.bookId);
  const user = includeUser ? users.find((u) => u._id === resItem.userId) : undefined;
  return {
    ...resItem,
    book,
    user: user
      ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          studentId: user.studentId,
          department: user.department,
        }
      : undefined,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'folio-reserve-api' });
  });

  // ============================================================================
  // MODULE 3: USER ACCOUNT & AUTHENTICATION
  // ============================================================================

  app.post('/api/auth/register', (req, res) => {
    const { name, email, studentId, department, password } = req.body ?? {};
    if (!name || !email || !studentId || !password) {
      res.status(400).json({ error: 'Name, email, student ID, and password are required.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const db = getDbWithReconciliation();
    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = db.users.some(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        u.studentId.toLowerCase() === String(studentId).trim().toLowerCase()
    );
    if (exists) {
      res.status(409).json({ error: 'An account with this email or student ID already exists.' });
      return;
    }

    const newUser: StoredUser = {
      _id: generateId('usr'),
      name: String(name).trim(),
      email: normalizedEmail,
      studentId: String(studentId).trim().toUpperCase(),
      department: String(department || 'Computer Science').trim(),
      role: 'student',
      maxHoldLimit: 5,
      notificationPrefs: {
        pickupReady: true,
        dueReminders: true,
        waitlistPromoted: true,
      },
      bookmarks: [],
      passwordHash: hashPassword(String(password)),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.alerts.unshift({
      _id: generateId('alt'),
      userId: newUser._id,
      type: 'system',
      title: 'Welcome to FolioReserve',
      message:
        'Your student library account is active. You can hold up to 5 books simultaneously with 24-hour desk pickup windows.',
      read: false,
      createdAt: new Date().toISOString(),
    });
    writeDb(db);

    const token = signSessionToken(newUser._id, newUser.role);
    attachSessionCookie(res, token);
    res.status(201).json({ user: toPublicUser(newUser), token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = getDbWithReconciliation();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signSessionToken(user._id, user.role);
    attachSessionCookie(res, token);
    res.json({ user: toPublicUser(user), token });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: toPublicUser(req.authUser!) });
  });

  app.patch('/api/account/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDbWithReconciliation();
    const user = db.users.find((u) => u._id === req.authUser!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const { name, department, notificationPrefs } = req.body ?? {};
    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (typeof department === 'string' && department.trim()) {
      user.department = department.trim();
    }
    if (notificationPrefs && typeof notificationPrefs === 'object') {
      user.notificationPrefs = {
        pickupReady: Boolean(notificationPrefs.pickupReady),
        dueReminders: Boolean(notificationPrefs.dueReminders),
        waitlistPromoted: Boolean(notificationPrefs.waitlistPromoted),
      };
    }

    writeDb(db);
    res.json({ user: toPublicUser(user) });
  });

  app.post('/api/account/bookmarks/:bookId', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDbWithReconciliation();
    const user = db.users.find((u) => u._id === req.authUser!._id);
    const bookId = req.params.bookId;
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (!db.books.some((b) => b._id === bookId)) {
      res.status(404).json({ error: 'Book not found.' });
      return;
    }

    const idx = user.bookmarks.indexOf(bookId);
    if (idx === -1) {
      user.bookmarks.push(bookId);
    } else {
      user.bookmarks.splice(idx, 1);
    }

    writeDb(db);
    res.json({ bookmarks: user.bookmarks, bookmarked: idx === -1 });
  });

  // ============================================================================
  // MODULE 1: SEARCH & CATALOG DISCOVERY
  // ============================================================================

  app.get('/api/books', (req, res) => {
    const db = getDbWithReconciliation();
    const q = String(req.query.q || '').trim().toLowerCase();
    const department = String(req.query.department || 'All').trim();
    const availability = String(req.query.availability || 'all').trim();
    const floor = String(req.query.floor || 'All').trim();
    const sort = String(req.query.sort || 'title').trim();

    let books = db.books.map((book) => {
      const waitlistCount = db.reservations.filter(
        (r) => r.bookId === book._id && r.status === 'waitlisted'
      ).length;
      return { ...book, waitlistCount };
    });

    if (q) {
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q) ||
          b.callNumber.toLowerCase().includes(q) ||
          b.department.toLowerCase().includes(q)
      );
    }

    if (department && department !== 'All') {
      books = books.filter((b) => b.department === department);
    }

    if (floor && floor !== 'All') {
      books = books.filter((b) => b.floor === floor);
    }

    if (availability === 'available') {
      books = books.filter((b) => b.availableCopies > 0);
    } else if (availability === 'waitlist') {
      books = books.filter((b) => b.availableCopies === 0);
    }

    if (sort === 'available') {
      books.sort((a, b) => b.availableCopies - a.availableCopies);
    } else if (sort === 'newest') {
      books.sort((a, b) => b.publishedYear - a.publishedYear);
    } else {
      books.sort((a, b) => a.title.localeCompare(b.title));
    }

    res.json({ books });
  });

  // ============================================================================
  // MODULE 2: RESERVATION & WAITLIST ENGINE
  // ============================================================================

  app.get('/api/reservations', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDbWithReconciliation();
    const list = db.reservations
      .filter((r) => r.userId === req.authUser!._id)
      .sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime())
      .map((r) => enrichReservation(r, db.books, db.users, false));

    res.json({ reservations: list });
  });

  app.post('/api/reservations', requireAuth, (req: AuthenticatedRequest, res) => {
    const { bookId } = req.body ?? {};
    if (!bookId) {
      res.status(400).json({ error: 'Book ID is required.' });
      return;
    }

    const db = getDbWithReconciliation();
    const user = db.users.find((u) => u._id === req.authUser!._id)!;
    const book = db.books.find((b) => b._id === bookId);
    if (!book) {
      res.status(404).json({ error: 'Selected book does not exist in the catalog.' });
      return;
    }

    const activeUserReservations = db.reservations.filter(
      (r) =>
        r.userId === user._id &&
        (r.status === 'reserved' || r.status === 'checked_out' || r.status === 'waitlisted')
    );

    const alreadyActiveForBook = activeUserReservations.find((r) => r.bookId === book._id);
    if (alreadyActiveForBook) {
      res.status(409).json({
        error: `You already have an active ${alreadyActiveForBook.status.replace('_', ' ')} record for "${book.title}".`,
      });
      return;
    }

    if (activeUserReservations.length >= user.maxHoldLimit) {
      res.status(400).json({
        error: `Hold limit reached (${user.maxHoldLimit} active books). Return or cancel a hold before reserving another title.`,
      });
      return;
    }

    const now = new Date();

    if (book.availableCopies > 0) {
      book.availableCopies -= 1;
      const pickupCode = generatePickupCode();
      const expiresAt = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

      const newRes: Reservation = {
        _id: generateId('res'),
        bookId: book._id,
        userId: user._id,
        status: 'reserved',
        pickupCode,
        reservedAt: now.toISOString(),
        expiresAt,
        checkedOutAt: null,
        dueDate: null,
        returnedAt: null,
        waitlistPosition: null,
      };
      db.reservations.unshift(newRes);

      db.alerts.unshift({
        _id: generateId('alt'),
        userId: user._id,
        type: 'pickup_ready',
        title: 'Book Hold Confirmed',
        message: `"${book.title}" is reserved for you at ${book.floor} · ${book.wing} · ${book.shelf}. Present pickup code ${pickupCode} at the Circulation Desk within 24 hours.`,
        bookId: book._id,
        reservationId: newRes._id,
        read: false,
        createdAt: now.toISOString(),
      });

      writeDb(db);
      res.status(201).json({
        reservation: enrichReservation(newRes, db.books, db.users, false),
        message: `Reserved! Pickup code ${pickupCode} is valid for 24 hours.`,
      });
      return;
    }

    // All copies out -> join waitlist
    const existingWaitlist = db.reservations.filter(
      (r) => r.bookId === book._id && r.status === 'waitlisted'
    );
    const nextPos = existingWaitlist.length + 1;
    const waitlistCode = `WL-${String(nextPos).padStart(4, '0')}`;

    const waitlistRes: Reservation = {
      _id: generateId('res'),
      bookId: book._id,
      userId: user._id,
      status: 'waitlisted',
      pickupCode: waitlistCode,
      reservedAt: now.toISOString(),
      expiresAt: null,
      checkedOutAt: null,
      dueDate: null,
      returnedAt: null,
      waitlistPosition: nextPos,
    };
    db.reservations.unshift(waitlistRes);

    db.alerts.unshift({
      _id: generateId('alt'),
      userId: user._id,
      type: 'system',
      title: `Waitlist Confirmed (#${nextPos} in Queue)`,
      message: `All ${book.totalCopies} copies of "${book.title}" are currently checked out. You are #${nextPos} on the waitlist and will be alerted immediately when returned.`,
      bookId: book._id,
      reservationId: waitlistRes._id,
      read: false,
      createdAt: now.toISOString(),
    });

    writeDb(db);
    res.status(201).json({
      reservation: enrichReservation(waitlistRes, db.books, db.users, false),
      message: `Added to waitlist at position #${nextPos}.`,
    });
  });

  app.post('/api/reservations/:id/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDbWithReconciliation();
    const reservation = db.reservations.find((r) => r._id === req.params.id);
    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found.' });
      return;
    }
    if (reservation.userId !== req.authUser!._id && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'You cannot cancel another student’s reservation.' });
      return;
    }
    if (reservation.status !== 'reserved' && reservation.status !== 'waitlisted') {
      res.status(400).json({ error: 'Only active holds or waitlist entries can be cancelled.' });
      return;
    }

    const wasReserved = reservation.status === 'reserved';
    const wasWaitlisted = reservation.status === 'waitlisted';
    const book = db.books.find((b) => b._id === reservation.bookId);

    reservation.status = 'cancelled';
    reservation.waitlistPosition = null;

    if (book && wasReserved) {
      promoteNextWaitlistOrRelease(db, book);
    } else if (book && wasWaitlisted) {
      const remaining = db.reservations
        .filter((r) => r.bookId === book._id && r.status === 'waitlisted')
        .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
      remaining.forEach((w, idx) => {
        w.waitlistPosition = idx + 1;
      });
    }

    writeDb(db);
    res.json({ reservation: enrichReservation(reservation, db.books, db.users, false) });
  });

  app.post('/api/reservations/:id/extend', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDbWithReconciliation();
    const reservation = db.reservations.find((r) => r._id === req.params.id);
    if (!reservation || reservation.userId !== req.authUser!._id) {
      res.status(404).json({ error: 'Reservation not found.' });
      return;
    }
    if (reservation.status !== 'reserved' || !reservation.expiresAt) {
      res.status(400).json({ error: 'Only active pickup holds can be extended.' });
      return;
    }
    if (reservation.extendedOnce) {
      res.status(400).json({ error: 'Pickup window can only be extended once (+12 hours).' });
      return;
    }

    const newExpiry = new Date(new Date(reservation.expiresAt).getTime() + 12 * 3600 * 1000);
    reservation.expiresAt = newExpiry.toISOString();
    reservation.extendedOnce = true;

    writeDb(db);
    res.json({ reservation: enrichReservation(reservation, db.books, db.users, false) });
  });

  // ============================================================================
  // MODULE 5: ALERTS & NOTIFICATIONS
  // ============================================================================

  app.get('/api/alerts', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDbWithReconciliation();
    const alerts = db.alerts
      .filter((a) => a.userId === req.authUser!._id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = alerts.filter((a) => !a.read).length;
    res.json({ alerts, unreadCount });
  });

  app.patch('/api/alerts/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDbWithReconciliation();
    const alert = db.alerts.find(
      (a) => a._id === req.params.id && a.userId === req.authUser!._id
    );
    if (!alert) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }
    alert.read = true;
    writeDb(db);
    res.json({ alert });
  });

  app.post('/api/alerts/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDbWithReconciliation();
    for (const alert of db.alerts) {
      if (alert.userId === req.authUser!._id) {
        alert.read = true;
      }
    }
    writeDb(db);
    res.json({ ok: true });
  });

  // ============================================================================
  // MODULE 4: ADMIN PANEL (LIBRARIAN CIRCULATION & INVENTORY)
  // ============================================================================

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = getDbWithReconciliation();
    const nowMs = Date.now();

    const totalTitles = db.books.length;
    const totalCopies = db.books.reduce((acc, b) => acc + b.totalCopies, 0);
    const availableCopies = db.books.reduce((acc, b) => acc + b.availableCopies, 0);
    const activeHolds = db.reservations.filter((r) => r.status === 'reserved').length;
    const checkedOutCount = db.reservations.filter((r) => r.status === 'checked_out').length;
    const waitlistedCount = db.reservations.filter((r) => r.status === 'waitlisted').length;

    const overdueReservations = db.reservations
      .filter(
        (r) =>
          r.status === 'checked_out' && r.dueDate && new Date(r.dueDate).getTime() < nowMs
      )
      .map((r) => enrichReservation(r, db.books, db.users, true));

    const overview: AdminOverview = {
      totalTitles,
      totalCopies,
      availableCopies,
      activeHolds,
      checkedOutCount,
      waitlistedCount,
      overdueCount: overdueReservations.length,
      overdueReservations,
    };

    res.json({ overview });
  });

  app.get('/api/admin/reservations', requireAdmin, (_req, res) => {
    const db = getDbWithReconciliation();
    const reservations = db.reservations
      .slice()
      .sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime())
      .map((r) => enrichReservation(r, db.books, db.users, true));

    const students = db.users
      .filter((u) => u.role === 'student')
      .map((u) => toPublicUser(u));

    res.json({ reservations, students });
  });

  app.post('/api/admin/books', requireAdmin, (req, res) => {
    const {
      title,
      author,
      isbn,
      callNumber,
      department,
      floor,
      wing,
      shelf,
      totalCopies,
      description,
      publishedYear,
      edition,
    } = req.body ?? {};

    if (!title || !author || !isbn || !callNumber) {
      res.status(400).json({ error: 'Title, author, ISBN, and call number are required.' });
      return;
    }

    const copies = Math.max(1, Number(totalCopies) || 1);
    const dept = String(department || 'Computer Science');
    const coverByDept: Record<string, string> = {
      'Computer Science': '/src/assets/images/cover_computer_science_1794841924987.jpg',
      'Physics & Math': '/src/assets/images/cover_physics_math_1794841925760.jpg',
      Engineering: '/src/assets/images/cover_engineering_design_1794841926140.jpg',
      Humanities: '/src/assets/images/cover_humanities_lit_1794841926093.jpg',
    };

    const db = getDbWithReconciliation();
    const newBook: Book = {
      _id: generateId('bk'),
      title: String(title).trim(),
      author: String(author).trim(),
      isbn: String(isbn).trim(),
      callNumber: String(callNumber).trim(),
      department: dept,
      floor: String(floor || 'Floor 2').trim(),
      wing: String(wing || 'Wing A').trim(),
      shelf: String(shelf || 'Shelf 01').trim(),
      totalCopies: copies,
      availableCopies: copies,
      coverUrl: coverByDept[dept] || coverByDept['Computer Science'],
      description: String(description || 'Academic library volume available for student checkout.').trim(),
      publishedYear: Number(publishedYear) || new Date().getFullYear(),
      edition: String(edition || '1st Edition').trim(),
      createdAt: new Date().toISOString(),
    };

    db.books.unshift(newBook);
    writeDb(db);
    res.status(201).json({ book: newBook });
  });

  app.patch('/api/admin/books/:id', requireAdmin, (req, res) => {
    const db = getDbWithReconciliation();
    const book = db.books.find((b) => b._id === req.params.id);
    if (!book) {
      res.status(404).json({ error: 'Book not found.' });
      return;
    }

    const { title, author, totalCopies, floor, wing, shelf, department } = req.body ?? {};
    if (typeof title === 'string' && title.trim()) book.title = title.trim();
    if (typeof author === 'string' && author.trim()) book.author = author.trim();
    if (typeof floor === 'string' && floor.trim()) book.floor = floor.trim();
    if (typeof wing === 'string' && wing.trim()) book.wing = wing.trim();
    if (typeof shelf === 'string' && shelf.trim()) book.shelf = shelf.trim();
    if (typeof department === 'string' && department.trim()) book.department = department.trim();

    if (typeof totalCopies === 'number' && totalCopies >= 1) {
      const checkedOrHeld = db.reservations.filter(
        (r) => r.bookId === book._id && (r.status === 'reserved' || r.status === 'checked_out')
      ).length;
      if (totalCopies < checkedOrHeld) {
        res.status(400).json({
          error: `Cannot reduce total copies below currently held/checked-out copies (${checkedOrHeld}).`,
        });
        return;
      }
      book.totalCopies = totalCopies;
      book.availableCopies = Math.max(0, totalCopies - checkedOrHeld);
    }

    writeDb(db);
    res.json({ book });
  });

  app.delete('/api/admin/books/:id', requireAdmin, (req, res) => {
    const db = getDbWithReconciliation();
    const idx = db.books.findIndex((b) => b._id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Book not found.' });
      return;
    }

    const active = db.reservations.some(
      (r) =>
        r.bookId === req.params.id && (r.status === 'reserved' || r.status === 'checked_out')
    );
    if (active) {
      res.status(400).json({
        error: 'Cannot delete a title that currently has active holds or checked-out copies.',
      });
      return;
    }

    db.books.splice(idx, 1);
    writeDb(db);
    res.json({ ok: true });
  });

  app.post('/api/admin/reservations/:id/checkout', requireAdmin, (req, res) => {
    const db = getDbWithReconciliation();
    const reservation = db.reservations.find((r) => r._id === req.params.id);
    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found.' });
      return;
    }
    if (reservation.status !== 'reserved') {
      res.status(400).json({ error: 'Only ready pickup holds can be checked out.' });
      return;
    }

    const now = new Date();
    const dueDate = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    reservation.status = 'checked_out';
    reservation.checkedOutAt = now.toISOString();
    reservation.dueDate = dueDate.toISOString();

    const book = db.books.find((b) => b._id === reservation.bookId);
    if (book) {
      db.alerts.unshift({
        _id: generateId('alt'),
        userId: reservation.userId,
        type: 'system',
        title: 'Book Checked Out (14-Day Loan)',
        message: `You have checked out "${book.title}". Due back by ${dueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}.`,
        bookId: book._id,
        reservationId: reservation._id,
        read: false,
        createdAt: now.toISOString(),
      });
    }

    writeDb(db);
    res.json({ reservation: enrichReservation(reservation, db.books, db.users, true) });
  });

  app.post('/api/admin/reservations/:id/return', requireAdmin, (req, res) => {
    const db = getDbWithReconciliation();
    const reservation = db.reservations.find((r) => r._id === req.params.id);
    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found.' });
      return;
    }
    if (reservation.status !== 'checked_out') {
      res.status(400).json({ error: 'Only checked-out books can be marked returned.' });
      return;
    }

    const now = new Date().toISOString();
    reservation.status = 'returned';
    reservation.returnedAt = now;

    const book = db.books.find((b) => b._id === reservation.bookId);
    if (book) {
      promoteNextWaitlistOrRelease(db, book);
    }

    writeDb(db);
    res.json({ reservation: enrichReservation(reservation, db.books, db.users, true) });
  });

  app.post('/api/admin/alerts/broadcast', requireAdmin, (req, res) => {
    const { userId, title, message, type } = req.body ?? {};
    if (!title || !message) {
      res.status(400).json({ error: 'Alert title and message are required.' });
      return;
    }

    const db = getDbWithReconciliation();
    const alertType: AlertType =
      type === 'due_soon' || type === 'overdue' || type === 'pickup_ready' ? type : 'system';

    const targets =
      userId && userId !== 'all'
        ? db.users.filter((u) => u._id === userId)
        : db.users.filter((u) => u.role === 'student');

    if (targets.length === 0) {
      res.status(404).json({ error: 'No matching student recipients found.' });
      return;
    }

    const now = new Date().toISOString();
    for (const student of targets) {
      db.alerts.unshift({
        _id: generateId('alt'),
        userId: student._id,
        type: alertType,
        title: String(title).trim(),
        message: String(message).trim(),
        read: false,
        createdAt: now,
      });
    }

    writeDb(db);
    res.status(201).json({ sentCount: targets.length });
  });

  app.post('/api/admin/reservations/verify-code', requireAdmin, (req, res) => {
    const code = String(req.body?.pickupCode || '').trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'Pickup code is required (e.g. PK-4821).' });
      return;
    }

    const db = getDbWithReconciliation();
    const reservation = db.reservations.find(
      (r) => r.pickupCode.toUpperCase() === code && r.status === 'reserved'
    );
    if (!reservation) {
      const existing = db.reservations.find((r) => r.pickupCode.toUpperCase() === code);
      if (existing) {
        res.status(400).json({
          error: `Pickup code ${code} is currently "${existing.status.replace('_', ' ')}" and cannot be checked out.`,
        });
        return;
      }
      res.status(404).json({ error: `No active pickup hold found for code ${code}.` });
      return;
    }

    const now = new Date();
    const dueDate = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    reservation.status = 'checked_out';
    reservation.checkedOutAt = now.toISOString();
    reservation.dueDate = dueDate.toISOString();

    const book = db.books.find((b) => b._id === reservation.bookId);
    if (book) {
      db.alerts.unshift({
        _id: generateId('alt'),
        userId: reservation.userId,
        type: 'system',
        title: 'Book Checked Out (14-Day Loan)',
        message: `Pickup code ${code} verified. "${book.title}" is due back by ${dueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}.`,
        bookId: book._id,
        reservationId: reservation._id,
        read: false,
        createdAt: now.toISOString(),
      });
    }

    writeDb(db);
    res.json({ reservation: enrichReservation(reservation, db.books, db.users, true) });
  });

  app.patch('/api/admin/students/:id', requireAdmin, (req, res) => {
    const db = getDbWithReconciliation();
    const student = db.users.find((u) => u._id === req.params.id && u.role === 'student');
    if (!student) {
      res.status(404).json({ error: 'Student account not found.' });
      return;
    }

    const { maxHoldLimit, department } = req.body ?? {};
    if (typeof maxHoldLimit === 'number') {
      student.maxHoldLimit = Math.max(1, Math.min(15, Math.round(maxHoldLimit)));
    }
    if (typeof department === 'string' && department.trim()) {
      student.department = department.trim();
    }

    writeDb(db);
    res.json({ student: toPublicUser(student) });
  });

  // ============================================================================
  // VITE DEV MIDDLEWARE / PRODUCTION STATIC SERVING
  // ============================================================================

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`FolioReserve running at http://localhost:${PORT}`);
    console.log(`Admin Portal available at http://localhost:${PORT}/admin`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Stop the other process or run with PORT=3001.`
      );
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
