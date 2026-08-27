import React from 'react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => {
        let Icon = Sparkles;
        let className = 'toast-info';
        let iconColor = 'var(--primary-yellow)';

        if (t.type === 'success') {
          Icon = CheckCircle2;
          className = 'toast-success';
          iconColor = 'var(--emerald)';
        } else if (t.type === 'error') {
          Icon = AlertCircle;
          className = 'toast-error';
          iconColor = 'var(--coral)';
        }

        return (
          <div key={t.id} className={`toast ${className}`}>
            <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '13px', lineHeight: 1.4 }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
