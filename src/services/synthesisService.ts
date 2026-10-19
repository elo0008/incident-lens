import { ActionItem, EventType, SynthesizedIncident, TimelineEvent } from '../types/incident';
import { DEMO_PRESETS } from '../data/demoIncident';
import { verifyIncident } from './verify';

export type AIModel = 'gpt-4o-mini' | 'gpt-4o';
export const ALLOWED_MODELS: AIModel[] = ['gpt-4o-mini', 'gpt-4o'];

export interface AISettings {
  apiKey: string;
  provider: 'openai';
  model: AIModel;
}

const STORAGE_KEY = 'incidentlens_ai_settings';

export function getStoredAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const model: AIModel = ALLOWED_MODELS.includes(parsed.model) ? parsed.model : 'gpt-4o-mini';
      return {
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
        provider: 'openai',
        model
      };
    }
  } catch (err) {
    console.error('Error reading AI settings from localStorage', err);
  }
  return {
    apiKey: '',
    provider: 'openai',
    model: 'gpt-4o-mini'
  };
}

export function saveAISettings(settings: AISettings): void {
  try {
    const model: AIModel = ALLOWED_MODELS.includes(settings.model) ? settings.model : 'gpt-4o-mini';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, provider: 'openai', model }));
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
    return `Sample mode only analyzes the ${DEMO_PRESETS.length} built-in incidents. To analyze your own log, add an OpenAI API key in Settings (gear icon).`;
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

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: numberedLog }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });
  } catch (err) {
    throw new SynthesisError(
      'Could not reach OpenAI (network or browser CORS error). Check your connection and try again.'
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new SynthesisError(
        'OpenAI API key was rejected (HTTP 401 Unauthorized). Please check your API key in Settings (gear icon).'
      );
    }
    if (response.status === 429) {
      throw new SynthesisError(
        'OpenAI rate limit or quota exceeded (HTTP 429). Please check your account usage and quota limits.'
      );
    }
    throw new SynthesisError(
      `OpenAI returned HTTP ${response.status}. Please try again.`
    );
  }

  let payload: any;
  try {
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Empty response content');
    }
    payload = JSON.parse(content);
  } catch (err) {
    throw new SynthesisError(
      'Failed to parse valid JSON response from OpenAI. Please try again.'
    );
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
      'OpenAI response is missing required incident fields (executiveSummary, rootCause, events array, or markdownReport).'
    );
  }

  const validEvents = payload.events.filter(
    (e: any) => e && typeof e === 'object' && VALID_EVENT_TYPES.has(e.type)
  );

  if (validEvents.length === 0) {
    throw new SynthesisError(
      'OpenAI response did not contain at least one valid event matching required event types.'
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
