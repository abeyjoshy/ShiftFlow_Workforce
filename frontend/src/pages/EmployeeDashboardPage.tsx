import React, { useEffect, useMemo, useState } from 'react';

import { apiListNotifications } from '../api/notifications';
import { apiAcceptSwap, apiCreateSwap, apiDeclineSwap, apiListSwaps } from '../api/swaps';
import { apiClockIn, apiClockOut, apiListShifts } from '../api/shifts';
import { apiEmployeeDirectory, type EmployeeDirectoryItem } from '../api/employeeDirectory';
import { apiCancelTimeOff, apiCreateSickRequest, apiListTimeOff } from '../api/timeOff';
import { useEmployeeAuth } from '../hooks/useEmployeeAuth';
import type { Notification, Shift, SwapRequest, TimeOffRequest } from '../types';

function mondayOfWeekUtc(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0 Sun ... 6 Sat
  const diff = (day + 6) % 7; // since Monday
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoStartOfDayUtc(dateOnlyIso: string): string {
  return `${dateOnlyIso}T00:00:00.000Z`;
}

function swapHasOffered(s: SwapRequest): boolean {
  const o = s.offeredShiftId;
  if (!o) return false;
  if (typeof o === 'object' && o !== null) return true;
  return typeof o === 'string' && o.length > 0;
}

function formatShiftLine(shift: Shift): string {
  return `${String(shift.date).slice(0, 10)} • ${shift.startTime}–${shift.endTime} • ${shift.position}`;
}

export function EmployeeDashboardPage() {
  const { employee, logout } = useEmployeeAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [directory, setDirectory] = useState<EmployeeDirectoryItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOfWeekUtc(new Date()));
  const [swapDraft, setSwapDraft] = useState<{
    requestedShiftId: string;
    targetEmployeeId: string;
    note: string;
    mode: 'take' | 'swap';
    offeredShiftId?: string;
  } | null>(null);
  const [targetShiftsForSwap, setTargetShiftsForSwap] = useState<Shift[]>([]);
  const [sickDraft, setSickDraft] = useState<{ startDate: string; endDate: string; note: string }>({
    startDate: isoDate(new Date()),
    endDate: isoDate(new Date()),
    note: '',
  });

  const weekRange = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setUTCDate(end.getUTCDate() + 7);
    const startDate = isoDate(start);
    const endDate = isoDate(end);
    return {
      startDate,
      endDate,
      startDateTime: isoStartOfDayUtc(startDate),
      endDateTime: isoStartOfDayUtc(endDate),
    };
  }, [weekStart]);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      out.push(isoDate(d));
    }
    return out;
  }, [weekStart]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [s, w, n, t] = await Promise.all([
          apiListShifts({ startDate: weekRange.startDateTime, endDate: weekRange.endDateTime, page: 1, limit: 100 }),
          apiListSwaps({ page: 1, limit: 50 }),
          apiListNotifications({ page: 1, limit: 10 }),
          apiListTimeOff({ page: 1, limit: 50 }),
        ]);
        if (!active) return;
        if (s.success) setShifts(s.data);
        if (w.success) setSwaps(w.data);
        if (n.success) setNotifications(n.data);
        if (t.success) setTimeOff(t.data);

        const dir = await apiEmployeeDirectory();
        if (dir.success) {
          setDirectory(dir.data);
          if (!swapDraft && s.success && s.data.length > 0) {
            const firstShift = s.data[0];
            const firstTarget = dir.data.find((e) => e._id !== firstShift.employeeId) ?? dir.data[0];
            if (firstTarget)
              setSwapDraft({
                requestedShiftId: firstShift._id,
                targetEmployeeId: firstTarget._id,
                note: '',
                mode: 'take',
              });
          }
        }
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load employee dashboard');
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [swapDraft, weekRange.endDateTime, weekRange.startDateTime]);

  useEffect(() => {
    if (!swapDraft || swapDraft.mode !== 'swap') {
      setTargetShiftsForSwap([]);
      return;
    }
    let active = true;
    void (async () => {
      const res = await apiListShifts({
        employeeId: swapDraft.targetEmployeeId,
        startDate: weekRange.startDateTime,
        endDate: weekRange.endDateTime,
        page: 1,
        limit: 100,
      });
      if (active && res.success) setTargetShiftsForSwap(res.data);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch coworker shifts when mode, target, or week changes
  }, [swapDraft?.mode, swapDraft?.targetEmployeeId, weekRange.startDateTime, weekRange.endDateTime]);

  useEffect(() => {
    setSwapDraft((p) => {
      if (!p || p.mode !== 'swap') return p;
      if (targetShiftsForSwap.length === 0) {
        if (p.offeredShiftId === undefined) return p;
        return { ...p, offeredShiftId: undefined };
      }
      const valid = targetShiftsForSwap.some((sh) => sh._id === p.offeredShiftId);
      if (valid) return p;
      return { ...p, offeredShiftId: targetShiftsForSwap[0]._id };
    });
  }, [targetShiftsForSwap]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const d of days) map.set(d, []);
    for (const s of shifts) {
      const day = new Date(String(s.date)).toISOString().slice(0, 10);
      const arr = map.get(day) ?? [];
      arr.push(s);
      map.set(day, arr);
    }
    for (const d of days) {
      const arr = map.get(d) ?? [];
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(d, arr);
    }
    return map;
  }, [days, shifts]);

  const todayIso = useMemo(() => isoDate(new Date()), []);

  const onClockIn = async (shiftId: string) => {
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiClockIn(shiftId);
      if (!res.success) throw new Error(res.message ?? 'Clock in failed');
      setShifts((prev) => prev.map((s) => (s._id === shiftId ? res.data : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock in failed');
    } finally {
      setIsSaving(false);
    }
  };

  const onClockOut = async (shiftId: string) => {
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiClockOut(shiftId);
      if (!res.success) throw new Error(res.message ?? 'Clock out failed');
      setShifts((prev) => prev.map((s) => (s._id === shiftId ? res.data : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock out failed');
    } finally {
      setIsSaving(false);
    }
  };

  const onCreateSwap = async () => {
    if (!swapDraft) return;
    if (swapDraft.mode === 'swap' && !swapDraft.offeredShiftId) {
      setError('Pick one of their shifts to swap with, or use “Take my shift” instead.');
      return;
    }
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiCreateSwap({
        requestedShiftId: swapDraft.requestedShiftId,
        targetEmployeeId: swapDraft.targetEmployeeId,
        offeredShiftId: swapDraft.mode === 'swap' && swapDraft.offeredShiftId ? swapDraft.offeredShiftId : undefined,
        requesterNote: swapDraft.note ? swapDraft.note : undefined,
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to create swap');
      const refreshed = await apiListSwaps({ page: 1, limit: 50 });
      if (refreshed.success) setSwaps(refreshed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create swap');
    } finally {
      setIsSaving(false);
    }
  };

  const onSwapDecision = async (swapId: string, decision: 'accept' | 'decline') => {
    setError(null);
    try {
      setIsSaving(true);
      const res = decision === 'accept' ? await apiAcceptSwap(swapId) : await apiDeclineSwap(swapId);
      if (!res.success) throw new Error(res.message ?? 'Failed to update swap');
      setSwaps((prev) => prev.map((s) => (s._id === swapId ? res.data : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update swap');
    } finally {
      setIsSaving(false);
    }
  };

  const incomingSwaps = useMemo(() => {
    if (!employee) return [];
    return swaps.filter((s) => {
      const target = typeof s.targetEmployeeId === 'object' && s.targetEmployeeId !== null ? s.targetEmployeeId._id : s.targetEmployeeId;
      return target === employee._id;
    });
  }, [employee, swaps]);

  const outgoingSwaps = useMemo(() => {
    if (!employee) return [];
    return swaps.filter((s) => {
      const reqId = typeof s.requesterId === 'object' && s.requesterId !== null ? s.requesterId._id : s.requesterId;
      return reqId === employee._id;
    });
  }, [employee, swaps]);

  const onCreateSick = async () => {
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiCreateSickRequest({
        startDate: `${sickDraft.startDate}T00:00:00.000Z`,
        endDate: `${sickDraft.endDate}T00:00:00.000Z`,
        note: sickDraft.note ? sickDraft.note : undefined,
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to submit');
      const refreshed = await apiListTimeOff({ page: 1, limit: 50 });
      if (refreshed.success) setTimeOff(refreshed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setIsSaving(false);
    }
  };

  const onCancelTimeOff = async (id: string) => {
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiCancelTimeOff(id);
      if (!res.success) throw new Error(res.message ?? 'Failed to cancel');
      setTimeOff((prev) => prev.map((t) => (t._id === id ? res.data : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="employeePortal">
      <div className="employeeHeader">
        <div className="employeeHeaderTop">
          <div>
            <h1 className="employeeTitle">Employee dashboard</h1>
            <div className="employeeName">{employee ? `${employee.firstName} ${employee.lastName}` : ''}</div>
          </div>
          <button type="button" className="btnGhost employeeLogout" onClick={logout}>
            Log out
          </button>
        </div>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <div className="employeeWeekBar">
          <div className="employeeWeekControls">
            <button
              type="button"
              className="btnGhost"
              onClick={() => setWeekStart((prev) => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))}
            >
              ‹ Prev week
            </button>
            <button type="button" className="btnGhost" onClick={() => setWeekStart(mondayOfWeekUtc(new Date()))}>
              This week
            </button>
            <button
              type="button"
              className="btnGhost"
              onClick={() => setWeekStart((prev) => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))}
            >
              Next week ›
            </button>
          </div>
          <div className="employeeWeekLabel">Week of {weekRange.startDate}</div>
        </div>
      </div>

      <div className="employeeLayout">
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Today</div>
            {isLoading ? (
              <div style={{ color: 'var(--muted)' }}>Loading…</div>
            ) : (shiftsByDay.get(todayIso) ?? []).length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No shifts today.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {(shiftsByDay.get(todayIso) ?? []).map((s) => {
                  const canClockIn = !s.actualStartTime;
                  const canClockOut = !!s.actualStartTime && !s.actualEndTime;
                  return (
                    <div key={s._id} className="listRow" style={{ background: '#fff' }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="listRowTitle">
                          {s.startTime}–{s.endTime} • {s.position}
                        </div>
                        <div className="listRowMeta">
                          {s.actualStartTime ? `Clocked in: ${s.actualStartTime}` : 'Not clocked in yet'}
                          {s.actualEndTime ? ` • Clocked out: ${s.actualEndTime}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8, minWidth: 160 }}>
                        <button type="button" className="btnGhost" disabled={!canClockIn || isSaving} onClick={() => onClockIn(s._id)}>
                          {s.actualStartTime ? 'Clocked in' : 'Clock in'}
                        </button>
                        <button type="button" className="btnPrimary" disabled={!canClockOut || isSaving} onClick={() => onClockOut(s._id)}>
                          {s.actualEndTime ? 'Clocked out' : 'Clock out'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>My Schedule (week)</div>
          {isLoading ? (
            <div style={{ color: 'var(--muted)' }}>Loading…</div>
          ) : (
            <div className="employeeWeekScroller">
              <div className="employeeWeekGrid">
                {days.map((d) => {
                  const dayShifts = shiftsByDay.get(d) ?? [];
                  const isToday = d === todayIso;
                  return (
                    <div
                      key={d}
                      className="employeeDayCard"
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        background: isToday ? 'var(--brand-muted)' : '#fff',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{d}</div>
                      {dayShifts.length === 0 ? (
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>No shifts</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {dayShifts.map((s) => {
                            return (
                              <div key={s._id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: '#fff' }}>
                                <div style={{ fontWeight: 800, fontSize: 13 }}>
                                  {s.startTime}–{s.endTime}
                                </div>
                                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{s.position}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Swap Requests</div>
            {isLoading ? (
              <div style={{ color: 'var(--muted)' }}>Loading…</div>
            ) : (
              <>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Shift change request</div>
                  {!swapDraft ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>No shifts loaded yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Request type</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="swapMode"
                              checked={swapDraft.mode === 'take'}
                              onChange={() => setSwapDraft((p) => (p ? { ...p, mode: 'take', offeredShiftId: undefined } : p))}
                            />
                            <span>
                              <strong>Take my shift</strong>
                              <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                                They cover your shift. You are not assigned one of theirs.
                              </span>
                            </span>
                          </label>
                          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="swapMode"
                              checked={swapDraft.mode === 'swap'}
                              onChange={() => setSwapDraft((p) => (p ? { ...p, mode: 'swap' } : p))}
                            />
                            <span>
                              <strong>Swap shifts</strong>
                              <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                                You trade shifts: they take yours and you take a specific shift of theirs (this week).
                              </span>
                            </span>
                          </label>
                        </div>
                      </div>

                      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                        My shift
                        <select
                          value={swapDraft.requestedShiftId}
                          onChange={(e) => setSwapDraft((p) => (p ? { ...p, requestedShiftId: e.target.value } : p))}
                          style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                        >
                          {shifts.map((s) => (
                            <option key={s._id} value={s._id}>
                              {new Date(String(s.date)).toISOString().slice(0, 10)} • {s.startTime}–{s.endTime} • {s.position}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                        With (employee)
                        <select
                          value={swapDraft.targetEmployeeId}
                          onChange={(e) => setSwapDraft((p) => (p ? { ...p, targetEmployeeId: e.target.value } : p))}
                          style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                        >
                          {directory
                            .filter((d) => d._id !== employee?._id)
                            .map((d) => (
                              <option key={d._id} value={d._id}>
                                {d.firstName} {d.lastName}
                              </option>
                            ))}
                        </select>
                      </label>

                      {swapDraft.mode === 'swap' ? (
                        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                          Their shift you take (swap pair)
                          {targetShiftsForSwap.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--muted)', padding: 8, background: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>
                              No shifts for this person in the week shown above. Change week or pick “Take my shift”, or ask a manager to add their shift.
                            </div>
                          ) : (
                            <select
                              value={swapDraft.offeredShiftId ?? ''}
                              onChange={(e) => setSwapDraft((p) => (p ? { ...p, offeredShiftId: e.target.value } : p))}
                              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                            >
                              {targetShiftsForSwap.map((s) => (
                                <option key={s._id} value={s._id}>
                                  {new Date(String(s.date)).toISOString().slice(0, 10)} • {s.startTime}–{s.endTime} • {s.position}
                                </option>
                              ))}
                            </select>
                          )}
                        </label>
                      ) : null}

                      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                        Note (optional)
                        <input
                          value={swapDraft.note}
                          onChange={(e) => setSwapDraft((p) => (p ? { ...p, note: e.target.value } : p))}
                          style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                        />
                      </label>

                      <button
                        type="button"
                        className="btnPrimary"
                        disabled={isSaving || (swapDraft.mode === 'swap' && targetShiftsForSwap.length === 0)}
                        onClick={onCreateSwap}
                      >
                        {isSaving ? 'Submitting…' : 'Submit request'}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Incoming</div>
                  {incomingSwaps.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>No incoming swaps.</div>
                  ) : (
                    incomingSwaps.slice(0, 5).map((s) => {
                      const reqShift = typeof s.requestedShiftId === 'object' && s.requestedShiftId !== null ? (s.requestedShiftId as Shift) : null;
                      const offShift = typeof s.offeredShiftId === 'object' && s.offeredShiftId !== null ? (s.offeredShiftId as Shift) : null;
                      return (
                      <div key={s._id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)' }}>
                          {swapHasOffered(s) ? 'Swap' : 'Take my shift'} • {s.status} • {s.targetStatus ?? 'pending'}
                        </div>
                        {reqShift ? (
                          <div style={{ fontSize: 13, marginTop: 6 }}>
                            <span style={{ color: 'var(--muted)' }}>Their shift: </span>
                            {formatShiftLine(reqShift)}
                          </div>
                        ) : null}
                        {swapHasOffered(s) && offShift ? (
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            <span style={{ color: 'var(--muted)' }}>Your shift in trade: </span>
                            {formatShiftLine(offShift)}
                          </div>
                        ) : null}
                        {s.requesterNote ? <div style={{ fontSize: 13, marginTop: 6 }}>{s.requesterNote}</div> : null}
                        {s.status === 'pending' && (s.targetStatus ?? 'pending') === 'pending' ? (
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button type="button" className="btnGhost" disabled={isSaving} onClick={() => onSwapDecision(s._id, 'decline')}>
                              Decline
                            </button>
                            <button type="button" className="btnPrimary" disabled={isSaving} onClick={() => onSwapDecision(s._id, 'accept')}>
                              Accept
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                    })
                  )}

                  <div style={{ fontWeight: 800, fontSize: 13, marginTop: 8 }}>Outgoing</div>
                  {outgoingSwaps.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>No outgoing swaps.</div>
                  ) : (
                    outgoingSwaps.slice(0, 5).map((s) => {
                      const reqShift = typeof s.requestedShiftId === 'object' && s.requestedShiftId !== null ? (s.requestedShiftId as Shift) : null;
                      const offShift = typeof s.offeredShiftId === 'object' && s.offeredShiftId !== null ? (s.offeredShiftId as Shift) : null;
                      return (
                      <div key={s._id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)' }}>
                          {swapHasOffered(s) ? 'Swap' : 'Take my shift'} • {s.status} • {s.targetStatus ?? 'pending'}
                        </div>
                        {reqShift ? (
                          <div style={{ fontSize: 13, marginTop: 6 }}>
                            <span style={{ color: 'var(--muted)' }}>Your shift: </span>
                            {formatShiftLine(reqShift)}
                          </div>
                        ) : null}
                        {swapHasOffered(s) && offShift ? (
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            <span style={{ color: 'var(--muted)' }}>Their shift you take: </span>
                            {formatShiftLine(offShift)}
                          </div>
                        ) : null}
                        {s.requesterNote ? <div style={{ fontSize: 13, marginTop: 6 }}>{s.requesterNote}</div> : null}
                      </div>
                    );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Sick Requests</div>
            {isLoading ? (
              <div style={{ color: 'var(--muted)' }}>Loading…</div>
            ) : (
              <>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>Submit sick request</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                        Start date
                        <input
                          type="date"
                          value={sickDraft.startDate}
                          onChange={(e) => setSickDraft((p) => ({ ...p, startDate: e.target.value }))}
                          style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                        End date
                        <input
                          type="date"
                          value={sickDraft.endDate}
                          onChange={(e) => setSickDraft((p) => ({ ...p, endDate: e.target.value }))}
                          style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                        />
                      </label>
                    </div>

                    <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                      Note (optional)
                      <input
                        value={sickDraft.note}
                        onChange={(e) => setSickDraft((p) => ({ ...p, note: e.target.value }))}
                        style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                    </label>

                    <button type="button" className="btnPrimary" disabled={isSaving} onClick={onCreateSick}>
                      {isSaving ? 'Submitting…' : 'Submit'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {timeOff.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>No sick requests.</div>
                  ) : (
                    timeOff.slice(0, 5).map((t) => (
                      <div key={t._id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)' }}>
                          {t.type} • {t.status}
                        </div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          {String(t.startDate).slice(0, 10)} → {String(t.endDate).slice(0, 10)}
                        </div>
                        {t.note ? <div style={{ fontSize: 13, marginTop: 6 }}>{t.note}</div> : null}
                        {t.status === 'pending' ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                            <button type="button" className="btnGhost" disabled={isSaving} onClick={() => onCancelTimeOff(t._id)}>
                              Cancel
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Notifications</div>
            {isLoading ? (
              <div style={{ color: 'var(--muted)' }}>Loading…</div>
            ) : notifications.length === 0 ? (
              <div style={{ color: 'var(--muted)' }}>No notifications.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n._id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{n.title}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

