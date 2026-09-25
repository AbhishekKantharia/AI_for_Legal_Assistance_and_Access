import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export default function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div style={{
      background: 'rgba(245, 158, 11, 0.08)',
      borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      fontSize: '0.85rem',
      color: '#fbbf24',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '1300px' }}>
        <ShieldAlert size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>Ethical AI & Legal Responsibility Notice:</strong> JurisEase AI provides educational document simplification, risk signals, and consultation preparation. It is <em>not a law firm</em> and does not offer binding legal advice. Always review critical contracts with a licensed attorney in your jurisdiction before executing.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fbbf24',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.8,
        }}
        title="Dismiss notice"
        aria-label="Dismiss notice"
      >
        <X size={16} />
      </button>
    </div>
  );
}
