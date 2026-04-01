import React, { useEffect, useMemo, useState } from 'react';

import { apiGetOrg, apiUpdateOrg } from '../api/org';
import type { Organization } from '../types';

export function OrgSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [maxShiftHours, setMaxShiftHours] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiGetOrg();
        if (!active) return;
        if (!res.success) throw new Error(res.message ?? 'Failed to load org');
        setOrg(res.data);
        setName(res.data.name);
        setTimezone(res.data.settings.timezone);
        setWeekStartDay(res.data.settings.weekStartDay);
        setMaxShiftHours(res.data.settings.maxShiftHours);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load org');
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

  const dirty = useMemo(() => {
    if (!org) return false;
    return (
      name !== org.name ||
      timezone !== org.settings.timezone ||
      weekStartDay !== org.settings.weekStartDay ||
      maxShiftHours !== org.settings.maxShiftHours
    );
  }, [maxShiftHours, name, org, timezone, weekStartDay]);

  const onSave = async () => {
    setError(null);
    try {
      setIsSaving(true);
      const res = await apiUpdateOrg({
        name,
        settings: { timezone, weekStartDay, maxShiftHours },
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to save');
      setOrg(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Organization Settings</div>
        <button type="button" className="btnPrimary" disabled={!dirty || isSaving || isLoading} onClick={onSave}>
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div className="card" style={{ padding: 16, maxWidth: 820 }}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : !org ? (
          <div style={{ color: 'var(--muted)' }}>Org not found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Organization name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Timezone
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Week start day (0=Sun, 1=Mon)
              <input
                value={String(weekStartDay)}
                onChange={(e) => setWeekStartDay(Number(e.target.value))}
                inputMode="numeric"
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Max shift hours
              <input
                value={String(maxShiftHours)}
                onChange={(e) => setMaxShiftHours(Number(e.target.value))}
                inputMode="numeric"
                style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

