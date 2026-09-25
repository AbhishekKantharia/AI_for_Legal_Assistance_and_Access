# ClauseGuard

ClauseGuard is a local-first document-understanding workspace for people who want a clearer first pass through a legal document before discussing it with a qualified professional. It turns a document into source-linked sections, key facts, dates, obligations, review signals, plain-language views, grounded questions, neutral draft comparisons, and a consultation-preparation checklist.

ClauseGuard provides document information and organization. It does not provide legal advice, determine whether a document is valid or enforceable, recommend whether to sign, or predict an outcome.

## What it includes

- Fictional residential rental, revised rental, employment, and services documents for safe exploration.
- File upload for PDF, DOCX, TXT, and Markdown files up to 10 MB, plus paste-text intake.
- Browser-side parsing, clause segmentation, fact extraction, date detection, and obligation grouping.
- Retrieval over clause passages rather than sending an entire document to a model.
- Grounded answers with source excerpts, page markers when available, confidence, and limitations.
- Safety redirects for requests that ask for legal conclusions, signing decisions, or guaranteed outcomes.
- Neutral comparison labels for added, removed, and modified wording between two drafts.
- Lawyer-preparation questions, checklist items, source snippets, and Markdown export.
- Keyboard focus states, semantic controls, live status announcements, responsive layouts, high contrast, and dyslexia-friendly text settings.
- Optional in-browser PII masking before analysis.

## Grounded pipeline

1. Validate the source type and size.
2. Extract readable text while preserving page markers when the format provides them.
3. Split the text into clause-level passages.
4. Detect explicit facts, dates, parties, obligations, and review signals.
5. Retrieve only passages relevant to the user's question.
6. Use the local deterministic grounded engine by default.
7. If an optional model endpoint is configured, send the question and retrieved passages to that endpoint, then validate its JSON response and citations.
8. Reject unsupported legal claims, invented sources, invalid page values, and answers without supporting evidence.
9. Show the answer, excerpts, confidence, and limitations to the user.

If the document does not support a reliable answer, ClauseGuard says so rather than filling the gap.

## Optional live model

The application works without credentials. To enable an optional model-backed path, copy `.env.example` to `.env.local` and set:

```bash
VITE_AI_PROXY_URL=/same-origin-model-proxy
VITE_AI_MODEL=grounded-legal-assistant
```

`VITE_AI_PROXY_URL` should point to a trusted, same-origin backend proxy. Do not put a provider API key in a `VITE_*` variable: Vite embeds client-side variables in the browser bundle. The proxy receives only the question, limited user context, and retrieved passages. ClauseGuard expects a JSON response containing a `choices[0].message.content`, `outputText`, or Gemini-style `candidates[0].content.parts[0].text` field with this shape:

```json
{
  "answer": "The document states ...",
  "confidence": "high",
  "sources": [
    {
      "passageId": "passage-1",
      "excerpt": "A short excerpt from the supplied passage."
    }
  ],
  "limitations": ["This answer is limited to the supplied document passages."]
}
```

The response is accepted only when the sources refer to supplied passages and the answer passes the safety checks. A failed, timed-out, or invalid live response falls back to the local grounded engine.

## Run locally

Prerequisites: Node.js 18 or newer and npm 9 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm test
npm run build
npm run preview
```

There is no mandatory API key and no required database. Uploaded and pasted content is held in the current browser session and is not intentionally persisted by ClauseGuard.

## Input and privacy behavior

- PDF, DOCX, TXT, and Markdown intake is supported.
- The client rejects files larger than 10 MB and validates the file extension and MIME type.
- Extracted content is rendered as text; it is not executed as HTML.
- PII masking is opt-in and happens before the analysis model is created.
- The default response path does not make a network request.
- A configured model proxy is the only intentional document-content network path.
- The Content Security Policy restricts connections to the application origin. A production deployment should configure its proxy and response headers server-side as well.

PII masking is a helpful minimization step, not a guarantee that every sensitive detail is detected. Review documents before sharing them.

## Accessibility and responsible presentation

The interface includes a skip link, visible keyboard focus, labeled form controls, semantic tab panels, status announcements, readable error states, and non-color-only review labels. Users can switch between light and dark themes, enable high contrast, or use the dyslexia-friendly text setting.

Review signals such as “needs attention” and “wording changed” are neutral prompts. They are not findings that a clause is illegal, unfair, invalid, or enforceable. The original wording remains available in the plain-language view so users can verify every interpretation.

## Tests

The repository uses Vitest. The current suite contains 11 test files and 48 tests covering parsing, retrieval, intent routing, safety, comparison, preparation behavior, PII handling, readability, and the grounded compatibility service. The Federal Register integration tests make live requests and require network access; the rest of the core workspace tests are deterministic and do not need a model credential.

## Project structure

```text
src/
  components/
    ClauseGuardApp.jsx       Main accessible workspace and intake flow
    ErrorBoundary.jsx         Recoverable UI error boundary
  data/
    demoDocuments.js          Fictional page-marked sample documents
    syntheticContracts.js     Deterministic test fixtures
  services/
    documentParser.js         File validation, extraction, and document model
    retrievalEngine.js        Passage indexing, retrieval, and local answers
    intentRouter.js           Intent classification and safe routing
    aiService.js              Optional proxy integration and validation
    documentAssistant.js      Grounded Q&A orchestration
    comparisonEngine.js       Neutral draft comparison
    lawyerPrepService.js      Consultation preparation and Markdown
    legalSafety.js            Disclaimers, safety redirects, and citations
    piiSanitizer.js           Optional in-browser PII masking
```

Older service and component modules remain available where they are used by compatibility tests, but `App.jsx` mounts the ClauseGuard workspace directly.

## Limitations

ClauseGuard is a document-organization and information tool, not a lawyer, regulator, or case-analysis system. It may miss a term, misidentify a role, or extract a date imperfectly. It does not know the complete context outside the supplied text. A qualified legal professional should review the original document and any questions that matter for a real decision.

## License

GPL-3.0. See `LICENSE`.
