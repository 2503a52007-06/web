export type UserRole = 'student' | 'admin';

export interface NotificationPrefs {
  pickupReady: boolean;
  dueReminders: boolean;
  waitlistPromoted: boolean;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  role: UserRole;
  maxHoldLimit: number;
  notificationPrefs: NotificationPrefs;
  bookmarks: string[];
  createdAt: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  callNumber: string;
  department: string;
  floor: string;
  wing: string;
  shelf: string;
  totalCopies: number;
  availableCopies: number;
  coverUrl: string;
  description: string;
  publishedYear: number;
  edition: string;
  waitlistCount?: number;
  createdAt: string;
}

export type ReservationStatus =
  | 'reserved'
  | 'waitlisted'
  | 'checked_out'
  | 'returned'
  | 'cancelled'
  | 'expired';

export interface Reservation {
  _id: string;
  bookId: string;
  userId: string;
  status: ReservationStatus;
  pickupCode: string;
  reservedAt: string;
  expiresAt: string | null;
  checkedOutAt: string | null;
  dueDate: string | null;
  returnedAt: string | null;
  waitlistPosition: number | null;
  extendedOnce?: boolean;
  book?: Book;
  user?: Pick<UserProfile, '_id' | 'name' | 'email' | 'studentId' | 'department'>;
}

export type AlertType =
  | 'pickup_ready'
  | 'waitlist_promoted'
  | 'due_soon'
  | 'overdue'
  | 'system';

export interface LibraryAlert {
  _id: string;
  userId: string;
  type: AlertType;
  title: string;
  message: string;
  bookId?: string;
  reservationId?: string;
  read: boolean;
  createdAt: string;
}

export interface AdminOverview {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  activeHolds: number;
  checkedOutCount: number;
  waitlistedCount: number;
  overdueCount: number;
  overdueReservations: Reservation[];
}
