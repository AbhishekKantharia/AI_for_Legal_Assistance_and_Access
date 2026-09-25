import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  Calendar,
  DollarSign,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  TrendingUp,
  FileCheck
} from 'lucide-react';

export default function RiskObligationRadar({ analysis }) {
  if (!analysis) return null;

  const [checklist, setChecklist] = useState(analysis.actionableChecklist || []);
  const [newTaskText, setNewTaskText] = useState('');

  const handleToggleTask = (id) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask = {
      id: `custom-chk-${Date.now()}`,
      task: newTaskText.trim(),
      priority: 'MEDIUM',
      completed: false,
    };
    setChecklist([newTask, ...checklist]);
    setNewTaskText('');
  };

  const handleDeleteTask = (id) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  // Aggregate all extracted key obligations across clauses
  const allObligations = [];
  analysis.clauses?.forEach(c => {
    if (c.keyObligations && c.keyObligations.length > 0) {
      c.keyObligations.forEach(ob => {
        allObligations.push({
          ...ob,
          clauseHeading: c.heading,
        });
      });
    }
  });

  return (
    <div className="fade-in">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
      }}>
        {/* Left Column: Interactive Actionable Pre-Signing Checklist */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <FileCheck size={20} color="var(--brand-primary)" />
              Actionable Pre-Signing Checklist
            </h3>
            <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
              {completedCount} of {checklist.length} Done ({progressPercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: '6px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
            marginBottom: '20px',
          }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: progressPercent === 100 ? 'var(--status-fair)' : 'var(--brand-primary)',
              transition: 'width 0.3s ease',
            }} />
          </div>

          {/* Add custom action item form */}
          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <input
              type="text"
              placeholder="Add personal action item or attorney reminder..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!newTaskText.trim()}>
              <Plus size={16} /> Add
            </button>
          </form>

          {/* Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleTask(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 14px',
                  background: item.completed ? 'var(--status-fair-bg)' : 'var(--bg-secondary)',
                  border: `1px solid ${item.completed ? 'var(--status-fair-border)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  {item.completed ? (
                    <CheckSquare size={18} color="var(--status-fair)" style={{ flexShrink: 0 }} />
                  ) : (
                    <Square size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontSize: '0.875rem',
                    color: item.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: item.completed ? 'line-through' : 'none',
                    lineHeight: 1.4,
                  }}>
                    {item.task}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className={`badge ${item.priority === 'HIGH' ? 'badge-critical' : 'badge-caution'}`}
                    style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                  >
                    {item.priority}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(item.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Extracted Deadlines & Financial Commitments */}
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Calendar size={20} color="var(--brand-primary)" />
              Extracted Deadlines & Financial Exposures
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Hard figures, notice windows, and penalty amounts auto-extracted from the document text.
            </p>
          </div>

          {allObligations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
              No explicit dollar figures or timeframes found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allObligations.slice(0, 8).map((ob, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: ob.type === 'FINANCIAL' ? 'var(--status-caution-bg)' : 'var(--status-info-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {ob.type === 'FINANCIAL' ? (
                        <DollarSign size={16} color="var(--status-caution)" />
                      ) : (
                        <Calendar size={16} color="var(--status-info)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ob.label}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        Source: {ob.clauseHeading}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${ob.urgency === 'high' ? 'badge-critical' : 'badge-caution'}`} style={{ fontSize: '0.65rem' }}>
                    {ob.type}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Top Asymmetrical Risks Summary */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>
              Identified Legal Traps Summary
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analysis.redFlags?.slice(0, 3).map((rf, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    background: 'var(--status-critical-bg)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--status-critical-border)',
                  }}
                >
                  <strong>{rf.heading}:</strong> {rf.trap}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
