import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';

import { apiCreateShift, apiGetWeekSchedule, apiPublishWeek } from '../api/shifts';
import { useOrgStructure } from '../hooks/useOrgStructure';
import type { Employee, Shift } from '../types';
import { ShiftCard } from '../components/schedule/ShiftCard';

function mondayOfWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0 Sun ... 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  const label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] ?? '';
  return `${label} ${iso.slice(5)}`;
}

export function WeeklySchedulePage() {
  const { departments, positions, departmentNameById, positionNameById } = useOrgStructure();
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOfWeek(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('');

  const [draftCell, setDraftCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [form, setForm] = useState({ startTime: '09:00', endTime: '17:00', position: 'Staff', location: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [editForm, setEditForm] = useState<{
    startTime: string;
    endTime: string;
    position: string;
    location: string;
    status: Shift['status'];
  }>({ startTime: '09:00', endTime: '17:00', position: 'Staff', location: '', status: 'draft' });

  const weekStartIso = useMemo(() => isoDate(weekStart), [weekStart]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiGetWeekSchedule({ weekStart: weekStartIso });
        if (!active) return;
        if (!res.success) throw new Error(res.message ?? 'Failed to load schedule');
        setEmployees(res.data.employees);
        setShifts(res.data.shifts);
        setWeekDays(res.data.weekDays);
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
  }, [weekStartIso]);

  const shiftsByKey = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const day = new Date(String(s.date)).toISOString().slice(0, 10);
      const key = `${s.employeeId}__${day}`;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [shifts]);

  const departmentOptions = useMemo(() => {
    const list = departments.map((d) => ({ id: d._id, label: d.name }));
    list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [departments]);

  const positionOptions = useMemo(() => {
    const list = positions
      .filter((p) => !departmentId || p.departmentId === departmentId)
      .map((p) => ({ id: p._id, label: p.name }));
    list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [departmentId, positions]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const deptOk = !departmentId || e.departmentId === departmentId;
      const posOk = !positionId || e.positionId === positionId;
      return deptOk && posOk;
    });
  }, [departmentId, employees, positionId]);

  const onPublishWeek = async () => {
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiPublishWeek({ weekStart: weekStartIso });
      if (!res.success) throw new Error(res.message ?? 'Failed to publish');
      const refreshed = await apiGetWeekSchedule({ weekStart: weekStartIso });
      if (refreshed.success) setShifts(refreshed.data.shifts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setIsSaving(false);
    }
  };

  const onCreateShift = async () => {
    if (!draftCell) return;
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiCreateShift({
        employeeId: draftCell.employeeId,
        date: draftCell.date,
        startTime: form.startTime,
        endTime: form.endTime,
        position: form.position,
        location: form.location || undefined,
        status: 'draft',
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to create shift');
      setDraftCell(null);
      const refreshed = await apiGetWeekSchedule({ weekStart: weekStartIso });
      if (refreshed.success) setShifts(refreshed.data.shifts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create shift');
    } finally {
      setIsSaving(false);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { over, active } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith('cell__')) return;

    const [, employeeId, date] = overId.split('__');
    if (!employeeId || !date) return;

    const shiftId = String(active.id);
    const shift = shifts.find((s) => s._id === shiftId);
    if (!shift) return;

    // optimistic update: move to new employee/date (keep time)
    setShifts((prev) =>
      prev.map((s) => (s._id === shiftId ? { ...s, employeeId, date: `${date}T00:00:00.000Z` } : s)),
    );

    try {
      const mod = await import('../api/shifts');
      const res = await mod.apiUpdateShift(shiftId, { employeeId, date });
      if (!res.success) throw new Error(res.message ?? 'Failed to move shift');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to move shift');
      const refreshed = await apiGetWeekSchedule({ weekStart: weekStartIso });
      if (refreshed.success) setShifts(refreshed.data.shifts);
    }
  };

  const onOpenEdit = (shift: Shift) => {
    setEditShift(shift);
    setEditForm({
      startTime: shift.startTime,
      endTime: shift.endTime,
      position: shift.position,
      location: shift.location ?? '',
      status: shift.status,
    });
  };

  const onSaveEdit = async () => {
    if (!editShift) return;
    setError(null);
    try {
      setIsSaving(true);
      const patch = {
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        position: editForm.position,
        location: editForm.location || undefined,
        status: editForm.status,
      };
      // optimistic
      setShifts((prev) => prev.map((s) => (s._id === editShift._id ? { ...s, ...patch } : s)));
      const mod = await import('../api/shifts');
      const res = await mod.apiUpdateShift(editShift._id, patch);
      if (!res.success) throw new Error(res.message ?? 'Failed to update shift');
      setEditShift(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update shift');
      const refreshed = await apiGetWeekSchedule({ weekStart: weekStartIso });
      if (refreshed.success) setShifts(refreshed.data.shifts);
    } finally {
      setIsSaving(false);
    }
  };

  const onDeleteShift = async () => {
    if (!editShift) return;
    setError(null);
    const shiftId = editShift._id;
    try {
      setIsSaving(true);
      // optimistic remove
      setShifts((prev) => prev.filter((s) => s._id !== shiftId));
      const mod = await import('../api/shifts');
      const res = await mod.apiDeleteShift(shiftId);
      if (!res.success) throw new Error(res.message ?? 'Failed to delete shift');
      setEditShift(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete shift');
      const refreshed = await apiGetWeekSchedule({ weekStart: weekStartIso });
      if (refreshed.success) setShifts(refreshed.data.shifts);
    } finally {
      setIsSaving(false);
    }
  };

  function ScheduleCell({
    droppableId,
    children,
  }: {
    droppableId: string;
    children: React.ReactNode;
  }) {
    const { isOver, setNodeRef } = useDroppable({ id: droppableId });
    return (
      <div
        ref={setNodeRef}
        style={{
          padding: 10,
          borderLeft: '1px solid var(--border)',
          minHeight: 72,
          background: isOver ? 'rgba(0,169,165,0.06)' : undefined,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btnGhost"
            onClick={() => setWeekStart((prev) => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))}
          >
            ‹
          </button>
          <div style={{ fontWeight: 700 }}>
            Week of {weekStartIso}
          </div>
          <button
            type="button"
            className="btnGhost"
            onClick={() => setWeekStart((prev) => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btnPrimary" disabled={isSaving} onClick={onPublishWeek}>
            {isSaving ? 'Publishing…' : 'Publish week'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Department
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="">All</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Position
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="">All</option>
            {positionOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        <strong style={{ color: 'var(--text, #111)' }}>Tip:</strong> click a shift (or <strong>Edit</strong>) to change time, position, or delete. Use the{' '}
        <strong>⋮⋮</strong> handle on the left to drag a shift to another day or person.
      </div>

      <DndContext onDragEnd={onDragEnd}>
        <div className="card" style={{ overflow: 'auto' }}>
          <div style={{ minWidth: 900 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `220px repeat(7, minmax(140px, 1fr))`,
              borderBottom: '1px solid var(--border)',
              background: '#fff',
            }}
          >
            <div style={{ padding: 12, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Employees</div>
            {weekDays.map((d) => (
              <div key={d} style={{ padding: 12, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                {dayLabel(d)}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div style={{ padding: 16, color: 'var(--muted)' }}>Loading…</div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--muted)' }}>No employees yet.</div>
          ) : (
            filteredEmployees.map((e) => (
              <div
                key={e._id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `220px repeat(7, minmax(140px, 1fr))`,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {e.firstName} {e.lastName}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {positionNameById[e.positionId] ?? e.positionId}
                    {' • '}
                    {departmentNameById[e.departmentId] ?? e.departmentId}
                  </div>
                </div>

                {weekDays.map((d) => {
                  const key = `${e._id}__${d}`;
                  const cellShifts = shiftsByKey.get(key) ?? [];
                  const droppableId = `cell__${e._id}__${d}`;
                  return (
                    <ScheduleCell key={key} droppableId={droppableId}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {cellShifts.map((s) => (
                          <ShiftCard key={s._id} shift={s} onEdit={() => onOpenEdit(s)} showActualTimes={false} />
                        ))}

                        <button
                          type="button"
                          className="btnGhost"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={() => setDraftCell({ employeeId: e._id, date: d })}
                        >
                          + Add
                        </button>
                      </div>
                    </ScheduleCell>
                  );
                })}
              </div>
            ))
          )}
          </div>
        </div>
      </DndContext>

      {draftCell ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            zIndex: 100,
          }}
          onClick={() => (isSaving ? undefined : setDraftCell(null))}
        >
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Create shift</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
              {draftCell.date}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Start
                <input
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                End
                <input
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Position
                <input
                  value={form.position}
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Location (optional)
                <input
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btnGhost" disabled={isSaving} onClick={() => setDraftCell(null)}>
                Cancel
              </button>
              <button type="button" className="btnPrimary" disabled={isSaving} onClick={onCreateShift}>
                {isSaving ? 'Saving…' : 'Save draft'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editShift ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            zIndex: 100,
          }}
          onClick={() => (isSaving ? undefined : setEditShift(null))}
        >
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Edit shift</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
              {new Date(String(editShift.date)).toISOString().slice(0, 10)} • {editShift.position}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Start
                <input
                  value={editForm.startTime}
                  onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                End
                <input
                  value={editForm.endTime}
                  onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Position
                <input
                  value={editForm.position}
                  onChange={(e) => setEditForm((p) => ({ ...p, position: e.target.value }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Status
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as Shift['status'] }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, gridColumn: '1 / -1' }}>
                Location (optional)
                <input
                  value={editForm.location}
                  onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                  style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
              <button type="button" className="btnGhost" disabled={isSaving} onClick={onDeleteShift}>
                Delete shift
              </button>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btnGhost" disabled={isSaving} onClick={() => setEditShift(null)}>
                Cancel
              </button>
              <button type="button" className="btnPrimary" disabled={isSaving} onClick={onSaveEdit}>
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

