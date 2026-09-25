import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  TrendingDown,
  Clock,
  Layers
} from 'lucide-react';
import { compareReadability } from '../services/readabilityService';

export default function AnalysisDashboard({ analysis }) {
  if (!analysis) return null;

  const {
    overallRiskScore,
    riskCategory,
    riskBadgeColor,
    criticalCount,
    cautionCount,
    fairCount,
    totalClauses,
    overallReadabilityOriginal,
    overallReadabilityPlain,
  } = analysis;

  const readabilityDelta = compareReadability(overallReadabilityOriginal, overallReadabilityPlain);

  const getScoreColor = (score) => {
    if (score >= 65) return 'var(--status-critical)';
    if (score >= 35) return 'var(--status-caution)';
    return 'var(--status-fair)';
  };

  return (
    <div className="card fade-in" style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        alignItems: 'center',
      }}>
        {/* Risk Score Gauge & Health */}
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}>
          {/* Circular Score Visual */}
          <div style={{
            position: 'relative',
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border-color)"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={getScoreColor(overallRiskScore)}
                strokeWidth="3.5"
                strokeDasharray={`${overallRiskScore}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: 'absolute',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', lineHeight: 1 }}>
                {overallRiskScore}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                / 100
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Overall Risk Profile
            </div>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: getScoreColor(overallRiskScore),
              marginTop: '4px',
            }}>
              {riskCategory}
            </div>
            <p style={{ fontSize: '0.785rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              {criticalCount > 0
                ? `${criticalCount} asymmetric or predatory clauses require attention.`
                : 'Balanced baseline with standard legal covenants.'}
            </p>
          </div>
        </div>

        {/* Clause Risk Breakdown Counters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}>
          <div style={{
            background: 'var(--status-critical-bg)',
            border: '1px solid var(--status-critical-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-critical)' }}>
              {criticalCount}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-critical)', marginTop: '2px' }}>
              Critical Traps
            </div>
          </div>

          <div style={{
            background: 'var(--status-caution-bg)',
            border: '1px solid var(--status-caution-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-caution)' }}>
              {cautionCount}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-caution)', marginTop: '2px' }}>
              Caution Clauses
            </div>
          </div>

          <div style={{
            background: 'var(--status-fair-bg)',
            border: '1px solid var(--status-fair-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-fair)' }}>
              {fairCount}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-fair)', marginTop: '2px' }}>
              Fair / Standard
            </div>
          </div>
        </div>

        {/* Readability & Plain English Transformation */}
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '18px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
              <BookOpen size={16} color="var(--brand-primary)" />
              <span>Readability Transformation</span>
            </div>
            <span className="badge badge-fair" style={{ fontSize: '0.7rem' }}>
              <TrendingDown size={12} /> {readabilityDelta.percentageSimpler}% Simpler
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Original Legalese</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--status-caution)' }}>
                Grade {overallReadabilityOriginal.fleschKincaidGrade}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {overallReadabilityOriginal.gradeLabel}
              </div>
            </div>

            <ArrowRight size={18} color="var(--brand-primary)" />

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ClauseGuard Plain English</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--status-fair)' }}>
                Grade {overallReadabilityPlain.fleschKincaidGrade}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {overallReadabilityPlain.gradeLabel}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> {overallReadabilityOriginal.estimatedReadTimeMinutes} min read
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={13} /> {totalClauses} clauses segmented
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
