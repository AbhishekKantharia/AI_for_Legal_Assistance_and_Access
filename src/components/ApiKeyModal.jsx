import React from 'react';
import { Cpu, ShieldCheck, X } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-content fade-in" role="dialog" aria-modal="true" aria-labelledby="model-settings-title" onClick={(event) => event.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 id="model-settings-title" style={{ fontSize: '1.2rem', margin: 0 }}>Model settings</h3>
          <button type="button" onClick={onClose} aria-label="Close model settings" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
          ClauseGuard uses its local grounded engine by default. A deployment can configure a trusted same-origin model proxy with <code>VITE_AI_PROXY_URL</code>; provider credentials should stay on that server.
        </p>
        <div style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '18px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
          <strong><Cpu size={14} /> Local-first processing</strong><br />No API key is stored in the browser by this application.
        </div>
        <button type="button" onClick={onClose} className="btn btn-primary btn-sm"><ShieldCheck size={14} /> Continue with local engine</button>
      </div>
    </div>
  );
}
