import React, { useEffect, useMemo, useState } from 'react';

import { apiApproveTimeOff, apiListTimeOff, apiRejectTimeOff } from '../api/timeOff';
import { useAuth } from '../hooks/useAuth';
import type { Employee, TimeOffRequest } from '../types';

function asEmployee(x: TimeOffRequest['employeeId']): Employee | null {
  return typeof x === 'object' && x !== null ? (x as Employee) : null;
}

export function TimeOffRequestsPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'owner' || user?.role === 'manager';
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [items, setItems] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiListTimeOff({ status: tab, page: 1, limit: 50 });
        if (!res.success) throw new Error(res.message ?? 'Failed to load requests');
        setItems(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load requests');
      } finally {
        setIsLoading(false);
      }
    },
    [tab],
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
        <div style={{ fontSize: 22, fontWeight: 600 }}>Time Off Requests</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['pending', 'approved', 'rejected'] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? 'btnPrimary' : 'btnGhost'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div className="card" style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>No time off requests.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((t) => {
              const emp = asEmployee(t.employeeId);
              return (
                <div key={t._id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>
                        {String(t.startDate).slice(0, 10)} → {String(t.endDate).slice(0, 10)}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                        {emp ? `${emp.firstName} ${emp.lastName}` : 'Employee'} • {t.type}
                      </div>
                      {t.note ? <div style={{ marginTop: 6, fontSize: 13 }}>{t.note}</div> : null}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      {t.status}
                    </div>
                  </div>

                  {tab === 'pending' && isManager ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        className="btnGhost"
                        disabled={isSaving}
                        onClick={() => act(async () => void (await apiRejectTimeOff(t._id)))}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btnPrimary"
                        disabled={isSaving}
                        onClick={() => act(async () => void (await apiApproveTimeOff(t._id)))}
                      >
                        Approve
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

