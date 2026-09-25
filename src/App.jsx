import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DisclaimerBanner from './components/DisclaimerBanner';
import DocumentUpload from './components/DocumentUpload';
import DocumentDashboard from './components/DocumentDashboard';
import PlainLanguageExplainer from './components/PlainLanguageExplainer';
import AskDocument from './components/AskDocument';
import ContractComparison from './components/ContractComparison';
import LawyerPrepView from './components/LawyerPrepView';
import ApiKeyModal from './components/ApiKeyModal';
import ErrorBoundary from './components/ErrorBoundary';

import { SYNTHETIC_DOCUMENTS } from './data/syntheticContracts';
import { processDocument } from './services/documentParser';
import { sanitizePII } from './services/piiSanitizer';

import {
  LayoutDashboard,
  FileText,
  Bot,
  GitCompare,
  Briefcase,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Initialize with synthetic residential lease
  const defaultDoc = SYNTHETIC_DOCUMENTS[0];
  const [selectedPresetId, setSelectedPresetId] = useState(defaultDoc.id);
  const [documentTitle, setDocumentTitle] = useState(defaultDoc.title);
  const [documentText, setDocumentText] = useState(defaultDoc.text);
  const [documentMetadata, setDocumentMetadata] = useState({
    filename: 'Residential_Lease_Agreement.txt',
    documentType: 'TXT (Demo Contract)',
    characterCount: defaultDoc.text.length,
    wordCount: defaultDoc.text.split(/\s+/).filter(Boolean).length,
    estimatedPages: 2,
    isDemo: true,
  });

  const [piiShieldEnabled, setPiiShieldEnabled] = useState(true);

  // Active Tab: 'dashboard' | 'simplify' | 'ask' | 'compare' | 'lawyer'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Processed Document Model (Key Facts, Obligations, Deadlines, Clauses, Review Areas)
  const [documentModel, setDocumentModel] = useState(() =>
    processDocument(defaultDoc.text, {
      filename: 'Residential_Lease_Agreement.txt',
      documentType: 'TXT (Demo Contract)',
      estimatedPages: 2,
    })
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

  // Document analysis handler
  const handleAnalyze = (textOverride, titleOverride) => {
    setIsAnalyzing(true);
    setStatusAnnouncement('ClauseGuard is parsing document clauses, obligations, and review areas...');

    const targetText = typeof textOverride === 'string' ? textOverride : documentText;
    const targetTitle = typeof titleOverride === 'string' ? titleOverride : (documentTitle || 'Legal Agreement Analysis');

    setTimeout(() => {
      let textToProcess = targetText;
      if (piiShieldEnabled) {
        const { sanitizedText } = sanitizePII(targetText);
        textToProcess = sanitizedText;
      }

      const model = processDocument(textToProcess, {
        filename: documentMetadata?.filename || `${targetTitle}.txt`,
        documentType: documentMetadata?.documentType || 'Legal Document',
        estimatedPages: Math.max(1, Math.ceil(textToProcess.split(/\s+/).filter(Boolean).length / 400)),
      });

      setDocumentModel(model);
      setIsAnalyzing(false);
      setStatusAnnouncement(`Analysis complete for ${targetTitle}. ${model.totalClauses} clauses analyzed.`);
    }, 350);
  };

  const handleSelectClauseForExplain = (clause) => {
    setActiveTab('simplify');
  };

  return (
    <ErrorBoundary>
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main legal content
      </a>

      {/* Screen Reader ARIA Live Region */}
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
          {/* Step 1: Document Upload & Input */}
          <DocumentUpload
            documentText={documentText}
            setDocumentText={setDocumentText}
            documentMetadata={documentMetadata}
            setDocumentMetadata={setDocumentMetadata}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            piiShieldEnabled={piiShieldEnabled}
            setPiiShieldEnabled={setPiiShieldEnabled}
            selectedPresetId={selectedPresetId}
            setSelectedPresetId={setSelectedPresetId}
            setDocumentTitle={setDocumentTitle}
            onSwitchToCompare={() => setActiveTab('compare')}
          />

          {/* Navigation Tabs for ClauseGuard Workflows */}
          <div className="nav-tabs" role="tablist" aria-label="ClauseGuard Core Workflows">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'dashboard'}
              id="tab-dashboard"
              aria-controls="panel-dashboard"
            >
              <LayoutDashboard size={16} />
              <span>Overview & Dashboard</span>
              {documentModel && (
                <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  {documentModel.totalClauses} Clauses
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('simplify')}
              className={`nav-tab-btn ${activeTab === 'simplify' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'simplify'}
              id="tab-simplify"
              aria-controls="panel-simplify"
            >
              <FileText size={16} />
              <span>Plain-Language Explainer</span>
              {documentModel?.reviewAreaCount > 0 && (
                <span className="badge badge-caution" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  {documentModel.reviewAreaCount} Review Areas
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ask')}
              className={`nav-tab-btn ${activeTab === 'ask' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'ask'}
              id="tab-ask"
              aria-controls="panel-ask"
            >
              <Bot size={16} />
              <span>Ask the Document</span>
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
              <span>Compare Two Documents</span>
            </button>

            <button
              onClick={() => setActiveTab('lawyer')}
              className={`nav-tab-btn ${activeTab === 'lawyer' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'lawyer'}
              id="tab-lawyer"
              aria-controls="panel-lawyer"
            >
              <Briefcase size={16} />
              <span>Prepare for Lawyer</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'dashboard' && (
              <DocumentDashboard
                documentModel={documentModel}
                onSelectClauseForExplain={handleSelectClauseForExplain}
              />
            )}

            {activeTab === 'simplify' && (
              <PlainLanguageExplainer clauses={documentModel?.clauses || []} />
            )}

            {activeTab === 'ask' && (
              <AskDocument documentModel={documentModel} />
            )}

            {activeTab === 'compare' && (
              <ContractComparison defaultDocText={documentText} />
            )}

            {activeTab === 'lawyer' && (
              <LawyerPrepView documentModel={documentModel} />
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
              <strong>ClauseGuard</strong> — Understand your document. Spot what matters. Prepare for the next step.
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>Single-branch submission</span>
              <span>•</span>
              <span>Zero Mock Tests</span>
              <span>•</span>
              <span>Verified Live Gov API</span>
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
