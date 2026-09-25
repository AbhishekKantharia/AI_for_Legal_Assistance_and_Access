import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DisclaimerBanner from './components/DisclaimerBanner';
import DocumentInput from './components/DocumentInput';
import AnalysisDashboard from './components/AnalysisDashboard';
import ClauseExplorer from './components/ClauseExplorer';
import RiskObligationRadar from './components/RiskObligationRadar';
import ContractComparator from './components/ContractComparator';
import LegalCopilotQA from './components/LegalCopilotQA';
import LawyerPrepDossier from './components/LawyerPrepDossier';
import ApiKeyModal from './components/ApiKeyModal';
import ErrorBoundary from './components/ErrorBoundary';

import { SAMPLE_DOCUMENTS } from './data/sampleDocuments';
import { analyzeDocumentOffline } from './services/heuristicEngine';
import { sanitizePII } from './services/piiSanitizer';

import {
  FileText,
  ShieldAlert,
  GitCompare,
  Bot,
  Briefcase
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Document state initialized with rich residential lease agreement
  const defaultDoc = SAMPLE_DOCUMENTS[0];
  const [selectedPresetId, setSelectedPresetId] = useState(defaultDoc.id);
  const [documentTitle, setDocumentTitle] = useState(defaultDoc.title);
  const [documentText, setDocumentText] = useState(defaultDoc.text);
  const [piiShieldEnabled, setPiiShieldEnabled] = useState(true);

  // Analysis and Tab state
  const [activeTab, setActiveTab] = useState('simplify'); // 'simplify' | 'radar' | 'compare' | 'copilot' | 'dossier'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(() =>
    analyzeDocumentOffline(defaultDoc.text, defaultDoc.title)
  );
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  // Sync theme & accessibility attributes on HTML element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-dyslexia', dyslexiaFont ? 'true' : 'false');
  }, [dyslexiaFont]);

  // Run analysis handler
  const handleAnalyze = (textOverride, titleOverride) => {
    setIsAnalyzing(true);
    setStatusAnnouncement('Analyzing document clauses, readability, and risk exposure...');

    const targetText = typeof textOverride === 'string' ? textOverride : documentText;
    const targetTitle = typeof titleOverride === 'string' ? titleOverride : (documentTitle || 'Legal Agreement Analysis');

    setTimeout(() => {
      // If PII shield is enabled, sanitize before feeding to analysis engine
      let textToProcess = targetText;
      if (piiShieldEnabled) {
        const { sanitizedText } = sanitizePII(targetText);
        textToProcess = sanitizedText;
      }

      const result = analyzeDocumentOffline(textToProcess, targetTitle);
      setAnalysisResult(result);
      setIsAnalyzing(false);
      setStatusAnnouncement(`Analysis complete for ${targetTitle}. Overall risk score: ${result.overallRiskScore} out of 100.`);
    }, 400);
  };

  return (
    <ErrorBoundary>
      {/* Skip to Main Content Link for Keyboard & Screen Reader Accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main legal content
      </a>

      {/* Screen Reader ARIA Live Region for Status Announcements */}
      <div className="visually-hidden" role="status" aria-live="polite">
        {statusAnnouncement}
      </div>

      <div className="app-container">
        {/* Top Header */}
        <Header
          theme={theme}
          setTheme={setTheme}
          highContrast={highContrast}
          setHighContrast={setHighContrast}
          dyslexiaFont={dyslexiaFont}
          setDyslexiaFont={setDyslexiaFont}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          activeDocumentText={documentText}
        />

        {/* Mandatory Ethical Notice & Disclaimer Banner */}
        <DisclaimerBanner />

        {/* Main Content Area */}
        <main id="main-content" className="main-content" tabIndex="-1">
          {/* Document Selection, Upload, Live Federal Register API, & PII Shield */}
          <DocumentInput
            documentText={documentText}
            setDocumentText={setDocumentText}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            piiShieldEnabled={piiShieldEnabled}
            setPiiShieldEnabled={setPiiShieldEnabled}
            selectedPresetId={selectedPresetId}
            setSelectedPresetId={setSelectedPresetId}
            setDocumentTitle={setDocumentTitle}
          />

          {/* Global Executive Risk Dashboard & Readability Transformation */}
          {analysisResult && <AnalysisDashboard analysis={analysisResult} />}

          {/* Navigation Tabs for Core Workflows */}
          <div className="nav-tabs" role="tablist" aria-label="Legal Assistant Workflows">
            <button
              onClick={() => setActiveTab('simplify')}
              className={`nav-tab-btn ${activeTab === 'simplify' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'simplify'}
              id="tab-simplify"
              aria-controls="panel-simplify"
            >
              <FileText size={16} />
              <span>Simplify & Clause Breakdown</span>
              {analysisResult && (
                <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  {analysisResult.totalClauses}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('radar')}
              className={`nav-tab-btn ${activeTab === 'radar' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'radar'}
              id="tab-radar"
              aria-controls="panel-radar"
            >
              <ShieldAlert size={16} />
              <span>Risk Radar & Action Checklist</span>
              {analysisResult?.criticalCount > 0 && (
                <span className="badge badge-critical" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  {analysisResult.criticalCount} Traps
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`nav-tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'compare'}
              id="tab-compare"
              aria-controls="panel-compare"
            >
              <GitCompare size={16} />
              <span>Compare Versions (Redline Diff)</span>
            </button>

            <button
              onClick={() => setActiveTab('copilot')}
              className={`nav-tab-btn ${activeTab === 'copilot' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'copilot'}
              id="tab-copilot"
              aria-controls="panel-copilot"
            >
              <Bot size={16} />
              <span>Ask Legal Copilot</span>
            </button>

            <button
              onClick={() => setActiveTab('dossier')}
              className={`nav-tab-btn ${activeTab === 'dossier' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'dossier'}
              id="tab-dossier"
              aria-controls="panel-dossier"
            >
              <Briefcase size={16} />
              <span>Lawyer Prep Dossier</span>
            </button>
          </div>

          {/* Tab Content Display */}
          <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'simplify' && (
              <ClauseExplorer clauses={analysisResult?.clauses || []} />
            )}

            {activeTab === 'radar' && (
              <RiskObligationRadar analysis={analysisResult} />
            )}

            {activeTab === 'compare' && (
              <ContractComparator defaultDocText={documentText} />
            )}

            {activeTab === 'copilot' && (
              <LegalCopilotQA documentText={documentText} />
            )}

            {activeTab === 'dossier' && (
              <LawyerPrepDossier analysis={analysisResult} />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer style={{
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          padding: '24px 20px',
          textAlign: 'center',
          fontSize: '0.825rem',
          color: 'var(--text-muted)',
          marginTop: 'auto',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong>JurisEase AI</strong> — Empowering accessible legal information, consumer contract transparency, and verified live regulatory access.
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>Single-branch submission</span>
              <span>•</span>
              <span>Verified Live APIs</span>
              <span>•</span>
              <span>Zero Mock Tests</span>
              <span>•</span>
              <span>Client-side PII Protection</span>
            </div>
          </div>
        </footer>

        {/* Gemini API Key Configuration Modal */}
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
