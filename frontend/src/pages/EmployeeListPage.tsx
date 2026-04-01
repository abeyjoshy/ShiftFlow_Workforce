import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiListEmployees } from '../api/employees';
import { useOrgStructure } from '../hooks/useOrgStructure';
import type { Employee } from '../types';

export function EmployeeListPage() {
  const { departmentNameById, positionNameById } = useOrgStructure();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('active');
  const [page] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const departmentIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) set.add(e.departmentId);
    return Array.from(set).sort();
  }, [employees]);

  const departmentOptions = useMemo(() => {
    const arr = departmentIds.map((id) => ({ id, label: departmentNameById[id] ?? id }));
    arr.sort((a, b) => a.label.localeCompare(b.label));
    return arr;
  }, [departmentIds, departmentNameById]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiListEmployees({
          departmentId: departmentId || undefined,
          status: status || undefined,
          page,
          limit,
        });
        if (!active) return;
        if (!res.success) throw new Error(res.message ?? 'Failed to load employees');
        setEmployees(res.data);
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
  }, [departmentId, status, page, limit]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Employees</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{isLoading ? 'Loading…' : `${employees.length} shown`}</div>
        </div>
        <Link to="/employees/new">
          <button type="button" className="btnPrimary">
            Add employee
          </button>
        </Link>
      </div>

      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | '')}
            style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
          </select>
        </label>

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
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
            gap: 0,
            padding: 12,
            borderBottom: '1px solid var(--border)',
            color: 'var(--muted)',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <div>Name</div>
          <div>Position</div>
          <div>Department</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {isLoading ? (
          <div style={{ padding: 16, color: 'var(--muted)' }}>Loading…</div>
        ) : employees.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--muted)' }}>No employees found.</div>
        ) : (
          employees.map((e) => (
            <div
              key={e._id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
                padding: 12,
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {e.firstName} {e.lastName}
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{e.email}</div>
              </div>
              <div>{positionNameById[e.positionId] ?? e.positionId}</div>
              <div>{departmentNameById[e.departmentId] ?? e.departmentId}</div>
              <div style={{ color: e.isActive ? 'var(--success)' : 'var(--danger)', fontWeight: 800, fontSize: 12 }}>
                {e.isActive ? 'ACTIVE' : 'INACTIVE'}
              </div>
              <div style={{ textAlign: 'right' }}>
                <Link to={`/employees/${e._id}`} className="navItem" style={{ display: 'inline-block', padding: 0 }}>
                  View
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

