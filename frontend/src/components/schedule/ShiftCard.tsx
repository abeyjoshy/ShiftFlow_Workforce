import React from 'react';
import { useDraggable } from '@dnd-kit/core';

import type { Shift } from '../../types';

export function ShiftCard({
  shift,
  onEdit,
  showActualTimes = true,
}: {
  shift: Shift;
  /** Opens edit modal — use click on card or Edit button (drag uses separate handle only). */
  onEdit?: () => void;
  /** Show clock-in/out pills (actualStartTime/actualEndTime). */
  showActualTimes?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift._id,
    data: { shiftId: shift._id },
  });

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 12,
    background: 'var(--brand-muted)',
    borderLeft: '3px solid var(--brand)',
    border: shift.status === 'draft' ? '1px dashed var(--border)' : '1px solid var(--border)',
    opacity: isDragging ? 0.75 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag only from this handle — rest of card is free for click-to-edit */}
      <button
        type="button"
        aria-label="Drag shift"
        title="Drag to move"
        {...listeners}
        {...attributes}
        style={{
          flexShrink: 0,
          width: 22,
          minHeight: 36,
          padding: 0,
          border: 'none',
          borderRadius: 6,
          background: 'rgba(0,0,0,0.06)',
          cursor: 'grab',
          color: 'var(--muted)',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ⋮⋮
      </button>

      <button
        type="button"
        onClick={() => onEdit?.()}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              {shift.startTime}–{shift.endTime}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{shift.position}</div>
            {showActualTimes && (shift.actualStartTime || shift.actualEndTime) ? (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {shift.actualStartTime ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: '#fff',
                    }}
                  >
                    In {shift.actualStartTime}
                  </span>
                ) : null}
                {shift.actualEndTime ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: '#fff',
                    }}
                  >
                    Out {shift.actualEndTime}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--brand)',
              textTransform: 'uppercase',
            }}
          >
            Edit
          </span>
        </div>
      </button>
    </div>
  );
}
