import React, { useEffect, useMemo, useState } from 'react';

import { apiDeleteNotification, apiListNotifications, apiMarkAllRead, apiMarkRead } from '../api/notifications';
import type { Notification } from '../types';

export function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiListNotifications({ page: 1, limit: 50 });
        if (!res.success) throw new Error(res.message ?? 'Failed to load notifications');
        setItems(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      setIsSaving(true);
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Notifications</div>
        <button type="button" className="btnGhost" disabled={isSaving} onClick={() => act(async () => void (await apiMarkAllRead()))}>
          Mark all read
        </button>
      </div>

      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div className="card" style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>No notifications.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((n) => (
              <div
                key={n._id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: n.isRead ? '#fff' : 'rgba(0,169,165,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{n.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{n.message}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                    {String(n.createdAt).slice(0, 19).replace('T', ' ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {!n.isRead ? (
                    <button type="button" className="btnGhost" disabled={isSaving} onClick={() => act(async () => void (await apiMarkRead(n._id)))}>
                      Mark read
                    </button>
                  ) : null}
                  <button type="button" className="btnGhost" disabled={isSaving} onClick={() => act(async () => void (await apiDeleteNotification(n._id)))}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

