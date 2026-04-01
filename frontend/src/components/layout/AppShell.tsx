import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { apiListNotifications, apiUnreadCount } from '../../api/notifications';
import { useAuth } from '../../hooks/useAuth';
import type { Notification } from '../../types';

function usePageTitle(): string {
  const { pathname } = useLocation();
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/schedule')) return 'Schedule';
  if (pathname.startsWith('/employees')) return 'Employees';
  if (pathname.startsWith('/monitoring')) return 'Monitoring';
  if (pathname.startsWith('/time-off')) return 'Time Off Requests';
  if (pathname.startsWith('/swaps')) return 'Swap Requests';
  if (pathname.startsWith('/notifications')) return 'Notifications';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/my-schedule')) return 'My Schedule';
  return 'ShiftFlow';
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const title = usePageTitle();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [latest, setLatest] = useState<Notification[]>([]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [countRes, latestRes] = await Promise.all([
          apiUnreadCount(),
          apiListNotifications({ page: 1, limit: 5 }),
        ]);
        if (!active) return;
        if (countRes.success) setUnread(countRes.data.count);
        if (latestRes.success) setLatest(latestRes.data);
      } catch {
        if (!active) return;
        setUnread(0);
        setLatest([]);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!isOpen) return;
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nav = useMemo(
    () => [
      { to: '/', label: 'Dashboard', show: true },
      { to: '/schedule', label: 'Schedule', show: user?.role === 'owner' || user?.role === 'manager' },
      { to: '/monitoring', label: 'Monitoring', show: user?.role === 'owner' || user?.role === 'manager' },
      { to: '/employees', label: 'Employees', show: user?.role === 'owner' || user?.role === 'manager' },
      { to: '/time-off', label: 'Time Off', show: user?.role === 'owner' || user?.role === 'manager' },
      { to: '/swaps', label: 'Swaps', show: true },
      { to: '/notifications', label: 'Notifications', show: true, badge: unread },
      { to: '/my-schedule', label: 'My Schedule', show: user?.role === 'employee' },
      { to: '/settings', label: 'Settings', show: user?.role === 'owner' },
    ],
    [unread, user?.role],
  );

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="appShell">
      <div
        className={sidebarOpen ? 'sidebarBackdrop sidebarBackdrop--visible' : 'sidebarBackdrop'}
        aria-hidden={!sidebarOpen}
        onClick={closeSidebar}
      />

      <aside className={sidebarOpen ? 'sidebar sidebar--open' : 'sidebar'}>
        <div className="sidebarLogo">
          <div>
            <div className="sidebarLogoMark">
              <span>Shift</span>Flow
            </div>
            <div className="sidebarLogoSub">Workforce</div>
          </div>
        </div>
        <nav className="sidebarNav">
          {nav
            .filter((n) => n.show)
            .map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={closeSidebar}
                className={({ isActive }) => (isActive ? 'navItem navItemActive' : 'navItem')}
              >
                <span>{n.label}</span>
                {typeof n.badge === 'number' && n.badge > 0 ? <span className="navBadge">{n.badge}</span> : null}
              </NavLink>
            ))}
        </nav>

        <div className="sidebarFooter">
          <div className="sidebarUserName">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="sidebarUserRole">{user?.role}</div>
          <button type="button" className="btnGhost" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbarLeft">
            <button
              type="button"
              className="mobileMenuBtn"
              aria-label="Open navigation menu"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon />
            </button>
            <div className="topbarTitle">{title}</div>
          </div>
          <div className="topbarRight" ref={wrapperRef}>
            <div className="notifWrap">
              <button type="button" className="btnGhost btnBell" onClick={() => setIsOpen((v) => !v)}>
                <BellIcon />
                <span>Alerts</span>
                {unread > 0 ? <span className="navBadge" style={{ background: 'var(--brand)', color: '#fff' }}>{unread}</span> : null}
              </button>

              {isOpen ? (
                <div className="card notifPanel" role="dialog" aria-label="Notifications preview">
                  <div className="notifPanelHeader">
                    <div className="notifPanelTitle">Notifications</div>
                    <button type="button" className="btnGhost" onClick={() => navigate('/notifications')}>
                      View all
                    </button>
                  </div>

                  {latest.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13, padding: 8 }}>You&apos;re all caught up.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {latest.map((n) => (
                        <button
                          key={n._id}
                          type="button"
                          onClick={() => navigate('/notifications')}
                          className={n.isRead ? 'notifItem' : 'notifItem notifItem--unread'}
                        >
                          <div className="notifItemTitle">{n.title}</div>
                          <div className="notifItemMsg">{n.message}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
