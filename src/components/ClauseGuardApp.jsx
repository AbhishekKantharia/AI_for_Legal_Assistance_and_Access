import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  GitCompare,
  Info,
  ListChecks,
  Lock,
  Menu,
  MessageCircleQuestion,
  PanelTop,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { DEMO_DOCUMENTS, getDemoDocument } from '../data/demoDocuments';
import { parseDocumentFile, processDocument, validateDocumentFile } from '../services/documentParser';
import { askDocument } from '../services/documentAssistant';
import { compareDocumentsStructured } from '../services/comparisonEngine';
import { buildLawyerPrepPackage } from '../services/lawyerPrepService';
import { getAiStatus } from '../services/aiService';
import { sanitizePII } from '../services/piiSanitizer';
import { LEGAL_DISCLAIMER_TEXT, LEGAL_DISCLAIMER_SHORT } from '../services/legalSafety';
import ErrorBoundary from './ErrorBoundary';

const INITIAL_DOCUMENT = DEMO_DOCUMENTS[0];
const TABS = [
  { id: 'overview', label: 'Overview', icon: PanelTop },
  { id: 'plain', label: 'Plain language', icon: FileText },
  { id: 'ask', label: 'Ask the document', icon: MessageCircleQuestion },
  { id: 'compare', label: 'Compare drafts', icon: GitCompare },
  { id: 'lawyer', label: 'Lawyer prep', icon: Briefcase },
];
const SUGGESTED_QUESTIONS = [
  'What is the main subject of this agreement?',
  'What payment terms and dates are stated?',
  'When can the agreement end or renew?',
  'What should I review with a qualified professional?',
];

function makeInitialDocument() {
  return {
    title: INITIAL_DOCUMENT.title,
    filename: INITIAL_DOCUMENT.filename,
    text: INITIAL_DOCUMENT.text,
    source: 'sample',
    metadata: {
      filename: INITIAL_DOCUMENT.filename,
      documentType: 'TXT',
      isDemo: true,
    },
  };
}

function pageLabel(item) {
  const page = item?.sourceLocation?.page ?? item?.page;
  return Number.isInteger(page) && page > 0 ? `Page ${page}` : 'Page not available';
}

function sourceLabelFor(item) {
  return `${item?.heading || item?.section || 'Document source'} · ${pageLabel(item)}`;
}

function signalClass(signal) {
  if (signal === 'attention') return 'signal-attention';
  if (signal === 'review') return 'signal-review';
  if (signal === 'ambiguous') return 'signal-ambiguous';
  return 'signal-standard';
}

function valueOrFallback(value, fallback = 'Not identified in the document') {
  return value || fallback;
}

function downloadMarkdown(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SignalBadge({ signal }) {
  return <span className={`signal-badge ${signalClass(signal)}`}>{signal?.badge || 'Important clause'}</span>;
}

function SourceCitation({ source }) {
  return (
    <div className="source-citation">
      <div className="source-heading">
        <FileSearch size={14} aria-hidden="true" />
        <strong>{source?.section || 'Document source'}</strong>
        <span>{source?.page ? `Page ${source.page}` : 'Page not available'}</span>
      </div>
      {source?.excerpt && <blockquote>{source.excerpt}</blockquote>}
    </div>
  );
}

function FactCard({ label, value }) {
  return (
    <div className="fact-card">
      <span className="fact-label">{label}</span>
      <strong>{valueOrFallback(value)}</strong>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function OverviewPanel({ model, onExplain, onAsk }) {
  const facts = model.keyFacts || {};
  return (
    <div className="panel-stack">
      <SectionHeading
        eyebrow="Document-grounded overview"
        title="Start with the terms that shape the agreement"
        description="ClauseGuard organizes explicit wording into a readable first pass. Review signals are prompts for attention, not legal conclusions."
      />
      <section className="summary-panel">
        <div className="summary-mark"><Sparkles size={22} aria-hidden="true" /></div>
        <div>
          <span className="eyebrow">Executive summary</span>
          <p>{model.executiveSummary}</p>
        </div>
        <div className="summary-stats">
          <div><strong>{model.totalClauses}</strong><span>sections</span></div>
          <div><strong>{model.reviewAreaCount}</strong><span>review areas</span></div>
          <div><strong>{model.metadata?.pageCount || '—'}</strong><span>{model.metadata?.pageCount ? 'marked pages' : 'page markers'}</span></div>
        </div>
      </section>
      <section className="card">
        <div className="card-heading-row">
          <div>
            <span className="eyebrow">Key facts</span>
            <h3>What the document explicitly identifies</h3>
          </div>
          <Info size={19} className="muted-icon" aria-hidden="true" />
        </div>
        <div className="fact-grid">
          <FactCard label="Agreement type" value={facts.agreementType} />
          <FactCard label="Parties" value={facts.parties?.join(' · ')} />
          <FactCard label="Effective date" value={facts.effectiveDate} />
          <FactCard label="Term" value={facts.term} />
          <FactCard label="Payment wording" value={facts.paymentTerms} />
          <FactCard label="Termination notice" value={facts.terminationNotice} />
          <FactCard label="Renewal wording" value={facts.renewal} />
          <FactCard label="Governing law" value={facts.governingLaw} />
        </div>
      </section>
      <div className="two-column">
        <section className="card">
          <div className="card-heading-row">
            <div>
              <span className="eyebrow">Review areas</span>
              <h3>Worth a closer read</h3>
            </div>
            <AlertTriangle size={19} className="warning-icon" aria-hidden="true" />
          </div>
          {model.reviewAreas?.length ? (
            <div className="review-list">
              {model.reviewAreas.slice(0, 6).map((area) => (
                <article className="review-item" key={area.id}>
                  <div className="review-item-top">
                    <strong>{area.heading}</strong>
                    <SignalBadge signal={area.reviewSignal} />
                  </div>
                  <p>{area.whatToCheck}</p>
                  <button className="text-button" type="button" onClick={() => onExplain(area)}>
                    Open plain-language view <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><CheckCircle2 size={20} /><span>No elevated review signals were detected by the deterministic checks.</span></div>
          )}
        </section>
        <section className="card">
          <div className="card-heading-row">
            <div>
              <span className="eyebrow">Obligations</span>
              <h3>Separate the two sides</h3>
            </div>
            <Users size={19} className="muted-icon" aria-hidden="true" />
          </div>
          <div className="obligation-columns">
            <div>
              <h4>Your side <span>{model.obligations?.yourObligations?.length || 0}</span></h4>
              {(model.obligations?.yourObligations || []).slice(0, 4).map((item) => <p className="obligation-item" key={`${item.clauseId}-${item.obligation}`}>{item.obligation}</p>)}
              {!model.obligations?.yourObligations?.length && <p className="muted-copy">No obligations were confidently assigned to this role.</p>}
            </div>
            <div>
              <h4>Other side <span>{model.obligations?.otherPartyObligations?.length || 0}</span></h4>
              {(model.obligations?.otherPartyObligations || []).slice(0, 4).map((item) => <p className="obligation-item" key={`${item.clauseId}-${item.obligation}`}>{item.obligation}</p>)}
              {!model.obligations?.otherPartyObligations?.length && <p className="muted-copy">No other-party obligations were confidently identified.</p>}
            </div>
          </div>
          <button className="secondary-button full-width" type="button" onClick={() => onAsk('What are my obligations under this agreement?')}>Ask about obligations</button>
        </section>
      </div>
      <section className="card">
        <div className="card-heading-row">
          <div>
            <span className="eyebrow">Clause explorer</span>
            <h3>Important sections</h3>
          </div>
          <span className="small-muted">{model.importantClauses?.length || 0} identified</span>
        </div>
        <div className="clause-preview-grid">
          {(model.importantClauses || []).slice(0, 6).map((clause) => (
            <article className="clause-preview" key={clause.id}>
              <div className="clause-preview-top"><strong>{clause.heading}</strong><SignalBadge signal={clause.reviewSignal} /></div>
              <p>{clause.plainEnglish}</p>
              <div className="clause-preview-footer"><span>{sourceLabelFor(clause)}</span><button className="icon-button" type="button" aria-label={`Explain ${clause.heading}`} onClick={() => onExplain(clause)}><Eye size={16} /></button></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlainLanguagePanel({ model, onAsk, selectedClauseId }) {
  const [expandedClause, setExpandedClause] = useState(selectedClauseId || model.clauses?.[0]?.id || '');
  useEffect(() => {
    setExpandedClause(selectedClauseId || model.clauses?.[0]?.id || '');
  }, [model, selectedClauseId]);
  return (
    <div className="panel-stack">
      <SectionHeading
        eyebrow="Plain-language reading"
        title="Understand the clause before you interpret it"
        description="Each view separates the document’s wording, a neutral explanation, and questions to verify. The original excerpt remains available for context."
      />
      <div className="plain-layout">
        <aside className="clause-nav card" aria-label="Document sections">
          <div className="clause-nav-heading"><span>Document sections</span><span>{model.clauses?.length || 0}</span></div>
          {(model.clauses || []).map((clause) => (
            <button className={`clause-nav-item ${expandedClause === clause.id ? 'active' : ''}`} type="button" key={clause.id} onClick={() => setExpandedClause(clause.id)}>
              <span>{clause.heading}</span>
              <span className={`clause-dot ${signalClass(clause.reviewSignal)}`} aria-label={clause.reviewSignal?.badge} />
            </button>
          ))}
        </aside>
        <div className="plain-detail">
          {(model.clauses || []).filter((clause) => clause.id === expandedClause).map((clause) => (
            <article className="card plain-clause" key={clause.id}>
              <div className="card-heading-row">
                <div><span className="eyebrow">{sourceLabelFor(clause)}</span><h3>{clause.heading}</h3></div>
                <SignalBadge signal={clause.reviewSignal} />
              </div>
              <div className="reading-block"><span className="reading-label">In plain English</span><p>{clause.plainEnglish}</p></div>
              <div className="reading-grid">
                <div className="reading-block"><span className="reading-label">Why it matters</span><p>{clause.whyItMatters}</p></div>
                <div className="reading-block check-block"><span className="reading-label">What to check</span><p>{clause.whatToCheck}</p></div>
              </div>
              <details className="source-details">
                <summary>View original wording <ChevronDown size={16} aria-hidden="true" /></summary>
                <p>{clause.originalText}</p>
              </details>
              <button className="secondary-button" type="button" onClick={() => onAsk(`Explain ${clause.heading} in simple words and cite the source.`)}><MessageCircleQuestion size={16} /> Ask a follow-up</button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function AskPanel({ context, question, setQuestion, answer, onAsk, isAsking, onSuggested }) {
  return (
    <div className="panel-stack">
      <SectionHeading
        eyebrow="Grounded document Q&A"
        title="Ask a question and see the source trail"
        description="Answers are generated from retrieved document passages. If the document does not support an answer, ClauseGuard says so instead of filling the gap."
        action={<span className="mode-pill"><Lock size={13} /> Source passages only</span>}
      />
      <div className="ask-layout">
        <section className="card ask-card">
          <form onSubmit={(event) => { event.preventDefault(); onAsk(question); }}>
            <label className="field-label" htmlFor="document-question">Your question</label>
            <textarea id="document-question" className="question-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="For example: What notice is required before renewal?" rows={6} />
            <div className="ask-footer"><span className="small-muted">Context: {context.role || 'role not selected'} · {context.jurisdiction || 'jurisdiction not selected'}</span><button className="primary-button" type="submit" disabled={isAsking || !question.trim()}>{isAsking ? 'Searching document…' : 'Ask grounded question'} <Send size={16} aria-hidden="true" /></button></div>
          </form>
          <div className="suggested-questions"><span className="reading-label">Try a question</span><div className="suggestion-list">{SUGGESTED_QUESTIONS.map((suggestion) => <button type="button" className="suggestion-chip" key={suggestion} onClick={() => { setQuestion(suggestion); onSuggested(suggestion); }}>{suggestion}</button>)}</div></div>
        </section>
        <section className={`card answer-card ${answer ? 'has-answer' : ''}`} aria-live="polite">
          {!answer ? (
            <div className="empty-state answer-empty"><div className="empty-icon"><Bot size={25} /></div><h3>Your grounded answer will appear here</h3><p>Ask about a section, date, payment term, or obligation. ClauseGuard will show the matching source excerpts and confidence.</p></div>
          ) : (
            <>
              <div className="card-heading-row"><div><span className="eyebrow">Response</span><h3>Document-grounded result</h3></div><span className={`confidence-badge confidence-${answer.confidence}`}>{answer.confidence} confidence</span></div>
              <div className="answer-text">{answer.answer}</div>
              {answer.sources?.length > 0 && <div className="answer-sources"><span className="reading-label">Sources used</span>{answer.sources.map((source, index) => <SourceCitation source={source} key={`${source.passageId || source.section}-${index}`} />)}</div>}
              {answer.limitations?.length > 0 && <div className="limitation-box"><Info size={16} /><div><strong>Keep in mind</strong>{answer.limitations.map((limitation) => <p key={limitation}>{limitation}</p>)}</div></div>}
              <p className="inline-disclaimer">{answer.disclaimer || LEGAL_DISCLAIMER_SHORT}</p>
            </>
          )}
        </section>
      </div>
      <div className="grounding-note"><ShieldCheck size={18} /><div><strong>Grounding guardrails</strong><p>ClauseGuard does not decide whether a clause is legal, valid, enforceable, or likely to succeed. A qualified legal professional can assess those questions in context.</p></div></div>
    </div>
  );
}

function ComparisonPanel({ activeDocument, model, compareId, setCompareId, comparison, onCompare, isComparing }) {
  const otherDocument = getDemoDocument(compareId);
  return (
    <div className="panel-stack">
      <SectionHeading
        eyebrow="Neutral draft comparison"
        title="See what changed between two versions"
        description="Comparison labels describe additions, removals, and wording changes. They do not rank the drafts or predict legal effect."
      />
      <section className="card compare-controls">
        <div className="compare-document"><span className="compare-label">Document A · active</span><strong>{activeDocument.title}</strong><span>{sourceLabelFor(model.clauses?.[0])}</span></div>
        <ArrowRight size={20} className="compare-arrow" aria-hidden="true" />
        <div className="compare-document"><label className="compare-label" htmlFor="compare-document">Document B</label><select id="compare-document" value={compareId} onChange={(event) => setCompareId(event.target.value)}>{DEMO_DOCUMENTS.map((document) => <option value={document.id} key={document.id}>{document.title}</option>)}</select><span>{otherDocument?.category}</span></div>
        <button className="primary-button" type="button" onClick={onCompare} disabled={isComparing || !otherDocument}>{isComparing ? 'Comparing…' : 'Compare drafts'} <GitCompare size={16} /></button>
      </section>
      {comparison ? (
        <>
          <div className="comparison-metrics"><div><strong>{comparison.totalAreasCompared}</strong><span>areas compared</span></div><div><strong>{comparison.addedCount}</strong><span>added</span></div><div><strong>{comparison.removedCount}</strong><span>removed</span></div><div><strong>{comparison.modifiedCount}</strong><span>modified</span></div><div className="metric-highlight"><strong>{comparison.importantChangesCount}</strong><span>important shifts</span></div></div>
          <div className="comparison-list">{comparison.structuredRows.map((row) => <article className="card comparison-row" key={row.areaKey}><div className="comparison-row-heading"><div><span className="eyebrow">Comparison area</span><h3>{row.area}</h3></div><span className={`change-badge change-${row.changeStatus.toLowerCase().replaceAll(' ', '-')}`}>{row.changeStatus}</span></div><p className="comparison-significance">{row.reviewSignificance}</p><div className="comparison-columns"><div><span className="compare-label">A · {comparison.titleA}</span>{row.docA ? <SourceCitation source={row.docA} /> : <p className="muted-copy">No matching section identified.</p>}</div><div><span className="compare-label">B · {comparison.titleB}</span>{row.docB ? <SourceCitation source={row.docB} /> : <p className="muted-copy">No matching section identified.</p>}</div></div></article>)}</div>
          <div className="neutral-note"><Scale size={18} /><p>{comparison.limitations?.[0]}</p></div>
        </>
      ) : <div className="card empty-state"><div className="empty-icon"><GitCompare size={25} /></div><h3>Choose a second draft to compare</h3><p>The comparison will preserve source excerpts and show where wording was added, removed, or changed.</p></div>}
    </div>
  );
}

function LawyerPrepPanel({ model, concerns, setConcerns, prep, onGenerate, isPreparing, checkedItems, setCheckedItems, onCopy, onDownload, copied }) {
  return (
    <div className="panel-stack">
      <SectionHeading
        eyebrow="Lawyer consultation preparation"
        title="Turn the document into a focused conversation"
        description="Collect source-linked questions, dates, and a short checklist before speaking with a qualified legal professional. This is preparation material, not legal advice."
      />
      <section className="card prep-builder"><div><span className="eyebrow">Your focus</span><h3>What do you want to discuss?</h3><p className="muted-copy">Optional context helps organize the briefing. Do not include information you do not want copied into the page.</p></div><textarea aria-label="Consultation focus" value={concerns} onChange={(event) => setConcerns(event.target.value)} rows={4} placeholder="For example: I want to understand the renewal and notice language." /><button className="primary-button" type="button" onClick={onGenerate} disabled={isPreparing}><ClipboardCheck size={16} /> {isPreparing ? 'Preparing package…' : 'Generate preparation package'}</button></section>
      {prep ? (
        <>
          <div className="prep-actions"><span className="small-muted">Package includes {prep.questions.length} questions and {prep.checklist.length} checklist items.</span><div><button className="secondary-button" type="button" onClick={onCopy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy Markdown'}</button><button className="secondary-button" type="button" onClick={onDownload}><Download size={16} /> Download .md</button></div></div>
          <div className="two-column prep-columns"><section className="card"><div className="card-heading-row"><div><span className="eyebrow">Questions</span><h3>Bring these to the conversation</h3></div><CircleHelp size={19} className="muted-icon" /></div><ol className="question-list">{prep.questions.map((question, index) => <li key={question}><span>{index + 1}</span><p>{question}</p></li>)}</ol></section><section className="card"><div className="card-heading-row"><div><span className="eyebrow">Checklist</span><h3>Verify before signing</h3></div><ListChecks size={19} className="muted-icon" /></div><div className="checklist">{prep.checklist.map((item) => <label className="check-item" key={item.id}><input type="checkbox" checked={checkedItems.has(item.id)} onChange={() => setCheckedItems((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} /><span><strong>{item.task}</strong><small>{item.source}</small></span></label>)}</div></section></div>
          <section className="card"><div className="card-heading-row"><div><span className="eyebrow">Dates and source trail</span><h3>Bring the relevant pages</h3></div><Clock3 size={19} className="muted-icon" /></div>{(model.datesAndDeadlines || []).length ? <div className="date-list">{model.datesAndDeadlines.map((date) => <div className="date-item" key={`${date.dateString}-${date.sourceSnippet}`}><strong>{date.dateString}</strong><span>{date.category}</span><p>{date.sourceSnippet}</p></div>)}</div> : <p className="muted-copy">No explicit calendar date or fixed time window was identified.</p>}</section>
        </>
      ) : <div className="card empty-state"><div className="empty-icon"><Briefcase size={25} /></div><h3>Build a source-linked briefing</h3><p>Generate neutral questions and a checklist from the terms ClauseGuard actually found in this document.</p></div>}
    </div>
  );
}

export default function ClauseGuardApp() {
  const [activeDocument, setActiveDocument] = useState(makeInitialDocument);
  const [documentModel, setDocumentModel] = useState(() => processDocument(INITIAL_DOCUMENT.text, makeInitialDocument().metadata));
  const [selectedClauseId, setSelectedClauseId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [intakeMode, setIntakeMode] = useState('samples');
  const [draftText, setDraftText] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('Sample document loaded locally. Choose another source to begin.');
  const [piiEnabled, setPiiEnabled] = useState(false);
  const [context, setContext] = useState({ role: '', jurisdiction: '', objective: '' });
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [compareId, setCompareId] = useState('demo-rental-revised');
  const [comparison, setComparison] = useState(null);
  const [concerns, setConcerns] = useState('');
  const [prep, setPrep] = useState(null);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('light');
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const fileInputRef = useRef(null);
  const aiStatus = getAiStatus();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
    document.documentElement.setAttribute('data-dyslexia', dyslexiaFont ? 'true' : 'false');
  }, [theme, highContrast, dyslexiaFont]);

  async function analyzeText(text, metadata, source) {
    const rawText = String(text || '').trim();
    if (!rawText) {
      setError('Add readable document text before analyzing.');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    try {
      const sanitized = piiEnabled ? sanitizePII(rawText) : { sanitizedText: rawText, tokensReplaced: 0 };
      const nextModel = processDocument(sanitized.sanitizedText, { ...metadata, userRole: context.role || undefined, piiRedacted: piiEnabled });
      setActiveDocument({ title: metadata.title || metadata.filename || 'Untitled document', filename: metadata.filename || 'document.txt', text: sanitized.sanitizedText, source, metadata: { ...metadata, piiRedacted: piiEnabled } });
      setDocumentModel(nextModel);
      setSelectedClauseId(nextModel.clauses?.[0]?.id || '');
      setAnswer(null);
      setComparison(null);
      setPrep(null);
      setCheckedItems(new Set());
      setNotice(`${nextModel.totalClauses} sections analyzed locally${piiEnabled ? `; ${sanitized.tokensReplaced} sensitive tokens redacted` : ''}.`);
    } catch (analysisError) {
      setError(analysisError?.message || 'The document could not be analyzed.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function selectSample(sample) {
    setIntakeMode('samples');
    analyzeText(sample.text, { title: sample.title, filename: sample.filename, documentType: 'TXT', isDemo: true }, 'sample');
  }

  async function handleFile(file) {
    if (!file) return;
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setIsAnalyzing(true);
    setError('');
    try {
      const parsed = await parseDocumentFile(file);
      await analyzeText(parsed.rawText, { ...parsed.metadata, title: file.name.replace(/\.[^/.]+$/, '') }, 'upload');
    } catch (uploadError) {
      setError(uploadError?.message || 'The file could not be read.');
      setIsAnalyzing(false);
    }
  }

  function handleFileChange(event) {
    handleFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function handleAsk(value) {
    const prompt = String(value || question).trim();
    if (!prompt) return;
    setQuestion(prompt);
    setIsAsking(true);
    setError('');
    try {
      const result = await askDocument({ question: prompt, documentModel, context });
      setAnswer(result);
      setNotice(result.usedLiveModel ? 'Answer produced with the configured live model and validated source citations.' : 'Answer produced with the local grounded engine.');
    } catch (askError) {
      setError(askError?.message || 'The question could not be answered.');
    } finally {
      setIsAsking(false);
    }
  }

  function handleCompare() {
    const other = getDemoDocument(compareId);
    if (!other) return;
    setIsComparing(true);
    setError('');
    window.setTimeout(() => {
      try {
        setComparison(compareDocumentsStructured(activeDocument.text, other.text, activeDocument.title, other.title));
        setNotice('Comparison complete. Review the source excerpts and changed wording.');
      } catch (comparisonError) {
        setError(comparisonError?.message || 'The drafts could not be compared.');
      } finally {
        setIsComparing(false);
      }
    }, 180);
  }

  function handlePrepare() {
    setIsPreparing(true);
    setError('');
    window.setTimeout(() => {
      try {
        setPrep(buildLawyerPrepPackage(documentModel, concerns));
        setCheckedItems(new Set());
        setNotice('Preparation package generated from the current document model.');
      } catch (preparationError) {
        setError(preparationError?.message || 'The preparation package could not be generated.');
      } finally {
        setIsPreparing(false);
      }
    }, 160);
  }

  async function copyPreparation() {
    if (!prep) return;
    try {
      await navigator.clipboard.writeText(prep.markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access was unavailable. You can download the Markdown package instead.');
    }
  }

  function resetSession() {
    const initial = makeInitialDocument();
    setActiveDocument(initial);
    setDocumentModel(processDocument(initial.text, initial.metadata));
    setSelectedClauseId('');
    setActiveTab('overview');
    setIntakeMode('samples');
    setDraftText('');
    setDraftTitle('');
    setQuestion('');
    setAnswer(null);
    setComparison(null);
    setPrep(null);
    setConcerns('');
    setError('');
    setNotice('Session cleared. A new sample document is ready locally.');
  }

  const currentTab = TABS.find((tab) => tab.id === activeTab) || TABS[0];
  const pageSummary = documentModel.metadata?.pageCount ? `${documentModel.metadata.pageCount} marked page${documentModel.metadata.pageCount === 1 ? '' : 's'}` : `${documentModel.metadata?.estimatedPages || 1} estimated page${documentModel.metadata?.estimatedPages === 1 ? '' : 's'}`;

  return (
    <ErrorBoundary>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="app-shell">
        <header className="site-header">
          <div className="header-inner">
            <a className="brand" href="#top" aria-label="ClauseGuard home"><span className="brand-icon"><Scale size={20} /></span><span>Clause<span>Guard</span></span></a>
            <nav className="header-nav" aria-label="Primary navigation"><a href="#workspace">Workspace</a><a href="#method">How it works</a><a href="#privacy">Privacy</a></nav>
            <div className="header-actions"><details className="accessibility-menu"><summary className="icon-button" aria-label="Open accessibility settings"><Eye size={17} /></summary><div className="accessibility-popover"><span className="accessibility-title">Display settings</span><button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light theme</button><button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark theme</button><button type="button" aria-pressed={highContrast} onClick={() => setHighContrast((current) => !current)}>High contrast</button><button type="button" aria-pressed={dyslexiaFont} onClick={() => setDyslexiaFont((current) => !current)}>Dyslexia-friendly text</button></div></details><span className="secure-chip"><ShieldCheck size={14} /> Local-first</span><button className="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((current) => !current)}><Menu size={20} /></button></div>{mobileNavOpen && <nav className="mobile-nav" aria-label="Mobile navigation"><a href="#workspace" onClick={() => setMobileNavOpen(false)}>Workspace</a><a href="#method" onClick={() => setMobileNavOpen(false)}>How it works</a><a href="#privacy" onClick={() => setMobileNavOpen(false)}>Privacy</a></nav>}
          </div>
        </header>
        <main id="main-content" className="page-container">
          <section id="top" className="hero-section"><div className="hero-copy"><span className="eyebrow accent">Document understanding for everyday decisions</span><h1>Read the fine print.<br /><em>Keep the context.</em></h1><p>ClauseGuard turns legal text into a source-linked reading workspace, so you can understand terms, compare drafts, and prepare for a qualified professional.</p><div className="hero-actions"><a className="primary-button" href="#intake">Start with a document <ArrowRight size={16} /></a><a className="quiet-link" href="#method">See the method <CircleHelp size={16} /></a></div></div><div className="hero-visual" aria-label="ClauseGuard workflow illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-card hero-card-main"><div className="hero-card-top"><span className="status-dot" /> <span>Grounded analysis</span><span className="hero-card-lock"><Lock size={13} /></span></div><strong>Document signals</strong><div className="signal-line"><span>Payment terms</span><i style={{ width: '72%' }} /></div><div className="signal-line"><span>Notice windows</span><i style={{ width: '48%' }} /></div><div className="signal-line"><span>Review areas</span><i style={{ width: '61%' }} /></div><div className="hero-card-foot"><CheckCircle2 size={14} /> Every response stays close to the source</div></div><div className="hero-card hero-card-float"><Sparkles size={16} /><span>Plain English</span></div></div></section>
          <section className="notice-banner"><div className="notice-icon"><ShieldCheck size={20} /></div><div><strong>Document assistance, not legal advice.</strong><p>{LEGAL_DISCLAIMER_TEXT} Always verify important terms against the original document and consult a qualified professional for advice about your situation.</p></div></section>
          <div className="live-announcement" role="status" aria-live="polite">{notice}</div>
          {error && <div className="error-banner" role="alert"><AlertTriangle size={18} /><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
          <section id="intake" className="intake-section"><SectionHeading eyebrow="Start here" title="Bring one document into focus" description="Use a fictional sample, upload a supported file, or paste text. Processing stays in this browser session unless you configure an optional model endpoint." /><div className="intake-grid"><section className="card intake-card"><div className="intake-card-heading"><div><span className="step-number">01</span><div><h3>Choose a source</h3><p>Start with a safe example or your own text.</p></div></div><span className="file-limit">10 MB max</span></div><div className="source-tabs" role="tablist" aria-label="Document source"><button type="button" role="tab" aria-selected={intakeMode === 'samples'} className={intakeMode === 'samples' ? 'active' : ''} onClick={() => setIntakeMode('samples')}><FileCheck2 size={16} /> Samples</button><button type="button" role="tab" aria-selected={intakeMode === 'upload'} className={intakeMode === 'upload' ? 'active' : ''} onClick={() => setIntakeMode('upload')}><Upload size={16} /> Upload</button><button type="button" role="tab" aria-selected={intakeMode === 'paste'} className={intakeMode === 'paste' ? 'active' : ''} onClick={() => setIntakeMode('paste')}><FileText size={16} /> Paste text</button></div>{intakeMode === 'samples' && <div className="sample-grid">{DEMO_DOCUMENTS.map((sample) => <button type="button" className={`sample-card ${activeDocument.filename === sample.filename ? 'selected' : ''}`} key={sample.id} onClick={() => selectSample(sample)}><span className="sample-icon"><FileText size={18} /></span><span className="sample-card-copy"><strong>{sample.title}</strong><small>{sample.category}</small><span>{sample.description}</span></span><ArrowRight size={16} className="sample-arrow" /></button>)}</div>}{intakeMode === 'upload' && <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><input ref={fileInputRef} id="file-upload" type="file" accept=".pdf,.docx,.txt,.md,.text" onChange={handleFileChange} /><label htmlFor="file-upload"><span className="upload-icon"><Upload size={24} /></span><strong>Choose a document or drop it here</strong><span>PDF, DOCX, TXT, or Markdown · 10 MB maximum</span><small>Text-based PDFs are supported. Scanned images may not extract reliably.</small></label></div>}{intakeMode === 'paste' && <div className="paste-fields"><label className="field-label" htmlFor="pasted-title">Document label <span>Optional</span></label><input id="pasted-title" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="e.g. My agreement" /><label className="field-label" htmlFor="pasted-text">Document text</label><textarea id="pasted-text" value={draftText} onChange={(event) => setDraftText(event.target.value)} rows={9} placeholder="Paste the agreement text here…" /><button className="primary-button" type="button" disabled={!draftText.trim()} onClick={() => analyzeText(draftText, { title: draftTitle || 'Pasted agreement', filename: 'pasted-agreement.txt', documentType: 'TXT' }, 'paste')}>Analyze pasted text <ArrowRight size={16} /></button></div>}<div className="intake-footer"><label className="toggle-label"><input type="checkbox" checked={piiEnabled} onChange={(event) => setPiiEnabled(event.target.checked)} /><span className="toggle-track" /><span>Redact common personal identifiers before processing</span></label><span className="small-muted">No document is written to permanent storage.</span></div></section><aside id="privacy" className="card privacy-card"><div className="privacy-icon"><Lock size={20} /></div><span className="eyebrow">Privacy by design</span><h3>Your document stays yours.</h3><p>ClauseGuard keeps the working document in memory for this session. Optional redaction runs locally before analysis.</p><ul className="privacy-list"><li><CheckCircle2 size={16} /> No account required</li><li><CheckCircle2 size={16} /> No document database</li><li><CheckCircle2 size={16} /> No invented page numbers</li><li><CheckCircle2 size={16} /> Clear the session anytime</li></ul><button className="quiet-link" type="button" onClick={resetSession}><RefreshCw size={15} /> Clear session</button></aside></div></section>
          <section id="method" className="method-section"><SectionHeading eyebrow="How it works" title="A careful path from text to understanding" /><div className="method-grid"><div className="method-step"><span>01</span><FileSearch size={21} /><h3>Parse</h3><p>Extract headings, dates, amounts, parties, and obligations from readable text.</p></div><div className="method-step"><span>02</span><Search size={21} /><h3>Retrieve</h3><p>Find only the passages that match the question instead of treating the whole file as context.</p></div><div className="method-step"><span>03</span><Bot size={21} /><h3>Ground</h3><p>Return a short answer with source excerpts, confidence, and limitations.</p></div><div className="method-step"><span>04</span><Briefcase size={21} /><h3>Prepare</h3><p>Turn open questions and source-linked details into a consultation checklist.</p></div></div></section>
          <section id="workspace" className="workspace-section"><div className="workspace-header"><div><span className="eyebrow">Active workspace</span><h2>{activeDocument.title}</h2><p>{activeDocument.filename} · {documentModel.metadata?.wordCount?.toLocaleString()} words · {pageSummary} · {activeDocument.source === 'sample' ? 'Fictional sample' : 'Session document'}</p></div><div className="workspace-header-actions"><span className={`mode-pill ${aiStatus.configured ? 'live' : ''}`}>{aiStatus.configured ? <><Sparkles size={13} /> Live model + local fallback</> : <><Lock size={13} /> Local grounded engine</>}</span><button className="icon-button" type="button" onClick={resetSession} aria-label="Clear current session" title="Clear session"><RefreshCw size={17} /></button></div></div><div className="workspace-tabs" role="tablist" aria-label="ClauseGuard workspace views">{TABS.map((tab) => { const Icon = tab.icon; return <button type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)}><Icon size={16} />{tab.label}{tab.id === 'overview' && <span>{documentModel.reviewAreaCount}</span>}</button>; })}</div><div role="tabpanel" aria-label={`${currentTab.label} view`} className="workspace-panel">{activeTab === 'overview' && <OverviewPanel model={documentModel} onExplain={(clause) => { setSelectedClauseId(clause.id); setActiveTab('plain'); setNotice(`Opened ${clause.heading} in the plain-language view.`); }} onAsk={(value) => { setActiveTab('ask'); handleAsk(value); }} />}{activeTab === 'plain' && <PlainLanguagePanel model={documentModel} selectedClauseId={selectedClauseId} onAsk={(value) => { setActiveTab('ask'); handleAsk(value); }} />}{activeTab === 'ask' && <AskPanel context={context} question={question} setQuestion={setQuestion} answer={answer} onAsk={handleAsk} isAsking={isAsking} onSuggested={(value) => handleAsk(value)} />}{activeTab === 'compare' && <ComparisonPanel activeDocument={activeDocument} model={documentModel} compareId={compareId} setCompareId={setCompareId} comparison={comparison} onCompare={handleCompare} isComparing={isComparing} />}{activeTab === 'lawyer' && <LawyerPrepPanel model={documentModel} concerns={concerns} setConcerns={setConcerns} prep={prep} onGenerate={handlePrepare} isPreparing={isPreparing} checkedItems={checkedItems} setCheckedItems={setCheckedItems} onCopy={copyPreparation} onDownload={() => downloadMarkdown('clauseguard-lawyer-prep.md', prep?.markdown || '')} copied={copied} />}</div></section>
        </main>
        <footer className="site-footer"><div className="footer-inner"><div><a className="brand footer-brand" href="#top"><span className="brand-icon"><Scale size={17} /></span><span>Clause<span>Guard</span></span></a><p>Understand the document. Keep the context. Prepare for the next step.</p></div><div className="footer-meta"><span><Lock size={13} /> Session-only processing</span><span><ShieldCheck size={13} /> Grounded responses</span><span><Scale size={13} /> Not legal advice</span></div></div></footer>
      </div>
    </ErrorBoundary>
  );
}
