import type {
  AdminOverview,
  Book,
  LibraryAlert,
  NotificationPrefs,
  Reservation,
  UserProfile,
} from '../types/library';

const TOKEN_STORAGE_KEY = 'folio_reserve_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted frames
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Auth & User Account
  login: (email: string, password: string) =>
    request<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: {
    name: string;
    email: string;
    studentId: string;
    department: string;
    password: string;
  }) =>
    request<{ user: UserProfile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: UserProfile }>('/api/auth/me'),

  updateProfile: (payload: {
    name?: string;
    department?: string;
    notificationPrefs?: NotificationPrefs;
  }) =>
    request<{ user: UserProfile }>('/api/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  toggleBookmark: (bookId: string) =>
    request<{ bookmarks: string[]; bookmarked: boolean }>(
      `/api/account/bookmarks/${encodeURIComponent(bookId)}`,
      { method: 'POST' }
    ),

  // Search Module
  getBooks: (params: {
    q?: string;
    department?: string;
    availability?: string;
    floor?: string;
    sort?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.department && params.department !== 'All') sp.set('department', params.department);
    if (params.availability && params.availability !== 'all')
      sp.set('availability', params.availability);
    if (params.floor && params.floor !== 'All') sp.set('floor', params.floor);
    if (params.sort) sp.set('sort', params.sort);
    const qs = sp.toString();
    return request<{ books: Book[] }>(`/api/books${qs ? `?${qs}` : ''}`);
  },

  // Reservation Module
  getReservations: () =>
    request<{ reservations: Reservation[] }>('/api/reservations'),

  createReservation: (bookId: string) =>
    request<{ reservation: Reservation; message: string }>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    }),

  cancelReservation: (id: string) =>
    request<{ reservation: Reservation }>(
      `/api/reservations/${encodeURIComponent(id)}/cancel`,
      { method: 'POST' }
    ),

  extendReservation: (id: string) =>
    request<{ reservation: Reservation }>(
      `/api/reservations/${encodeURIComponent(id)}/extend`,
      { method: 'POST' }
    ),

  // Alerts Module
  getAlerts: () =>
    request<{ alerts: LibraryAlert[]; unreadCount: number }>('/api/alerts'),

  markAlertRead: (id: string) =>
    request<{ alert: LibraryAlert }>(
      `/api/alerts/${encodeURIComponent(id)}/read`,
      { method: 'PATCH' }
    ),

  markAllAlertsRead: () =>
    request<{ ok: boolean }>('/api/alerts/read-all', { method: 'POST' }),

  // Admin Panel Module
  getAdminOverview: () =>
    request<{ overview: AdminOverview }>('/api/admin/overview'),

  getAdminReservations: () =>
    request<{ reservations: Reservation[]; students: UserProfile[] }>(
      '/api/admin/reservations'
    ),

  createBook: (payload: {
    title: string;
    author: string;
    isbn: string;
    callNumber: string;
    department: string;
    floor: string;
    wing: string;
    shelf: string;
    totalCopies: number;
    description: string;
    publishedYear: number;
    edition: string;
  }) =>
    request<{ book: Book }>('/api/admin/books', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateBook: (id: string, payload: Partial<Book>) =>
    request<{ book: Book }>(`/api/admin/books/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteBook: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/books/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  checkoutReservation: (id: string) =>
    request<{ reservation: Reservation }>(
      `/api/admin/reservations/${encodeURIComponent(id)}/checkout`,
      { method: 'POST' }
    ),

  returnReservation: (id: string) =>
    request<{ reservation: Reservation }>(
      `/api/admin/reservations/${encodeURIComponent(id)}/return`,
      { method: 'POST' }
    ),

  broadcastAlert: (payload: {
    userId: string;
    title: string;
    message: string;
    type: string;
  }) =>
    request<{ sentCount: number }>('/api/admin/alerts/broadcast', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyPickupCode: (pickupCode: string) =>
    request<{ reservation: Reservation }>('/api/admin/reservations/verify-code', {
      method: 'POST',
      body: JSON.stringify({ pickupCode }),
    }),

  updateStudent: (id: string, payload: { maxHoldLimit?: number; department?: string }) =>
    request<{ student: UserProfile }>(`/api/admin/students/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
