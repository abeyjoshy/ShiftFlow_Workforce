import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiDeactivateEmployee, apiGetEmployee, apiGetEmployeeShifts, apiUpdateAvailability } from '../api/employees';
import { useOrgStructure } from '../hooks/useOrgStructure';
import type { AvailabilityBlock, Employee, Shift } from '../types';

const DAYS: Array<{ label: string; day: number }> = [
  { label: 'Mon', day: 1 },
  { label: 'Tue', day: 2 },
  { label: 'Wed', day: 3 },
  { label: 'Thu', day: 4 },
  { label: 'Fri', day: 5 },
  { label: 'Sat', day: 6 },
  { label: 'Sun', day: 0 },
];

function defaultAvailability(): AvailabilityBlock[] {
  return DAYS.map((d) => ({ day: d.day, startTime: '09:00', endTime: '17:00' }));
}

export function EmployeeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const employeeId = id ?? '';
  const { departmentNameById, positionNameById } = useOrgStructure();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>(defaultAvailability());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  }, [today]);
  const endDate = useMemo(() => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + 21);
    return d.toISOString().slice(0, 10);
  }, [today]);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [empRes, shiftsRes] = await Promise.all([
          apiGetEmployee(employeeId),
          apiGetEmployeeShifts({ id: employeeId, startDate, endDate, page: 1, limit: 50 }),
        ]);
        if (!active) return;
        if (!empRes.success) throw new Error(empRes.message ?? 'Failed to load employee');
        setEmployee(empRes.data);
        setAvailability(empRes.data.availability?.length ? empRes.data.availability : defaultAvailability());
        if (shiftsRes.success) setShifts(shiftsRes.data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load employee');
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [employeeId, startDate, endDate]);

  const onSaveAvailability = async () => {
    if (!employeeId) return;
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiUpdateAvailability(employeeId, availability);
      if (!res.success) throw new Error(res.message ?? 'Failed to update availability');
      setEmployee(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update availability');
    } finally {
      setIsSaving(false);
    }
  };

  const onDeactivate = async () => {
    if (!employeeId) return;
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiDeactivateEmployee(employeeId);
      if (!res.success) throw new Error(res.message ?? 'Failed to deactivate');
      navigate('/employees');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate');
    } finally {
      setIsSaving(false);
    }
  };

  if (!employeeId) {
    return <div style={{ color: 'var(--danger)' }}>Missing employee id</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>
            {employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            {employee
              ? `${positionNameById[employee.positionId] ?? employee.positionId} • ${
                  departmentNameById[employee.departmentId] ?? employee.departmentId
                }`
              : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btnGhost" onClick={() => navigate('/employees')}>
            Back
          </button>
          <button type="button" className="btnGhost" disabled={isSaving} onClick={onDeactivate}>
            Deactivate
          </button>
        </div>
      </div>

      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      {isLoading ? (
        <div className="card" style={{ padding: 16, color: 'var(--muted)' }}>
          Loading…
        </div>
      ) : !employee ? (
        <div className="card" style={{ padding: 16, color: 'var(--muted)' }}>
          Employee not found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Profile</div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div>
                <div style={{ color: 'var(--muted)' }}>Email</div>
                <div style={{ fontWeight: 700 }}>{employee.email}</div>
              </div>
              {employee.phone ? (
                <div>
                  <div style={{ color: 'var(--muted)' }}>Phone</div>
                  <div style={{ fontWeight: 700 }}>{employee.phone}</div>
                </div>
              ) : null}
              <div>
                <div style={{ color: 'var(--muted)' }}>Employment</div>
                <div style={{ fontWeight: 700 }}>{employee.employmentType}</div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)' }}>Status</div>
                <div style={{ fontWeight: 800, color: employee.isActive ? 'var(--success)' : 'var(--danger)' }}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontWeight: 800 }}>Availability</div>
                <button type="button" className="btnPrimary" disabled={isSaving} onClick={onSaveAvailability}>
                  {isSaving ? 'Saving…' : 'Save availability'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {DAYS.map((d) => {
                  const idx = availability.findIndex((a) => a.day === d.day);
                  const block = idx >= 0 ? availability[idx] : { day: d.day, startTime: '09:00', endTime: '17:00' };
                  return (
                    <div key={d.day} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontWeight: 800 }}>{d.label}</div>
                      <input
                        value={block.startTime}
                        onChange={(e) =>
                          setAvailability((prev) =>
                            prev.map((p) => (p.day === d.day ? { ...p, startTime: e.target.value } : p)),
                          )
                        }
                        style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                      <input
                        value={block.endTime}
                        onChange={(e) =>
                          setAvailability((prev) =>
                            prev.map((p) => (p.day === d.day ? { ...p, endTime: e.target.value } : p)),
                          )
                        }
                        style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Upcoming shifts</div>
              {shifts.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>No shifts found in the selected range.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {shifts.map((s) => (
                    <div
                      key={s._id}
                      style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', gap: 12 }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>
                          {String(s.date).slice(0, 10)} • {s.startTime}–{s.endTime}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>{s.position}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        {s.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

