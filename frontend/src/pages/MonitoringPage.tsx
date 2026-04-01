import React, { useEffect, useState } from 'react';

import { apiOnShiftNow, type OnShiftItem } from '../api/monitoring';

function pillStyle(bg: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: bg,
    border: '1px solid var(--border)',
    color: '#111827',
  };
}

export function MonitoringPage() {
  const [items, setItems] = useState<OnShiftItem[]>([]);
  const [now, setNow] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setError(null);
      try {
        const res = await apiOnShiftNow();
        if (!active) return;
        if (!res.success) throw new Error(res.message ?? 'Failed to load monitoring');
        setNow(res.data.now);
        setItems(res.data.items);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load monitoring');
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Monitoring</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{now ? `Now: ${now}` : ''}</div>
        </div>
        <button type="button" className="btnGhost" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>

      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div className="card" style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>No shifts today.</div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Employee</th>
                  <th style={{ padding: '10px 8px' }}>Shift</th>
                  <th style={{ padding: '10px 8px' }}>Clock</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const emp = it.shift.employeeId as any;
                  const name =
                    emp && typeof emp === 'object'
                      ? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.email || 'Employee'
                      : 'Employee';
                  return (
                    <tr key={String(it.shift._id)} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: 13 }}>{name}</td>
                      <td style={{ padding: '10px 8px', fontSize: 13 }}>
                        {String(it.shift.startTime)}–{String(it.shift.endTime)} • {it.shift.position}
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: 13 }}>
                        {it.shift.actualStartTime ? `In ${it.shift.actualStartTime}` : '—'}
                        {it.shift.actualEndTime ? ` • Out ${it.shift.actualEndTime}` : ''}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {it.isClockedIn ? (
                          <span style={pillStyle('rgba(34,197,94,0.15)')}>Clocked in</span>
                        ) : it.isClockedOut ? (
                          <span style={pillStyle('rgba(148,163,184,0.25)')}>Clocked out</span>
                        ) : it.isScheduledNow ? (
                          <span style={pillStyle('rgba(59,130,246,0.12)')}>Scheduled now</span>
                        ) : (
                          <span style={pillStyle('rgba(148,163,184,0.15)')}>Upcoming / later</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

