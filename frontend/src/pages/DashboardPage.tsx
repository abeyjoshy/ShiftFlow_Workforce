import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiListNotifications } from '../api/notifications';
import { apiGetOrgStats, type OrgStats } from '../api/org';
import { apiListShifts } from '../api/shifts';
import { useAuth } from '../hooks/useAuth';
import type { Notification, Shift } from '../types';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'manager';

  const [stats, setStats] = useState<OrgStats | null>(null);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => isoDate(today), [today]);
  const endDate = useMemo(() => isoDate(today), [today]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [s, shiftsRes, notifRes] = await Promise.all([
          apiGetOrgStats(),
          apiListShifts({ startDate, endDate, page: 1, limit: 50 }),
          apiListNotifications({ page: 1, limit: 5 }),
        ]);

        if (!isMounted) return;
        if (s.success) setStats(s.data);
        if (shiftsRes.success) setTodayShifts(shiftsRes.data);
        if (notifRes.success) setRecentNotifications(notifRes.data);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate]);

  return (
    <div>
      <h1 className="pageTitle">Overview</h1>

      {error ? <div className="alert alert--error" style={{ marginBottom: 16 }}>{error}</div> : null}

      <div className="statGrid">
        <div className="card statCard">
          <div className="statLabel">Shifts this week</div>
          <div className="statValue">{isLoading ? '—' : stats?.shiftsThisWeek ?? 0}</div>
        </div>
        <div className="card statCard">
          <div className="statLabel">Employees</div>
          <div className="statValue">{isLoading ? '—' : stats?.totalEmployees ?? 0}</div>
        </div>
        <div className="card statCard">
          <div className="statLabel">Pending swaps</div>
          <div className="statValue">{isLoading ? '—' : stats?.openSwaps ?? 0}</div>
        </div>
        <div className="card statCard">
          <div className="statLabel">Hours (this week)</div>
          <div className="statValue">{isLoading ? '—' : stats?.hoursSummary ?? 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: 14, letterSpacing: '-0.02em' }}>Today&apos;s shifts</div>
          {isLoading ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
          ) : todayShifts.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>No shifts scheduled today.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {todayShifts.map((s) => (
                <div key={s._id} className="listRow">
                  <div>
                    <div className="listRowTitle">
                      {s.startTime} – {s.endTime}
                    </div>
                    <div className="listRowMeta">{s.position}</div>
                  </div>
                  <span className="pill">{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 800, marginBottom: 14, letterSpacing: '-0.02em' }}>Recent notifications</div>
          {isLoading ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
          ) : recentNotifications.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>You&apos;re all caught up.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {recentNotifications.map((n) => (
                <div key={n._id} className="listRow" style={{ background: '#fff' }}>
                  <div>
                    <div className="listRowTitle">{n.title}</div>
                    <div className="listRowMeta">{n.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
        {canManage ? (
          <>
            <button className="btnPrimary" type="button" onClick={() => navigate('/schedule/new')}>
              Add shift
            </button>
            <button className="btnGhost" type="button" onClick={() => navigate('/employees/new')}>
              Add employee
            </button>
            <button className="btnGhost" type="button" onClick={() => navigate('/schedule')}>
              View schedule
            </button>
          </>
        ) : user?.role === 'employee' ? (
          <button className="btnPrimary" type="button" onClick={() => navigate('/my-schedule')}>
            My schedule
          </button>
        ) : null}
      </div>
    </div>
  );
}
