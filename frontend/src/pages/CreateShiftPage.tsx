import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreateShiftPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Array<{ _id: string; firstName: string; lastName: string; email: string }>>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [position, setPosition] = useState('Staff');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        id: e._id,
        label: `${e.firstName} ${e.lastName} — ${e.email}`,
      })),
    [employees],
  );

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const mod = await import('../api/employees');
        const res = await mod.apiListEmployees({ status: 'active', page: 1, limit: 100 });
        if (!active) return;
        if (!res.success) throw new Error(res.message ?? 'Failed to load employees');
        setEmployees(res.data);
        if (!employeeId && res.data[0]?._id) setEmployeeId(res.data[0]._id);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load employees');
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSaving(true);
      const mod = await import('../api/shifts');
      const res = await mod.apiCreateShift({
        employeeId,
        date,
        startTime,
        endTime,
        position,
        location: location || undefined,
        status,
        notes: notes || undefined,
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to create shift');
      navigate('/schedule');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shift');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Create Shift</div>
      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <form className="card" style={{ padding: 16, maxWidth: 820 }} onSubmit={onSubmit}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Employee
              <select
                value={employeeId}
                onChange={(ev) => setEmployeeId(ev.target.value)}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              >
                {employeeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Date
              <input
                value={date}
                onChange={(ev) => setDate(ev.target.value)}
                type="date"
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Start time
              <input
                value={startTime}
                onChange={(ev) => setStartTime(ev.target.value)}
                type="time"
                step={900}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              End time
              <input
                value={endTime}
                onChange={(ev) => setEndTime(ev.target.value)}
                type="time"
                step={900}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Position
              <input
                value={position}
                onChange={(ev) => setPosition(ev.target.value)}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Location / area
              <input
                value={location}
                onChange={(ev) => setLocation(ev.target.value)}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Status
              <select
                value={status}
                onChange={(ev) => setStatus(ev.target.value as 'draft' | 'published')}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13, gridColumn: '1 / -1' }}>
              Notes
              <textarea
                value={notes}
                onChange={(ev) => setNotes(ev.target.value)}
                rows={4}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', resize: 'vertical' }}
              />
            </label>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="btnGhost" disabled={isSaving} onClick={() => navigate('/schedule')}>
            Cancel
          </button>
          <button type="submit" className="btnPrimary" disabled={isSaving || isLoading || !employeeId}>
            {isSaving ? 'Saving…' : 'Create shift'}
          </button>
        </div>
      </form>
    </div>
  );
}

