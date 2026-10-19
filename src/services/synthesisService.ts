import { ActionItem, EventType, SynthesizedIncident, TimelineEvent } from '../types/incident';
import { DEMO_PRESETS } from '../data/demoIncident';
import { verifyIncident } from './verify';

export const ALLOWED_MODELS = ['gemini-3.6-flash'] as const;
export type AIModel = (typeof ALLOWED_MODELS)[number];
export const DEFAULT_MODEL: AIModel = 'gemini-3.6-flash';

export interface AISettings {
  apiKey: string;
  provider: 'gemini';
  model: AIModel;
}

const STORAGE_KEY = 'incidentlens_ai_settings_v2';

export function getStoredAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const model: AIModel = (ALLOWED_MODELS as readonly string[]).includes(parsed?.model)
        ? parsed.model
        : DEFAULT_MODEL;
      return {
        apiKey: typeof parsed?.apiKey === 'string' ? parsed.apiKey : '',
        provider: 'gemini',
        model
      };
    }
  } catch (err) {
    console.error('Error reading AI settings from localStorage', err);
  }
  return {
    apiKey: '',
    provider: 'gemini',
    model: DEFAULT_MODEL
  };
}

export function saveAISettings(settings: AISettings): void {
  try {
    const model: AIModel = (ALLOWED_MODELS as readonly string[]).includes(settings.model)
      ? settings.model
      : DEFAULT_MODEL;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, provider: 'gemini', model }));
  } catch (err) {
    console.error('Error saving AI settings to localStorage', err);
  }
}

export class SynthesisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SynthesisError';
  }
}

export function getBlockingReason(rawLog: string, settings: AISettings): string | null {
  const trimmed = rawLog.trim();
  const isPreset = DEMO_PRESETS.some(p => p.rawLog.trim() === trimmed);
  if (isPreset) {
    return null;
  }
  if (!settings.apiKey || !settings.apiKey.trim()) {
    return `Sample mode only analyzes the ${DEMO_PRESETS.length} built-in incidents. To analyze your own log, add a free Gemini API key in Settings (gear icon).`;
  }
  if (rawLog.length > 60000) {
    return `Input log is too long (${rawLog.length} characters). Maximum allowed length is 60,000 characters.`;
  }
  return null;
}

export interface VerificationSummary {
  grounded: number;
  total: number;
  warnings: string[];
}

export interface SynthesisResult {
  incident: SynthesizedIncident;
  mode: 'offline_verified' | 'live_ai';
  verification: VerificationSummary;
}

const VALID_EVENT_TYPES: Set<EventType> = new Set([
  'CRITICAL_ALERT',
  'TRIAGE',
  'FALSE_LEAD',
  'ROOT_CAUSE',
  'MITIGATION',
  'RESOLUTION'
]);

export async function synthesizeIncidentLogs(
  rawLog: string,
  settings: AISettings
): Promise<SynthesisResult> {
  const trimmed = rawLog.trim();
  const matchingPreset = DEMO_PRESETS.find(p => p.rawLog.trim() === trimmed);

  if (matchingPreset) {
    const verified = verifyIncident(matchingPreset.rawLog, matchingPreset.synthesizedData, {
      recomputeTimeLost: false
    });
    return {
      incident: verified.incident,
      mode: 'offline_verified',
      verification: {
        grounded: verified.groundedCount,
        total: verified.totalCount,
        warnings: verified.warnings
      }
    };
  }

  const blockingReason = getBlockingReason(rawLog, settings);
  if (blockingReason) {
    throw new SynthesisError(blockingReason);
  }

  const rawLines = rawLog.split(/\r?\n/);
  const numberedLog = rawLines
    .map((line, idx) => `${idx + 1}| ${line}`)
    .join('\n');

  const systemPrompt = `You are IncidentLens, an expert SRE incident postmortem timeline synthesizer.
Analyze the following numbered raw incident chat and alert logs and output a single JSON object.
Every line has been prefixed with its 1-based line number in the format "N| text".

Strict rules:
1. NEVER invent timestamps, people/authors, or root causes that do not appear in the log.
2. For each event, copy the exact timestamp string from the source log and quote an exact rawSnippet substring.
3. Every event MUST cite at least one line number in "sourceLineNumbers" corresponding to the "N|" line numbers shown.
4. Categorize any wrong hypotheses, false alarms, or dead-end investigations that engineers pursued and subsequently disproved as "FALSE_LEAD".
5. Identify the singular true root cause as "ROOT_CAUSE".

Schema:
{
  "executiveSummary": {
    "title": "string",
    "impact": "string",
    "ttdMinutes": number,
    "ttrMinutes": number,
    "triageTimeRatio": number (0.0 to 1.0)
  },
  "rootCause": {
    "summary": "string",
    "discoveredAt": "string timestamp",
    "discoveredBy": "string author"
  },
  "events": [
    {
      "timestamp": "exact timestamp string from log line",
      "author": "author handle or system alert name",
      "type": "CRITICAL_ALERT" | "TRIAGE" | "FALSE_LEAD" | "ROOT_CAUSE" | "MITIGATION" | "RESOLUTION",
      "summary": "concise description",
      "rawSnippet": "exact verbatim quote from log",
      "sourceLineNumbers": [number],
      "timeLostMinutes": number,
      "details": "detailed description"
    }
  ],
  "actionItems": [
    {
      "priority": "P0" | "P1" | "P2",
      "action": "string",
      "owner": "string"
    }
  ],
  "markdownReport": "complete non-empty Markdown postmortem document"
}`;

  const selectedModel = (ALLOWED_MODELS as readonly string[]).includes(settings.model)
    ? settings.model
    : DEFAULT_MODEL;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': settings.apiKey.trim()
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: numberedLog }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      })
    });
  } catch (err) {
    throw new SynthesisError(
      "Could not reach Google's API (network or browser CORS error). Check your connection and try again."
    );
  }

  if (!response.ok) {
    let errMessage = '';
    try {
      const errJson = await response.json();
      errMessage = errJson?.error?.message || '';
    } catch {
      // ignore JSON parse failure on error response
    }

    if (response.status === 400) {
      const lower = errMessage.toLowerCase();
      if (
        lower.includes('api key') ||
        lower.includes('key') ||
        lower.includes('api_key_invalid') ||
        lower.includes('invalid_argument')
      ) {
        throw new SynthesisError('Google rejected the API key. Check it in Settings.');
      }
      throw new SynthesisError(
        errMessage ? `Google API error (HTTP 400): ${errMessage}` : 'Google rejected the request (HTTP 400 Bad Request).'
      );
    }
    if (response.status === 403) {
      throw new SynthesisError(
        'Google API permission denied (HTTP 403). The API key or Google Cloud project may be restricted, or the Generative Language API is not enabled.'
      );
    }
    if (response.status === 404) {
      throw new SynthesisError(
        'Gemini model not found (HTTP 404). Please select a different model in Settings (gear icon).'
      );
    }
    if (response.status === 429) {
      throw new SynthesisError(
        'Google Gemini quota or rate limit reached (HTTP 429). Please try again later or check your Google AI Studio quota.'
      );
    }
    throw new SynthesisError(
      errMessage || `Google API returned HTTP ${response.status}. Please try again.`
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    throw new SynthesisError('Failed to parse valid JSON response from Gemini. Please try again.');
  }

  if (
    data?.promptFeedback?.blockReason ||
    !Array.isArray(data?.candidates) ||
    data.candidates.length === 0
  ) {
    throw new SynthesisError('The AI declined to analyze this log');
  }

  const candidate = data.candidates[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new SynthesisError('The AI response was cut off; try a shorter log');
  }

  const textPart = candidate?.content?.parts?.[0]?.text;
  if (!textPart || typeof textPart !== 'string') {
    throw new SynthesisError('The AI declined to analyze this log');
  }

  let payload: any;
  try {
    payload = JSON.parse(textPart);
  } catch (err) {
    throw new SynthesisError('Failed to parse valid JSON response from Gemini. Please try again.');
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    !payload.executiveSummary ||
    !payload.rootCause ||
    !Array.isArray(payload.events) ||
    payload.events.length === 0 ||
    typeof payload.markdownReport !== 'string' ||
    !payload.markdownReport.trim()
  ) {
    throw new SynthesisError(
      'Gemini response is missing required incident fields (executiveSummary, rootCause, events array, or markdownReport).'
    );
  }

  const validEvents = payload.events.filter(
    (e: any) => e && typeof e === 'object' && VALID_EVENT_TYPES.has(e.type)
  );

  if (validEvents.length === 0) {
    throw new SynthesisError(
      'Gemini response did not contain at least one valid event matching required event types.'
    );
  }

  const normalizedEvents: TimelineEvent[] = validEvents.map((rawEvent: any, idx: number) => {
    let sourceLineIndices: number[] = [];

    if (Array.isArray(rawEvent.sourceLineNumbers)) {
      sourceLineIndices = rawEvent.sourceLineNumbers
        .filter((n: any) => typeof n === 'number' && Number.isInteger(n))
        .map((n: number) => n - 1);
    }

    if (sourceLineIndices.length === 0 && typeof rawEvent.rawSnippet === 'string') {
      const snippet = rawEvent.rawSnippet.trim();
      if (snippet.length >= 8) {
        const targetSub = snippet.slice(0, 40);
        rawLines.forEach((line, lineIdx) => {
          if (line.includes(targetSub)) {
            sourceLineIndices.push(lineIdx);
          }
        });
      }
    }

    return {
      id: `evt-${idx + 1}`,
      timestamp: String(rawEvent.timestamp || ''),
      author: String(rawEvent.author || 'System'),
      type: rawEvent.type as EventType,
      summary: String(rawEvent.summary || ''),
      rawSnippet: String(rawEvent.rawSnippet || ''),
      timeLostMinutes: typeof rawEvent.timeLostMinutes === 'number' ? rawEvent.timeLostMinutes : 0,
      details: typeof rawEvent.details === 'string' ? rawEvent.details : undefined,
      sourceLineIndices
    };
  });

  const rawRatio = Number(payload.executiveSummary.triageTimeRatio);
  const triageTimeRatio = Number.isFinite(rawRatio)
    ? Math.max(0, Math.min(1, rawRatio))
    : 0;

  const actionItems: ActionItem[] = Array.isArray(payload.actionItems)
    ? payload.actionItems.map((item: any) => ({
        priority: (['P0', 'P1', 'P2'].includes(item?.priority) ? item.priority : 'P1') as 'P0' | 'P1' | 'P2',
        action: typeof item?.action === 'string' ? item.action : '',
        owner: typeof item?.owner === 'string' ? item.owner : ''
      }))
    : [];

  const normalizedIncident: SynthesizedIncident = {
    executiveSummary: {
      title: String(payload.executiveSummary.title || 'Synthesized Incident'),
      impact: String(payload.executiveSummary.impact || ''),
      ttdMinutes: Number(payload.executiveSummary.ttdMinutes) || 0,
      ttrMinutes: Number(payload.executiveSummary.ttrMinutes) || 0,
      triageTimeRatio
    },
    rootCause: {
      summary: String(payload.rootCause.summary || ''),
      discoveredAt: String(payload.rootCause.discoveredAt || ''),
      discoveredBy: String(payload.rootCause.discoveredBy || '')
    },
    events: normalizedEvents,
    actionItems,
    markdownReport: String(payload.markdownReport)
  };

  const verified = verifyIncident(rawLog, normalizedIncident, {
    recomputeTimeLost: true,
    base: 0
  });

  const verifiedIncident = verified.incident;
  const ttrMinutes = verifiedIncident.executiveSummary.ttrMinutes;
  if (ttrMinutes > 0) {
    const totalFalseLeadMinutes = verifiedIncident.events
      .filter(e => e.type === 'FALSE_LEAD' && typeof e.timeLostMinutes === 'number')
      .reduce((acc, e) => acc + (e.timeLostMinutes || 0), 0);
    verifiedIncident.executiveSummary.triageTimeRatio = Math.min(
      1,
      Math.max(0, totalFalseLeadMinutes / ttrMinutes)
    );
  }

  return {
    incident: verifiedIncident,
    mode: 'live_ai',
    verification: {
      grounded: verified.groundedCount,
      total: verified.totalCount,
      warnings: verified.warnings
    }
  };
}
