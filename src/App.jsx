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

import { SAMPLE_DOCUMENTS } from './data/sampleDocuments';
import { analyzeDocumentOffline } from './services/heuristicEngine';
import { sanitizePII } from './services/piiSanitizer';

import {
  FileText,
  ShieldAlert,
  GitCompare,
  Bot,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Document state initialized with rich residential lease agreement
  const defaultDoc = SAMPLE_DOCUMENTS[0];
  const [selectedPresetId, setSelectedPresetId] = useState(defaultDoc.id);
  const [documentText, setDocumentText] = useState(defaultDoc.text);
  const [piiShieldEnabled, setPiiShieldEnabled] = useState(true);

  // Analysis and Tab state
  const [activeTab, setActiveTab] = useState('simplify'); // 'simplify' | 'radar' | 'compare' | 'copilot' | 'dossier'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(() =>
    analyzeDocumentOffline(defaultDoc.text, defaultDoc.title)
  );

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
  const handleAnalyze = () => {
    setIsAnalyzing(true);

    setTimeout(() => {
      // If PII shield is enabled, sanitize before feeding to analysis engine
      let textToProcess = documentText;
      if (piiShieldEnabled) {
        const { sanitizedText } = sanitizePII(documentText);
        textToProcess = sanitizedText;
      }

      const activeDocMeta = SAMPLE_DOCUMENTS.find(d => d.id === selectedPresetId);
      const title = activeDocMeta ? activeDocMeta.title : 'Custom Agreement Review';

      const result = analyzeDocumentOffline(textToProcess, title);
      setAnalysisResult(result);
      setIsAnalyzing(false);
    }, 400);
  };

  return (
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
      <main className="main-content">
        {/* Document Selection, Upload, & PII Shield */}
        <DocumentInput
          documentText={documentText}
          setDocumentText={setDocumentText}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          piiShieldEnabled={piiShieldEnabled}
          setPiiShieldEnabled={setPiiShieldEnabled}
          selectedPresetId={selectedPresetId}
          setSelectedPresetId={setSelectedPresetId}
        />

        {/* Global Executive Risk Dashboard & Readability Transformation */}
        {analysisResult && <AnalysisDashboard analysis={analysisResult} />}

        {/* Navigation Tabs for Core Workflows */}
        <div className="nav-tabs" role="tablist">
          <button
            onClick={() => setActiveTab('simplify')}
            className={`nav-tab-btn ${activeTab === 'simplify' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'simplify'}
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
          >
            <GitCompare size={16} />
            <span>Compare Versions (Redline Diff)</span>
          </button>

          <button
            onClick={() => setActiveTab('copilot')}
            className={`nav-tab-btn ${activeTab === 'copilot' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'copilot'}
          >
            <Bot size={16} />
            <span>Ask Legal Copilot</span>
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className={`nav-tab-btn ${activeTab === 'dossier' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'dossier'}
          >
            <Briefcase size={16} />
            <span>Lawyer Prep Dossier</span>
          </button>
        </div>

        {/* Tab Content Display */}
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
            <strong>JurisEase AI</strong> — Empowering accessible legal information and consumer contract transparency.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Single-branch submission</span>
            <span>•</span>
            <span>Repository size &lt; 10 MB</span>
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
  );
}
