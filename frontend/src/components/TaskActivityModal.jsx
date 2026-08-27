import React from 'react';
import { X, Clock, User, CheckCircle2, RotateCcw, AlertCircle, Sparkles, ArrowRight, History } from 'lucide-react';

export default function TaskActivityModal({ isOpen, task, onClose }) {
  if (!isOpen || !task) return null;

  const logs = [...(task.activity_log || [])].reverse();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 210, 31, 0.12)',
                color: 'var(--primary-yellow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <History size={18} />
            </div>
            <div>
              <h2 className="modal-title">Task Activity &amp; Audit Trail</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span style={{ color: 'var(--primary-yellow)', fontWeight: 700 }}>{task.id}</span>: {task.title}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh' }}>
          {logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-state-icon" style={{ width: '48px', height: '48px' }}>
                <History size={22} />
              </div>
              <div className="empty-state-title" style={{ fontSize: '15px' }}>No Activity Records</div>
              <p className="empty-state-desc" style={{ fontSize: '12.5px' }}>No status changes or events recorded yet for this task.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
              {logs.map((log, idx) => {
                const isCreated = log.action === 'Created';
                const isReopened = log.action === 'Reopened';
                const isCompleted = log.new_status === 'Completed';

                const iconBg = isCompleted
                  ? 'rgba(52, 211, 153, 0.15)'
                  : isReopened
                  ? 'rgba(240, 124, 108, 0.15)'
                  : isCreated
                  ? 'rgba(255, 210, 31, 0.15)'
                  : 'rgba(96, 165, 250, 0.15)';

                const iconColor = isCompleted
                  ? 'var(--emerald)'
                  : isReopened
                  ? 'var(--coral)'
                  : isCreated
                  ? 'var(--primary-yellow)'
                  : 'var(--sky)';

                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: iconBg,
                        color: iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={16} />
                      ) : isReopened ? (
                        <RotateCcw size={16} />
                      ) : isCreated ? (
                        <Sparkles size={16} />
                      ) : (
                        <Clock size={16} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-100)' }}>
                          <User size={13} color="var(--primary-yellow)" />
                          {log.actor || 'Team Member'}
                          <span
                            className={`badge ${
                              isCompleted
                                ? 'badge-completed'
                                : isReopened
                                ? 'badge-priority-high'
                                : isCreated
                                ? 'badge-pending'
                                : 'badge-in-progress'
                            }`}
                            style={{ marginLeft: '4px', fontSize: '10.5px', padding: '1px 6px' }}
                          >
                            {log.action}
                          </span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {log.timestamp}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--text-200)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {log.previous_status ? (
                          <>
                            <span style={{ color: 'var(--text-muted)' }}>{log.previous_status}</span>
                            <ArrowRight size={12} color="var(--text-muted)" />
                            <span style={{ color: 'var(--text-100)', fontWeight: 700 }}>{log.new_status}</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--primary-yellow)', fontWeight: 700 }}>{log.new_status || 'Task Created'}</span>
                        )}
                      </div>

                      {log.note && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-pure)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '12px',
                            color: 'var(--text-300)',
                            fontStyle: 'italic',
                          }}
                        >
                          "{log.note}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
