import {
  Bell,
  BookmarkCheck,
  Menu,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { AdminPanelModule } from './modules/AdminPanelModule';
import { AlertsModule } from './modules/AlertsModule';
import { ReservationModule } from './modules/ReservationModule';
import { SearchModule } from './modules/SearchModule';
import { UserAccountModule } from './modules/UserAccountModule';
import type { LibraryAlert, Reservation, UserProfile } from './types/library';

type ModuleKey = 'search' | 'reservations' | 'alerts' | 'account' | 'admin';

const MODULE_LABELS: Record<ModuleKey, string> = {
  search: 'Catalog Search',
  reservations: 'My Reservations',
  alerts: 'Alerts & Notices',
  account: 'Student Account',
  admin: 'Admin Portal',
};

function getInitialModule(): ModuleKey {
  if (typeof window === 'undefined') return 'search';
  if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
    return 'admin';
  }
  return 'search';
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>(getInitialModule);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [alerts, setAlerts] = useState<LibraryAlert[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const navigateModule = useCallback((next: ModuleKey) => {
    setActiveModule(next);
    if (typeof window !== 'undefined') {
      const targetPath = next === 'admin' ? '/admin' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveModule(getInitialModule());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const loadUserData = useCallback(async () => {
    setLoadingUserData(true);
    try {
      const [resData, alertData] = await Promise.all([
        api.getReservations(),
        api.getAlerts(),
      ]);
      setReservations(resData.reservations);
      setAlerts(alertData.alerts);
    } catch {
      setReservations([]);
      setAlerts([]);
    } finally {
      setLoadingUserData(false);
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    api
      .me()
      .then((res) => {
        setUser(res.user);
        return loadUserData();
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      });
  }, [loadUserData]);

  async function handleAuthenticated(authenticatedUser: UserProfile) {
    setUser(authenticatedUser);
    await loadUserData();
  }

  async function handleLogout() {
    await api.logout().catch(() => {});
    setStoredToken(null);
    setUser(null);
    setReservations([]);
    setAlerts([]);
    navigateModule('search');
  }

  async function handleReserveFromBookmarks(bookId: string) {
    await api.createReservation(bookId);
    await loadUserData();
    navigateModule('reservations');
  }

  const activeHoldCount = reservations.filter(
    (r) => r.status === 'reserved' || r.status === 'waitlisted' || r.status === 'checked_out'
  ).length;
  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const navItems: Array<{
    key: ModuleKey;
    label: string;
    Icon: typeof Search;
    count?: number;
  }> = [
    { key: 'search', label: 'Catalog Search', Icon: Search },
    {
      key: 'reservations',
      label: 'My Reservations',
      Icon: BookmarkCheck,
      count: user ? activeHoldCount : undefined,
    },
    {
      key: 'alerts',
      label: 'Alerts & Notices',
      Icon: Bell,
      count: user && unreadAlertCount > 0 ? unreadAlertCount : undefined,
    },
    { key: 'account', label: 'Student Account', Icon: User },
    { key: 'admin', label: 'Admin Portal', Icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <button
            type="button"
            onClick={() => navigateModule('search')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            FolioReserve
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Library modules">
          {navItems.map(({ key, label, Icon, count }) => {
            const active = activeModule === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigateModule(key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{label}</span>
                </span>
                {typeof count === 'number' && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      active ? 'text-blue-700 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          {user ? (
            <>
              <div className="font-medium text-slate-900 truncate">{user.name}</div>
              <div className="font-mono text-[11px] truncate">
                {user.studentId} · {user.role === 'admin' ? 'Admin' : 'Student'}
              </div>
            </>
          ) : (
            <div>Browsing as Guest</div>
          )}
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col z-50">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="font-display text-lg font-bold text-slate-900">
                FolioReserve
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map(({ key, label, Icon, count }) => {
                const active = activeModule === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      navigateModule(key);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md whitespace-nowrap ${
                      active
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{label}</span>
                    </span>
                    {typeof count === 'number' && (
                      <span className="font-mono text-xs tabular-nums">{count}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-400 hidden sm:inline">FolioReserve</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {MODULE_LABELS[activeModule]}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => navigateModule(user.role === 'admin' ? 'admin' : 'account')}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                {user.name}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeModule === 'search' && (
            <SearchModule
              user={user}
              reservations={reservations}
              onRequireAuth={() => setAuthModalOpen(true)}
              onReserveSuccess={async () => {
                await loadUserData();
              }}
              onUserUpdated={setUser}
              onNavigateToReservations={() => navigateModule('reservations')}
            />
          )}

          {activeModule === 'reservations' && (
            <ReservationModule
              user={user}
              reservations={reservations}
              loading={loadingUserData}
              onRequireAuth={() => setAuthModalOpen(true)}
              onRefresh={loadUserData}
              onNavigateToSearch={() => navigateModule('search')}
            />
          )}

          {activeModule === 'alerts' && (
            <AlertsModule
              user={user}
              alerts={alerts}
              loading={loadingUserData}
              onRequireAuth={() => setAuthModalOpen(true)}
              onRefresh={loadUserData}
              onNavigateToReservations={() => navigateModule('reservations')}
            />
          )}

          {activeModule === 'account' && (
            <UserAccountModule
              user={user}
              reservations={reservations}
              onRequireAuth={() => setAuthModalOpen(true)}
              onUserUpdated={setUser}
              onLogout={handleLogout}
              onNavigateToSearch={() => navigateModule('search')}
              onReserveBook={handleReserveFromBookmarks}
            />
          )}

          {activeModule === 'admin' && (
            <AdminPanelModule
              user={user}
              onUserAuthenticated={handleAuthenticated}
              onCirculationUpdated={loadUserData}
              onExitToCatalog={() => navigateModule('search')}
            />
          )}
        </main>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
