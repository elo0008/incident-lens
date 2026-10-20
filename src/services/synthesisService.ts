import { ActionItem, EventType, SynthesizedIncident, TimelineEvent } from '../types/incident';
import { DEMO_PRESETS } from '../data/demoIncident';
import { verifyIncident } from './verify';

export const ALLOWED_MODELS = ['gemini-3.6-flash'] as const;
export type AIModel = (typeof ALLOWED_MODELS)[number];
export const DEFAULT_MODEL: AIModel = 'gemini-3.6-flash';
export let FALLBACK_MODEL: string | null = 'gemini-3.5-flash';

export function setFallbackModelForTesting(model: string | null): void {
  FALLBACK_MODEL = model;
}

export function resetFallbackModel(): void {
  FALLBACK_MODEL = 'gemini-3.5-flash';
}

export const DEFAULT_RETRY_DELAYS_MS = [2000, 5000];
let activeRetryDelaysMs: number[] = [...DEFAULT_RETRY_DELAYS_MS];

export function setRetryDelaysForTesting(delays: number[]): void {
  activeRetryDelaysMs = [...delays];
}

export function resetRetryDelays(): void {
  activeRetryDelaysMs = [...DEFAULT_RETRY_DELAYS_MS];
}

export const DEFAULT_TIMEOUT_MS = 60000;
let activeTimeoutMs = DEFAULT_TIMEOUT_MS;

export function setTimeoutForTesting(timeoutMs: number): void {
  activeTimeoutMs = timeoutMs;
}

export function resetTimeout(): void {
  activeTimeoutMs = DEFAULT_TIMEOUT_MS;
}

export interface AISettings {
  apiKey: string;
  provider: 'gemini';
  model: AIModel;
}

export interface SynthesisOptions {
  retryDelaysMs?: number[];
  timeoutMs?: number;
  fallbackModel?: string | null;
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
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SynthesisError';
    this.status = status;
  }
}

class TransientFailure extends Error {
  status?: number;
  isNetwork?: boolean;
  constructor(message: string, status?: number, isNetwork = false) {
    super(message);
    this.name = 'TransientFailure';
    this.status = status;
    this.isNetwork = isNetwork;
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
  model: string;
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

function resolveActionItemOwner(rawOwner: string, rawLog: string): string {
  const trimmed = rawOwner.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unassigned') {
    return 'unassigned';
  }
  const stripped = trimmed.startsWith('@') ? trimmed.slice(1).trim() : trimmed;
  if (!stripped) {
    return 'unassigned';
  }
  const rawLogLower = rawLog.toLowerCase();
  const withAt = `@${stripped.toLowerCase()}`;
  const withoutAt = stripped.toLowerCase();

  if (rawLogLower.includes(withAt) || rawLogLower.includes(withoutAt)) {
    return trimmed;
  }
  return 'unassigned';
}

export function formatMarkdownReport(
  rawMarkdown: string,
  ttrMinutes: number,
  totalFalseLeadMinutes: number,
  sharePercent: number,
  durationRange: string
): string {
  const metricLineRegex = /^[\s*+-]*(?:\d+\.)?\s*(?:\*\*|__)?\s*(?:Duration|Time to Detect|Time to Resolve|TTD|TTR|Triage Time Ratio|Triage Efficiency)\b/i;

  const lines = rawMarkdown.split(/\r?\n/);
  const cleanedLines = lines.filter((line) => !metricLineRegex.test(line));

  const keyMetricsBlock = [
    '**Key metrics (computed from log timestamps):**',
    `- Duration: ${ttrMinutes} minutes${durationRange}`,
    `- Time to resolve: ${ttrMinutes} minutes`,
    `- Minutes lost on wrong turns: ${totalFalseLeadMinutes} minutes`,
    `- Share of incident lost on wrong turns: ${sharePercent}%`
  ];

  const headingIdx = cleanedLines.findIndex((line) => /^#+\s+.+/.test(line.trim()));

  if (headingIdx !== -1) {
    let nextContentIdx = headingIdx + 1;
    while (nextContentIdx < cleanedLines.length && cleanedLines[nextContentIdx].trim() === '') {
      nextContentIdx++;
    }
    cleanedLines.splice(
      headingIdx + 1,
      nextContentIdx - (headingIdx + 1),
      '',
      ...keyMetricsBlock,
      ''
    );
  } else {
    cleanedLines.unshift(...keyMetricsBlock, '');
  }

  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function synthesizeIncidentLogs(
  rawLog: string,
  settings: AISettings,
  options?: SynthesisOptions
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
      model: 'built-in',
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
6. For every FALSE_LEAD, sourceLineNumbers must include the line where the wrong hypothesis was first raised AND the line where it was disproven or abandoned; the end line is the first line where the team explicitly rules the hypothesis out OR starts a different hypothesis, whichever comes first. Use the first line's timestamp as the event timestamp.
7. markdownReport must NOT contain any computed metrics: no TTD, TTR, total duration, triage ratio, or minutes-lost figures. Describe events with their clock times from the log only.
8. Action item owners must be a person or handle that appears in the log, otherwise use 'unassigned'.

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

  const executeGeminiRequest = async (
    modelName: string,
    attemptNumber: number
  ): Promise<{ payload: any; model: string }> => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const timeoutMs = options?.timeoutMs ?? activeTimeoutMs;
    const controller = new AbortController();
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    if (timeoutMs > 0 && timeoutMs < Infinity) {
      timeoutTimer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    }

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
        }),
        signal: controller.signal
      });
    } catch {
      console.warn(
        `[IncidentLens] Attempt ${attemptNumber} for model "${modelName}" failed: network/timeout`
      );
      throw new TransientFailure('Network or browser CORS error / timeout', undefined, true);
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    }

    if (!response.ok) {
      const status = response.status;
      console.warn(
        `[IncidentLens] Attempt ${attemptNumber} for model "${modelName}" failed: HTTP ${status}`
      );

      // Transient server errors (500, 502, 503, 504, etc.)
      if (status >= 500) {
        throw new TransientFailure(`Server error HTTP ${status}`, status, false);
      }

      // Non-transient errors (4xx) - throw SynthesisError directly without retry
      let errMessage = '';
      try {
        const errJson = await response.json();
        errMessage = errJson?.error?.message || '';
      } catch {
        // ignore parse error on error responses
      }

      if (status === 400) {
        const lower = errMessage.toLowerCase();
        if (
          lower.includes('api key') ||
          lower.includes('key') ||
          lower.includes('api_key_invalid') ||
          lower.includes('invalid_argument')
        ) {
          throw new SynthesisError('Google rejected the API key. Check it in Settings.', 400);
        }
        throw new SynthesisError(
          errMessage ? `Google API error (HTTP 400): ${errMessage}` : 'Google rejected the request (HTTP 400 Bad Request).',
          400
        );
      }
      if (status === 401 || status === 403) {
        throw new SynthesisError(
          'Google API permission denied (HTTP 403). The API key or Google Cloud project may be restricted, or the Generative Language API is not enabled.',
          status
        );
      }
      if (status === 404) {
        throw new SynthesisError(
          `Gemini model "${modelName}" was not found for this API key (HTTP 404).`,
          404
        );
      }
      if (status === 429) {
        throw new SynthesisError(
          'Google Gemini quota or rate limit reached (HTTP 429). Please try again later or check your Google AI Studio quota.',
          429
        );
      }

      throw new SynthesisError(
        `Google API request failed (HTTP ${status}): ${errMessage || response.statusText}`,
        status
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new SynthesisError('Failed to parse valid JSON response from Gemini. Please try again.');
    }

    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new SynthesisError('The AI declined to analyze this log');
    }

    const candidate = data?.candidates?.[0];
    if (!candidate) {
      throw new SynthesisError('The AI declined to analyze this log');
    }

    if (candidate.finishReason === 'MAX_TOKENS') {
      throw new SynthesisError('The AI response was cut off; try a shorter log');
    }

    const textPart = candidate?.content?.parts?.[0]?.text;
    if (!textPart || typeof textPart !== 'string') {
      throw new SynthesisError('The AI declined to analyze this log');
    }

    let payload: any;
    try {
      payload = JSON.parse(textPart);
    } catch {
      throw new SynthesisError('Failed to parse valid JSON response from Gemini. Please try again.');
    }

    return { payload, model: modelName };
  };

  const delays = options?.retryDelaysMs ?? activeRetryDelaysMs;
  const maxAttempts = 1 + delays.length; // 3 attempts total with 2 retries

  let successfulCall: { payload: any; model: string } | null = null;
  let lastTransientError: TransientFailure | null = null;

  // Primary model execution with retries on transient errors
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      successfulCall = await executeGeminiRequest(selectedModel, attempt);
      break;
    } catch (err: unknown) {
      if (err instanceof TransientFailure) {
        lastTransientError = err;
        if (attempt < maxAttempts) {
          const delay = delays[attempt - 1] ?? 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      } else {
        // Non-transient errors (4xx or semantic errors): throw immediately without retry
        throw err;
      }
    }
  }

  // If primary model exhausted its attempts with transient errors, try fallback model
  const effectiveFallback = options?.fallbackModel !== undefined ? options.fallbackModel : FALLBACK_MODEL;
  if (!successfulCall && effectiveFallback && effectiveFallback !== selectedModel) {
    try {
      successfulCall = await executeGeminiRequest(effectiveFallback, maxAttempts + 1);
    } catch (err: unknown) {
      const fallbackStatus = (err as any)?.status ? `HTTP ${(err as any).status}` : 'network/timeout';
      console.warn(
        `[IncidentLens] Fallback attempt for model "${effectiveFallback}" failed with status: ${fallbackStatus}`
      );
      if (lastTransientError?.isNetwork) {
        throw new SynthesisError("Could not reach Google's API (network or browser CORS error). Check your connection and try again.");
      }
      throw new SynthesisError("Google's model is overloaded right now. Try again in a minute.");
    }
  }

  if (!successfulCall) {
    if (lastTransientError?.isNetwork) {
      throw new SynthesisError("Could not reach Google's API (network or browser CORS error). Check your connection and try again.");
    }
    throw new SynthesisError("Google's model is overloaded right now. Try again in a minute.");
  }

  const payload = successfulCall.payload;
  const actualModel = successfulCall.model;

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
        owner: resolveActionItemOwner(typeof item?.owner === 'string' ? item.owner : '', rawLog)
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
  let totalFalseLeadMinutes = 0;
  if (ttrMinutes > 0) {
    totalFalseLeadMinutes = verifiedIncident.events
      .filter(e => e.type === 'FALSE_LEAD' && typeof e.timeLostMinutes === 'number')
      .reduce((acc, e) => acc + (e.timeLostMinutes || 0), 0);
    verifiedIncident.executiveSummary.triageTimeRatio = Math.min(
      1,
      Math.max(0, totalFalseLeadMinutes / ttrMinutes)
    );
  }

  const sharePercent = ttrMinutes > 0
    ? Math.round((totalFalseLeadMinutes / ttrMinutes) * 100)
    : 0;

  const events = verifiedIncident.events;
  const firstEvent = events[0];
  let resolutionEvent: TimelineEvent | undefined;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 'RESOLUTION') {
      resolutionEvent = events[i];
      break;
    }
  }
  const lastEvent = resolutionEvent || events[events.length - 1];
  const startTime = firstEvent?.timestamp?.trim() || '';
  const endTime = lastEvent?.timestamp?.trim() || '';
  const durationRange = startTime && endTime ? ` (${startTime} to ${endTime})` : '';

  verifiedIncident.markdownReport = formatMarkdownReport(
    verifiedIncident.markdownReport,
    ttrMinutes,
    totalFalseLeadMinutes,
    sharePercent,
    durationRange
  );

  return {
    incident: verifiedIncident,
    mode: 'live_ai',
    model: actualModel,
    verification: {
      grounded: verified.groundedCount,
      total: verified.totalCount,
      warnings: verified.warnings
    }
  };
}
