import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiCreateEmployee } from '../api/employees';
import { apiGetOrgStructure } from '../api/orgStructure';

export function AddEmployeePage() {
  const navigate = useNavigate();
  const [structure, setStructure] = useState<{
    departments: Array<{ _id: string; name: string }>;
    positions: Array<{ _id: string; name: string; departmentId: string }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    positionId: '',
    employmentType: 'full-time' as 'full-time' | 'part-time' | 'casual',
    canLogin: false,
    password: '',
    hourlyRate: '',
    weeklyHours: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiGetOrgStructure();
        if (!active) return;
        if (!res.success) throw new Error(res.message ?? 'Failed to load org structure');
        setStructure({ departments: res.data.departments, positions: res.data.positions });
        const firstDept = res.data.departments[0]?._id ?? '';
        const firstPos =
          res.data.positions.find((p) => p.departmentId === firstDept)?._id ?? res.data.positions[0]?._id ?? '';
        setForm((p) => ({ ...p, departmentId: firstDept, positionId: firstPos }));
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load org structure');
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const positionsForDept = useMemo(() => {
    if (!structure) return [];
    return structure.positions.filter((p) => p.departmentId === form.departmentId);
  }, [form.departmentId, structure]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiCreateEmployee({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        departmentId: form.departmentId,
        positionId: form.positionId,
        employmentType: form.employmentType,
        canLogin: form.canLogin,
        password: form.canLogin ? form.password : undefined,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        weeklyHours: form.weeklyHours ? Number(form.weeklyHours) : undefined,
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to create employee');
      navigate(`/employees/${res.data._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Add Employee</div>
      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <form className="card" style={{ padding: 16, maxWidth: 820 }} onSubmit={onSubmit}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            First name
            <input
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              required
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Last name
            <input
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              required
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Email
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              type="email"
              required
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Phone (optional)
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Department
            <select
              value={form.departmentId}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  departmentId: e.target.value,
                  positionId:
                    (structure?.positions.find((pos) => pos.departmentId === e.target.value)?._id ?? '') || p.positionId,
                }))
              }
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            >
              {(structure?.departments ?? []).map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Position
            <select
              value={form.positionId}
              onChange={(e) => setForm((p) => ({ ...p, positionId: e.target.value }))}
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            >
              {positionsForDept.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Employment type
            <select
              value={form.employmentType}
              onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value as 'full-time' | 'part-time' | 'casual' }))}
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="casual">Casual</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Can login
            <input
              type="checkbox"
              checked={form.canLogin}
              onChange={(e) => setForm((p) => ({ ...p, canLogin: e.target.checked }))}
            />
          </label>
          {form.canLogin ? (
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Password
              <input
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                type="password"
                required
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>
          ) : null}
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Hourly rate (optional)
            <input
              value={form.hourlyRate}
              onChange={(e) => setForm((p) => ({ ...p, hourlyRate: e.target.value }))}
              inputMode="decimal"
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Weekly hours (optional)
            <input
              value={form.weeklyHours}
              onChange={(e) => setForm((p) => ({ ...p, weeklyHours: e.target.value }))}
              inputMode="decimal"
              style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
            />
          </label>
        </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="btnGhost" disabled={isSaving} onClick={() => navigate('/employees')}>
            Cancel
          </button>
          <button type="submit" className="btnPrimary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Create employee'}
          </button>
        </div>
      </form>
    </div>
  );
}

