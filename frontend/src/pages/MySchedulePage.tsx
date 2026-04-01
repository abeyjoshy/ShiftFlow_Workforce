import React, { useEffect, useMemo, useState } from 'react';

import { apiListShifts } from '../api/shifts';
import type { Shift } from '../types';

export function MySchedulePage() {
  const [items, setItems] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 7);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 21);
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiListShifts({ startDate: range.startDate, endDate: range.endDate, page: 1, limit: 100 });
        if (!active) return;
        if (!res.success) throw new Error(res.message ?? 'Failed to load schedule');
        setItems(res.data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load schedule');
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [range.endDate, range.startDate]);

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>My Schedule</div>
      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div className="card" style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>No shifts found.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((s) => (
              <div key={s._id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>
                  {String(s.date).slice(0, 10)} • {s.startTime}–{s.endTime}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{s.position}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

