import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  Book,
  LibraryAlert,
  Reservation,
  UserProfile,
} from '../src/types/library.ts';
import { hashPassword } from './auth.ts';

export interface StoredUser extends UserProfile {
  passwordHash: string;
}

export interface LibraryDatabase {
  users: StoredUser[];
  books: Book[];
  reservations: Reservation[];
  alerts: LibraryAlert[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'library-db.json');

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function generatePickupCode(): string {
  const num = crypto.randomInt(1000, 9999);
  return `PK-${num}`;
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

function createSeedDatabase(): LibraryDatabase {
  const now = new Date().toISOString();

  const studentUser: StoredUser = {
    _id: 'usr_student_aarav',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@university.edu',
    studentId: 'CS-2026-0412',
    department: 'Computer Science',
    role: 'student',
    maxHoldLimit: 5,
    notificationPrefs: {
      pickupReady: true,
      dueReminders: true,
      waitlistPromoted: true,
    },
    bookmarks: ['bk_ddia', 'bk_quantum'],
    passwordHash: hashPassword('student123'),
    createdAt: daysFromNow(-45),
  };

  const adminUser: StoredUser = {
    _id: 'usr_admin_elena',
    name: 'Elena Vance',
    email: 'librarian@university.edu',
    studentId: 'LIB-STAFF-01',
    department: 'Central Library Administration',
    role: 'admin',
    maxHoldLimit: 10,
    notificationPrefs: {
      pickupReady: true,
      dueReminders: true,
      waitlistPromoted: true,
    },
    bookmarks: [],
    passwordHash: hashPassword('admin123'),
    createdAt: daysFromNow(-120),
  };

  const peerMaya: StoredUser = {
    _id: 'usr_student_maya',
    name: 'Maya Patel',
    email: 'maya.patel@university.edu',
    studentId: 'EE-2026-0198',
    department: 'Engineering',
    role: 'student',
    maxHoldLimit: 5,
    notificationPrefs: {
      pickupReady: true,
      dueReminders: true,
      waitlistPromoted: true,
    },
    bookmarks: [],
    passwordHash: hashPassword('student123'),
    createdAt: daysFromNow(-60),
  };

  const peerLiam: StoredUser = {
    _id: 'usr_student_liam',
    name: 'Liam Chen',
    email: 'liam.chen@university.edu',
    studentId: 'PH-2025-0874',
    department: 'Physics & Math',
    role: 'student',
    maxHoldLimit: 5,
    notificationPrefs: {
      pickupReady: true,
      dueReminders: true,
      waitlistPromoted: true,
    },
    bookmarks: [],
    passwordHash: hashPassword('student123'),
    createdAt: daysFromNow(-90),
  };

  const COVER_CS = '/src/assets/images/cover_computer_science_1794841924987.jpg';
  const COVER_PHYS = '/src/assets/images/cover_physics_math_1794841925760.jpg';
  const COVER_ENG = '/src/assets/images/cover_engineering_design_1794841926140.jpg';
  const COVER_HUM = '/src/assets/images/cover_humanities_lit_1794841926093.jpg';

  const books: Book[] = [
    {
      _id: 'bk_clrs',
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen, Charles E. Leiserson',
      isbn: '978-0262046305',
      callNumber: 'QA76.6 .I5858',
      department: 'Computer Science',
      floor: 'Floor 2',
      wing: 'Wing A',
      shelf: 'Shelf 04',
      totalCopies: 6,
      availableCopies: 3,
      coverUrl: COVER_CS,
      description: 'Comprehensive graduate and undergraduate reference covering graph algorithms, dynamic programming, amortized analysis, and NP-completeness.',
      publishedYear: 2022,
      edition: '4th Edition',
      createdAt: daysFromNow(-100),
    },
    {
      _id: 'bk_ddia',
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      isbn: '978-1449373320',
      callNumber: 'QA76.9.D3 K58',
      department: 'Computer Science',
      floor: 'Floor 2',
      wing: 'Wing A',
      shelf: 'Shelf 07',
      totalCopies: 3,
      availableCopies: 0,
      coverUrl: COVER_CS,
      description: 'Architectural principles behind reliable, scalable, and maintainable distributed storage, replication, partitioning, and stream processing.',
      publishedYear: 2017,
      edition: '1st Edition',
      createdAt: daysFromNow(-95),
    },
    {
      _id: 'bk_ostep',
      title: 'Operating Systems: Three Easy Pieces',
      author: 'Remzi H. Arpaci-Dusseau',
      isbn: '978-1985086593',
      callNumber: 'QA76.76.O63 A77',
      department: 'Computer Science',
      floor: 'Floor 2',
      wing: 'Wing A',
      shelf: 'Shelf 09',
      totalCopies: 5,
      availableCopies: 4,
      coverUrl: COVER_CS,
      description: 'Core systems textbook organized around virtualization, concurrency, and persistence with practical POSIX thread and filesystem labs.',
      publishedYear: 2018,
      edition: '1.00 Edition',
      createdAt: daysFromNow(-88),
    },
    {
      _id: 'bk_compilers',
      title: 'Compilers: Principles, Techniques, and Tools',
      author: 'Alfred V. Aho, Monica S. Lam',
      isbn: '978-0321486813',
      callNumber: 'QA76.76.C65 A37',
      department: 'Computer Science',
      floor: 'Floor 2',
      wing: 'Wing B',
      shelf: 'Shelf 02',
      totalCopies: 4,
      availableCopies: 2,
      coverUrl: COVER_CS,
      description: 'Foundational treatise on lexical analysis, syntax-directed translation, type checking, register allocation, and code optimization.',
      publishedYear: 2006,
      edition: '2nd Edition',
      createdAt: daysFromNow(-80),
    },
    {
      _id: 'bk_quantum',
      title: 'Introduction to Quantum Mechanics',
      author: 'David J. Griffiths, Darrell F. Schroeter',
      isbn: '978-1107189638',
      callNumber: 'QC174.12 .G75',
      department: 'Physics & Math',
      floor: 'Floor 3',
      wing: 'Wing C',
      shelf: 'Shelf 11',
      totalCopies: 5,
      availableCopies: 2,
      coverUrl: COVER_PHYS,
      description: 'Rigorous presentation of the Schrodinger equation, Hilbert space formalism, angular momentum, perturbation theory, and scattering.',
      publishedYear: 2018,
      edition: '3rd Edition',
      createdAt: daysFromNow(-75),
    },
    {
      _id: 'bk_linear',
      title: 'Linear Algebra Done Right',
      author: 'Sheldon Axler',
      isbn: '978-3031410253',
      callNumber: 'QA184.2 .A96',
      department: 'Physics & Math',
      floor: 'Floor 3',
      wing: 'Wing B',
      shelf: 'Shelf 06',
      totalCopies: 7,
      availableCopies: 5,
      coverUrl: COVER_PHYS,
      description: 'Proof-oriented approach to vector spaces, eigenvalues, inner-product spaces, and spectral theorems without early reliance on determinants.',
      publishedYear: 2024,
      edition: '4th Edition',
      createdAt: daysFromNow(-70),
    },
    {
      _id: 'bk_prob',
      title: 'Probability and Stochastic Processes',
      author: 'Roy D. Yates, David J. Goodman',
      isbn: '978-1118324561',
      callNumber: 'QA273 .Y38',
      department: 'Physics & Math',
      floor: 'Floor 3',
      wing: 'Wing B',
      shelf: 'Shelf 08',
      totalCopies: 4,
      availableCopies: 1,
      coverUrl: COVER_PHYS,
      description: 'Applied probability models, random variables, Markov chains, and estimation theory tailored for electrical and computer engineering.',
      publishedYear: 2014,
      edition: '3rd Edition',
      createdAt: daysFromNow(-65),
    },
    {
      _id: 'bk_mechanics',
      title: 'Classical Mechanics',
      author: 'Herbert Goldstein, Charles Poole',
      isbn: '978-0201657029',
      callNumber: 'QA805 .G6',
      department: 'Physics & Math',
      floor: 'Floor 3',
      wing: 'Wing C',
      shelf: 'Shelf 14',
      totalCopies: 3,
      availableCopies: 0,
      coverUrl: COVER_PHYS,
      description: 'Lagrangian and Hamiltonian formulations, canonical transformations, rigid body kinematics, and small oscillations.',
      publishedYear: 2001,
      edition: '3rd Edition',
      createdAt: daysFromNow(-60),
    },
    {
      _id: 'bk_structural',
      title: 'Structural Analysis',
      author: 'Russell C. Hibbeler',
      isbn: '978-0134610672',
      callNumber: 'TA645 .H47',
      department: 'Engineering',
      floor: 'Floor 1',
      wing: 'Wing D',
      shelf: 'Shelf 03',
      totalCopies: 5,
      availableCopies: 3,
      coverUrl: COVER_ENG,
      description: 'Comprehensive study of statically determinate and indeterminate trusses, beams, frames, and matrix stiffness methods.',
      publishedYear: 2019,
      edition: '10th Edition',
      createdAt: daysFromNow(-55),
    },
    {
      _id: 'bk_signals',
      title: 'Signals and Systems',
      author: 'Alan V. Oppenheim, Alan S. Willsky',
      isbn: '978-0138147570',
      callNumber: 'TK5102.9 .O67',
      department: 'Engineering',
      floor: 'Floor 1',
      wing: 'Wing D',
      shelf: 'Shelf 09',
      totalCopies: 4,
      availableCopies: 2,
      coverUrl: COVER_ENG,
      description: 'Continuous and discrete-time linear time-invariant systems, Fourier analysis, Laplace transforms, and sampling theory.',
      publishedYear: 1996,
      edition: '2nd Edition',
      createdAt: daysFromNow(-50),
    },
    {
      _id: 'bk_thermo',
      title: 'Thermodynamics: An Engineering Approach',
      author: 'Yunus A. Cengel, Michael A. Boles',
      isbn: '978-1260092684',
      callNumber: 'TJ265 .C43',
      department: 'Engineering',
      floor: 'Floor 1',
      wing: 'Wing C',
      shelf: 'Shelf 12',
      totalCopies: 6,
      availableCopies: 4,
      coverUrl: COVER_ENG,
      description: 'First and second laws of thermodynamics, entropy, exergy, power cycles, and refrigeration systems with clear physical intuition.',
      publishedYear: 2019,
      edition: '9th Edition',
      createdAt: daysFromNow(-48),
    },
    {
      _id: 'bk_architecture',
      title: 'The Architecture of the City',
      author: 'Aldo Rossi',
      isbn: '978-0262680431',
      callNumber: 'NA9031 .R6713',
      department: 'Humanities',
      floor: 'Floor 4',
      wing: 'Wing A',
      shelf: 'Shelf 05',
      totalCopies: 3,
      availableCopies: 2,
      coverUrl: COVER_HUM,
      description: 'Seminal urban theory exploring collective memory, typology, monuments, and the historical evolution of civic form.',
      publishedYear: 1984,
      edition: 'Revised Edition',
      createdAt: daysFromNow(-40),
    },
    {
      _id: 'bk_odyssey',
      title: 'The Odyssey (Annotated Scholarly Edition)',
      author: 'Homer, Trans. Emily Wilson',
      isbn: '978-0393356250',
      callNumber: 'PA4025.A5 W55',
      department: 'Humanities',
      floor: 'Floor 4',
      wing: 'Wing B',
      shelf: 'Shelf 01',
      totalCopies: 5,
      availableCopies: 5,
      coverUrl: COVER_HUM,
      description: 'Iambic pentameter translation accompanied by historical maps, textual apparatus, and thematic essays on ancient hospitality.',
      publishedYear: 2018,
      edition: 'Annotated Edition',
      createdAt: daysFromNow(-35),
    },
    {
      _id: 'bk_ethics',
      title: 'Nicomachean Ethics',
      author: 'Aristotle, Trans. Terence Irwin',
      isbn: '978-1624668159',
      callNumber: 'B430 .A5 I79',
      department: 'Humanities',
      floor: 'Floor 4',
      wing: 'Wing B',
      shelf: 'Shelf 08',
      totalCopies: 4,
      availableCopies: 3,
      coverUrl: COVER_HUM,
      description: 'Classical inquiry into human flourishing, moral virtue, practical wisdom, and friendship with extensive glossary notes.',
      publishedYear: 2019,
      edition: '3rd Edition',
      createdAt: daysFromNow(-30),
    },
  ];

  const reservations: Reservation[] = [
    {
      _id: 'res_seed_1',
      bookId: 'bk_clrs',
      userId: studentUser._id,
      status: 'reserved',
      pickupCode: 'PK-4821',
      reservedAt: hoursFromNow(-6),
      expiresAt: hoursFromNow(18),
      checkedOutAt: null,
      dueDate: null,
      returnedAt: null,
      waitlistPosition: null,
    },
    {
      _id: 'res_seed_2',
      bookId: 'bk_quantum',
      userId: studentUser._id,
      status: 'checked_out',
      pickupCode: 'PK-1190',
      reservedAt: daysFromNow(-12),
      expiresAt: daysFromNow(-11),
      checkedOutAt: daysFromNow(-11),
      dueDate: daysFromNow(3),
      returnedAt: null,
      waitlistPosition: null,
    },
    {
      _id: 'res_seed_3',
      bookId: 'bk_ddia',
      userId: studentUser._id,
      status: 'waitlisted',
      pickupCode: 'WL-0002',
      reservedAt: hoursFromNow(-14),
      expiresAt: null,
      checkedOutAt: null,
      dueDate: null,
      returnedAt: null,
      waitlistPosition: 2,
    },
    {
      _id: 'res_seed_4',
      bookId: 'bk_ddia',
      userId: peerMaya._id,
      status: 'waitlisted',
      pickupCode: 'WL-0001',
      reservedAt: daysFromNow(-1),
      expiresAt: null,
      checkedOutAt: null,
      dueDate: null,
      returnedAt: null,
      waitlistPosition: 1,
    },
    {
      _id: 'res_seed_5',
      bookId: 'bk_ddia',
      userId: peerLiam._id,
      status: 'checked_out',
      pickupCode: 'PK-7734',
      reservedAt: daysFromNow(-18),
      expiresAt: daysFromNow(-17),
      checkedOutAt: daysFromNow(-17),
      dueDate: daysFromNow(-3), // Intentionally 3 days overdue for Admin Panel showcase
      returnedAt: null,
      waitlistPosition: null,
    },
    {
      _id: 'res_seed_6',
      bookId: 'bk_mechanics',
      userId: peerMaya._id,
      status: 'checked_out',
      pickupCode: 'PK-3092',
      reservedAt: daysFromNow(-10),
      expiresAt: daysFromNow(-9),
      checkedOutAt: daysFromNow(-9),
      dueDate: daysFromNow(5),
      returnedAt: null,
      waitlistPosition: null,
    },
    {
      _id: 'res_seed_7',
      bookId: 'bk_ostep',
      userId: studentUser._id,
      status: 'returned',
      pickupCode: 'PK-2240',
      reservedAt: daysFromNow(-32),
      expiresAt: daysFromNow(-31),
      checkedOutAt: daysFromNow(-31),
      dueDate: daysFromNow(-17),
      returnedAt: daysFromNow(-19),
      waitlistPosition: null,
    },
  ];

  const alerts: LibraryAlert[] = [
    {
      _id: 'alt_seed_1',
      userId: studentUser._id,
      type: 'pickup_ready',
      title: 'Book Hold Ready for Pickup',
      message:
        'Introduction to Algorithms (Floor 2 · Wing A · Shelf 04) is held at the Main Circulation Desk. Present pickup code PK-4821 within 18 hours.',
      bookId: 'bk_clrs',
      reservationId: 'res_seed_1',
      read: false,
      createdAt: hoursFromNow(-6),
    },
    {
      _id: 'alt_seed_2',
      userId: studentUser._id,
      type: 'due_soon',
      title: 'Return Due in 3 Days',
      message:
        'Your checked-out copy of Introduction to Quantum Mechanics is due back in 3 days. Return to Central Library dropbox to avoid late holds.',
      bookId: 'bk_quantum',
      reservationId: 'res_seed_2',
      read: false,
      createdAt: hoursFromNow(-3),
    },
    {
      _id: 'alt_seed_3',
      userId: studentUser._id,
      type: 'system',
      title: 'Joined Waitlist (#2 in Queue)',
      message:
        'You are #2 in the waitlist for Designing Data-Intensive Applications. We will notify you immediately when a copy is returned.',
      bookId: 'bk_ddia',
      reservationId: 'res_seed_3',
      read: true,
      createdAt: hoursFromNow(-14),
    },
    {
      _id: 'alt_seed_4',
      userId: peerLiam._id,
      type: 'overdue',
      title: 'Overdue Notice: 3 Days Past Due',
      message:
        'Designing Data-Intensive Applications is 3 days overdue. Two students are currently waiting on the hold queue.',
      bookId: 'bk_ddia',
      reservationId: 'res_seed_5',
      read: false,
      createdAt: now,
    },
  ];

  return {
    users: [studentUser, adminUser, peerMaya, peerLiam],
    books,
    reservations,
    alerts,
  };
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDb(): LibraryDatabase {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedDatabase();
    writeDb(seed);
    return seed;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw) as LibraryDatabase;
}

export function writeDb(db: LibraryDatabase): void {
  ensureDataDir();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tempFile, DB_FILE);
}

export function toPublicUser(u: StoredUser): UserProfile {
  const { passwordHash: _ignored, ...safe } = u;
  return safe;
}

/**
 * Checks for expired pickup holds, promotes #1 waitlisted user if applicable,
 * and restores availableCopies when no waitlist exists.
 */
export function reconcileExpiredHolds(db: LibraryDatabase): boolean {
  const nowMs = Date.now();
  let mutated = false;

  for (const res of db.reservations) {
    if (res.status === 'reserved' && res.expiresAt && new Date(res.expiresAt).getTime() < nowMs) {
      res.status = 'expired';
      mutated = true;

      const book = db.books.find((b) => b._id === res.bookId);
      if (book) {
        db.alerts.unshift({
          _id: generateId('alt'),
          userId: res.userId,
          type: 'system',
          title: 'Pickup Window Expired',
          message: `Your 24-hour pickup hold for "${book.title}" has expired and the copy was released.`,
          bookId: book._id,
          reservationId: res._id,
          read: false,
          createdAt: new Date().toISOString(),
        });

        promoteNextWaitlistOrRelease(db, book);
      }
    }
  }

  return mutated;
}

export function promoteNextWaitlistOrRelease(db: LibraryDatabase, book: Book): void {
  const waitlist = db.reservations
    .filter((r) => r.bookId === book._id && r.status === 'waitlisted')
    .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));

  if (waitlist.length > 0) {
    const next = waitlist[0];
    next.status = 'reserved';
    next.pickupCode = generatePickupCode();
    next.expiresAt = hoursFromNow(24);
    next.waitlistPosition = null;

    // Re-index remaining waitlist positions
    waitlist.slice(1).forEach((w, idx) => {
      w.waitlistPosition = idx + 1;
    });

    db.alerts.unshift({
      _id: generateId('alt'),
      userId: next.userId,
      type: 'waitlist_promoted',
      title: 'Waitlist Promoted — Ready for Pickup',
      message: `A copy of "${book.title}" is now held for you at ${book.floor} · ${book.wing} · ${book.shelf}. Use code ${next.pickupCode} within 24 hours.`,
      bookId: book._id,
      reservationId: next._id,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } else {
    book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
  }
}
