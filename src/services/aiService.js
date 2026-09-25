import { containsUnsupportedLegalClaim, formatGroundedOutput, safeExcerpt } from './legalSafety';

const configuredEndpoint = String(import.meta.env.VITE_AI_PROXY_URL || '').trim();
const configuredModel = String(import.meta.env.VITE_AI_MODEL || 'grounded-legal-assistant').trim();

export const GROUNDED_SYSTEM_PROMPT = `You are ClauseGuard, a document-understanding assistant. You are not a lawyer and do not provide legal advice.
Use only the supplied source passages. Never invent a clause, fact, date, party, amount, page number, law, or citation. Distinguish a document fact from interpretation. If evidence is insufficient, say: "I couldn't find enough information in the provided document to answer that reliably." Quote only short excerpts. Return valid JSON with answer, confidence (high, medium, or low), sources, and limitations. Each source must use a passageId from the supplied passages. Do not say a document is illegal, invalid, enforceable, unenforceable, or guaranteed to win.`;

export function isLiveAiConfigured() {
  return Boolean(configuredEndpoint);
}

export function getAiStatus() {
  return {
    configured: isLiveAiConfigured(),
    model: isLiveAiConfigured() ? configuredModel : 'Local grounded engine',
    message: isLiveAiConfigured()
      ? 'A live model endpoint is configured. Source passages are sent for grounded analysis.'
      : 'No live model endpoint is configured. ClauseGuard is using its deterministic grounded engine.',
  };
}

function parseJson(value) {
  if (value && typeof value === 'object') return value;
  const text = String(value || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validateSources(rawSources, passages) {
  const passageMap = new Map(passages.map((passage) => [passage.passageId, passage]));
  const valid = [];
  for (const source of Array.isArray(rawSources) ? rawSources : []) {
    const passage = source?.passageId ? passageMap.get(source.passageId) : null;
    if (!passage) continue;
    const excerpt = safeExcerpt(source.excerpt || passage.text, 280);
    if (!excerpt || !passage.text.includes(source.excerpt?.slice(0, 80) || '')) {
      const normalizedExcerpt = excerpt.replace(/[“”]/g, '"');
      if (normalizedExcerpt && !passage.text.toLowerCase().includes(normalizedExcerpt.slice(0, 80).toLowerCase())) continue;
    }
    valid.push({ section: passage.section, page: passage.page ?? null, excerpt: passage.text.slice(0, 280), passageId: passage.passageId });
  }
  return valid;
}

export function validateGroundedModelResult(result, passages) {
  if (!result || typeof result.answer !== 'string' || !result.answer.trim()) return null;
  if (containsUnsupportedLegalClaim(result.answer)) return null;
  const sources = validateSources(result.sources, passages);
  if (!sources.length && !/couldn't find enough information/i.test(result.answer)) return null;
  return formatGroundedOutput({
    answer: result.answer,
    confidence: result.confidence,
    sources,
    limitations: Array.isArray(result.limitations) ? result.limitations : [],
  });
}

function buildRequestBody({ question, passages, context }) {
  return {
    model: configuredModel,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: GROUNDED_SYSTEM_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          question,
          userContext: {
            objective: context?.objective || '',
            jurisdiction: context?.jurisdiction || '',
            role: context?.role || '',
          },
          passages: passages.map((passage) => ({
            passageId: passage.passageId,
            section: passage.section,
            page: passage.page ?? null,
            text: passage.text,
          })),
        }),
      },
    ],
  };
}

export async function requestGroundedAnswer({ question, passages, context = {}, fetchImpl = fetch }) {
  if (!configuredEndpoint || !passages?.length) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchImpl(configuredEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequestBody({ question, passages, context })),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content ?? payload?.outputText ?? payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    return validateGroundedModelResult(parseJson(content), passages);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
