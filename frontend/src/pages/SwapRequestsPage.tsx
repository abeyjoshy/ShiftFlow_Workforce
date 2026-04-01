import React, { useEffect, useMemo, useState } from 'react';

import { apiApproveSwap, apiCancelSwap, apiListSwaps, apiRejectSwap } from '../api/swaps';
import { useAuth } from '../hooks/useAuth';
import type { Employee, Shift, SwapRequest } from '../types';

function asEmployee(x: SwapRequest['requesterId']): Employee | null {
  return typeof x === 'object' && x !== null ? (x as Employee) : null;
}

function asShift(x: SwapRequest['requestedShiftId'] | SwapRequest['offeredShiftId']): Shift | null {
  return typeof x === 'object' && x !== null ? (x as Shift) : null;
}

function swapHasOffered(s: SwapRequest): boolean {
  const o = s.offeredShiftId;
  if (!o) return false;
  if (typeof o === 'object' && o !== null) return true;
  return typeof o === 'string' && o.length > 0;
}

export function SwapRequestsPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'owner' || user?.role === 'manager';
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [items, setItems] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiListSwaps({
          status: tab,
          targetStatus: tab === 'pending' ? 'accepted' : undefined,
          page: 1,
          limit: 50,
        });
        if (!res.success) throw new Error(res.message ?? 'Failed to load swaps');
        setItems(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load swaps');
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
      <h1 className="pageTitle" style={{ marginBottom: 12 }}>
        Swap requests
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['pending', 'approved', 'rejected'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'btnPrimary' : 'btnGhost'}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div className="card" style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>No swap requests.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((s) => {
              const requester = asEmployee(s.requesterId);
              const target = typeof s.targetEmployeeId === 'object' && s.targetEmployeeId !== null ? (s.targetEmployeeId as Employee) : null;
              const shift = asShift(s.requestedShiftId);
              const offered = asShift(s.offeredShiftId);
              const canApprove = (s.targetStatus ?? 'pending') === 'accepted';
              return (
                <div key={s._id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                        {swapHasOffered(s) ? 'Swap (two-way)' : 'Take my shift (giveaway)'}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>
                        {shift
                          ? `Requester’s shift: ${String(shift.date).slice(0, 10)} • ${shift.startTime}–${shift.endTime} • ${shift.position}`
                          : 'Shift'}
                      </div>
                      {swapHasOffered(s) && offered ? (
                        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                          Target’s shift (trade): {String(offered.date).slice(0, 10)} • {offered.startTime}–{offered.endTime} • {offered.position}
                        </div>
                      ) : null}
                      <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
                        {requester ? `${requester.firstName} ${requester.lastName}` : 'Requester'}
                        {target ? ` → ${target.firstName} ${target.lastName}` : ''}
                        {tab === 'pending' ? ` • target accepted` : ''}
                      </div>
                      {s.requesterNote ? <div style={{ marginTop: 6, fontSize: 13 }}>{s.requesterNote}</div> : null}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      {s.status}
                    </div>
                  </div>

                  {tab === 'pending' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      {isManager ? (
                        <>
                          <button
                            type="button"
                            className="btnGhost"
                            disabled={isSaving}
                            onClick={() => act(async () => void (await apiRejectSwap(s._id)))}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="btnPrimary"
                            disabled={isSaving || !canApprove}
                            onClick={() => act(async () => void (await apiApproveSwap(s._id)))}
                          >
                            {canApprove ? 'Approve' : 'Waiting acceptance'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btnGhost"
                          disabled={isSaving}
                          onClick={() => act(async () => void (await apiCancelSwap(s._id)))}
                        >
                          Cancel
                        </button>
                      )}
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

