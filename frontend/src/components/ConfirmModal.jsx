import React from 'react';
import { AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  text = 'This action cannot be undone.',
  icon = null,
  okLabel = 'Confirm',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '36px 28px 24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(240, 124, 108, 0.15)',
              color: 'var(--coral)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            {icon || <AlertTriangle size={28} />}
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-100)', marginBottom: '8px' }}>
            {title}
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-300)', lineHeight: '1.5' }}>
            {text}
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            <Trash2 size={15} />
            <span>{okLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
