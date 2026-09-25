import React, { useState } from 'react';
import {
  Scale,
  Key,
  Sun,
  Moon,
  Eye,
  Type,
  Volume2,
  VolumeX,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { getStoredApiKey } from '../services/geminiService';

export default function Header({
  theme,
  setTheme,
  highContrast,
  setHighContrast,
  dyslexiaFont,
  setDyslexiaFont,
  onOpenApiKeyModal,
  activeDocumentText
}) {
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const hasApiKey = Boolean(getStoredApiKey());

  const handleToggleTTS = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
    } else {
      if (!activeDocumentText) {
        alert('No document text loaded to read aloud.');
        return;
      }

      window.speechSynthesis.cancel();
      const snippet = activeDocumentText.slice(0, 1500);
      const utterance = new SpeechSynthesisUtterance(snippet);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = () => setIsPlayingTTS(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingTTS(true);
    }
  };

  return (
    <header className="app-header" style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      padding: '16px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Scale size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>
                Clause<span className="gradient-text">Guard</span>
              </h1>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                Legal Assistance & Access
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Understand your document. Spot what matters. Prepare for the next step.
            </p>
          </div>
        </div>

        {/* Action Controls & Accessibility */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* AI Mode Badge */}
          <button
            onClick={onOpenApiKeyModal}
            className="btn btn-secondary btn-sm"
            title="Configure Google Gemini API Key"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              borderColor: hasApiKey ? 'var(--status-fair-border)' : 'var(--border-color)',
            }}
          >
            {hasApiKey ? (
              <>
                <ShieldCheck size={15} color="var(--status-fair)" />
                <span style={{ color: 'var(--status-fair)', fontWeight: 600 }}>Gemini 1.5 Flash Live</span>
              </>
            ) : (
              <>
                <Cpu size={15} color="var(--brand-primary)" />
                <span style={{ color: 'var(--text-secondary)' }}>Local AI Active</span>
                <span className="badge badge-caution" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Offline</span>
              </>
            )}
            <Key size={13} style={{ marginLeft: '4px', opacity: 0.7 }} />
          </button>

          {/* Text to Speech Read-Aloud */}
          <button
            onClick={handleToggleTTS}
            className={`btn btn-icon ${isPlayingTTS ? 'btn-primary' : 'btn-outline'}`}
            title={isPlayingTTS ? 'Stop Audio Read-Aloud' : 'Read Document Aloud (Accessibility TTS)'}
            aria-label="Text to speech"
          >
            {isPlayingTTS ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Dyslexia-Friendly Font Toggle */}
          <button
            onClick={() => setDyslexiaFont(!dyslexiaFont)}
            className={`btn btn-icon ${dyslexiaFont ? 'btn-primary' : 'btn-outline'}`}
            title="Toggle Dyslexia-Friendly Typography (Accessibility)"
            aria-label="Toggle dyslexia font"
            style={{ fontWeight: dyslexiaFont ? 'bold' : 'normal' }}
          >
            <Type size={18} />
          </button>

          {/* High Contrast Mode Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`btn btn-icon ${highContrast ? 'btn-primary' : 'btn-outline'}`}
            title="Toggle High-Contrast Mode (WCAG AAA)"
            aria-label="Toggle high contrast"
          >
            <Eye size={18} />
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn btn-icon btn-outline"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
