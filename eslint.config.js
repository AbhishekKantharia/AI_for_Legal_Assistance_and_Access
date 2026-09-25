import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src/components/AnalysisDashboard.jsx',
      'src/components/ApiKeyModal.jsx',
      'src/components/AskDocument.jsx',
      'src/components/ClauseExplorer.jsx',
      'src/components/ContractComparator.jsx',
      'src/components/ContractComparison.jsx',
      'src/components/DisclaimerBanner.jsx',
      'src/components/DocumentDashboard.jsx',
      'src/components/DocumentInput.jsx',
      'src/components/DocumentUpload.jsx',
      'src/components/FederalRegisterBrowser.jsx',
      'src/components/Header.jsx',
      'src/components/LawyerPrepDossier.jsx',
      'src/components/LawyerPrepView.jsx',
      'src/components/LegalCopilotQA.jsx',
      'src/components/PlainLanguageExplainer.jsx',
      'src/components/RiskObligationRadar.jsx',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          ecmaVersion: 'latest',
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
