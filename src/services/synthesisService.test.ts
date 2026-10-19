import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getStoredAISettings,
  saveAISettings,
  getBlockingReason,
  synthesizeIncidentLogs,
  SynthesisError,
  DEFAULT_MODEL
} from './synthesisService';
import { DEMO_PRESETS } from '../data/demoIncident';

class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockLocalStorage = new LocalStorageMock();
vi.stubGlobal('localStorage', mockLocalStorage);

describe('synthesisService (Google Gemini Provider)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('settings and storage isolation', () => {
    it('ignores old localStorage key incidentlens_ai_settings', () => {
      // Seed old OpenAI key in old storage key
      localStorage.setItem(
        'incidentlens_ai_settings',
        JSON.stringify({ apiKey: 'sk-old-openai-key', provider: 'openai', model: 'gpt-4o' })
      );

      const settings = getStoredAISettings();
      expect(settings.apiKey).toBe('');
      expect(settings.provider).toBe('gemini');
      expect(settings.model).toBe(DEFAULT_MODEL);
    });

    it('persists and loads settings using incidentlens_ai_settings_v2', () => {
      saveAISettings({
        apiKey: 'AIzaSyTestKey123',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });

      expect(localStorage.getItem('incidentlens_ai_settings_v2')).toBeTruthy();
      expect(localStorage.getItem('incidentlens_ai_settings')).toBeNull();

      const loaded = getStoredAISettings();
      expect(loaded.apiKey).toBe('AIzaSyTestKey123');
      expect(loaded.provider).toBe('gemini');
      expect(loaded.model).toBe('gemini-3.6-flash');
    });

    it('falls back unknown stored models to DEFAULT_MODEL', () => {
      localStorage.setItem(
        'incidentlens_ai_settings_v2',
        JSON.stringify({ apiKey: 'valid-key', provider: 'gemini', model: 'unknown-model-xyz' })
      );

      const loaded = getStoredAISettings();
      expect(loaded.model).toBe('gemini-3.6-flash');
    });
  });

  describe('getBlockingReason', () => {
    it('returns null for matching preset logs even without API key', () => {
      const reason = getBlockingReason(DEMO_PRESETS[0].rawLog, {
        apiKey: '',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });
      expect(reason).toBeNull();
    });

    it('returns free Gemini API key prompt for custom logs when key is missing', () => {
      const reason = getBlockingReason('custom alert log\nanother line\nthird line', {
        apiKey: '',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });
      expect(reason).toBe(
        `Sample mode only analyzes the ${DEMO_PRESETS.length} built-in incidents. To analyze your own log, add a free Gemini API key in Settings (gear icon).`
      );
    });

    it('returns null for custom log when key is provided and length <= 60000', () => {
      const reason = getBlockingReason('custom log line 1\nline 2\nline 3', {
        apiKey: 'AIzaSyValid',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });
      expect(reason).toBeNull();
    });

    it('returns too long message if log exceeds 60000 chars', () => {
      const hugeLog = 'a'.repeat(60005);
      const reason = getBlockingReason(hugeLog, {
        apiKey: 'AIzaSyValid',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });
      expect(reason).toContain('too long (60005 characters)');
    });
  });

  describe('synthesizeIncidentLogs execution and error mapping', () => {
    const customLog = [
      '10:00 Alert: Payment gateway 504 errors detected in prod-us-east',
      '10:05 Investigating database connection pool saturation as potential cause',
      '10:20 Database healthy; found third-party webhook timeout instead',
      '10:35 Webhook timeout circuit breaker applied and traffic recovered'
    ].join('\n');

    it('returns offline verified incident for preset without calling fetch', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const result = await synthesizeIncidentLogs(DEMO_PRESETS[0].rawLog, {
        apiKey: '',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.mode).toBe('offline_verified');
      expect(result.verification.grounded).toBe(result.verification.total);
      expect(result.incident.executiveSummary.title).toBe(DEMO_PRESETS[0].synthesizedData.executiveSummary.title);
    });

    it('throws sample mode SynthesisError without calling fetch for custom log when key is absent', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: '',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrowError(SynthesisError);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('handles network / browser CORS rejection', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'AIzaSyTest',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow(
        "Could not reach Google's API (network or browser CORS error). Check your connection and try again."
      );
    });

    it('handles HTTP 400 with invalid API key error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: 400,
              message: 'API key not valid. Please pass a valid API key.',
              status: 'INVALID_ARGUMENT'
            }
          })
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'bad-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('Google rejected the API key. Check it in Settings.');
    });

    it('handles HTTP 400 other error including API message', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: 400,
              message: 'Request payload contains unsupported field',
              status: 'INVALID_ARGUMENT'
            }
          })
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('Google API error (HTTP 400): Request payload contains unsupported field');
    });

    it('handles HTTP 403 permission denied', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({
            error: {
              code: 403,
              message: 'The caller does not have permission'
            }
          })
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow(
        'Google API permission denied (HTTP 403). The API key or Google Cloud project may be restricted, or the Generative Language API is not enabled.'
      );
    });

    it('handles HTTP 404 model not found', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => ({})
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow(
        'Gemini model not found (HTTP 404). Please select a different model in Settings (gear icon).'
      );
    });

    it('handles HTTP 429 quota exhaustion', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          json: async () => ({})
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow(
        'Google Gemini quota or rate limit reached (HTTP 429). Please try again later or check your Google AI Studio quota.'
      );
    });

    it('handles promptFeedback blockReason', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            promptFeedback: { blockReason: 'SAFETY' },
            candidates: []
          })
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('The AI declined to analyze this log');
    });

    it('handles empty candidates array', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: []
          })
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('The AI declined to analyze this log');
    });

    it('handles finishReason MAX_TOKENS cut off', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                finishReason: 'MAX_TOKENS',
                content: { parts: [{ text: '{"title": "incomplete json' }] }
              }
            ]
          })
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('The AI response was cut off; try a shorter log');
    });

    it('handles invalid JSON inside candidate text part', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: 'I am unable to output JSON as requested.' }] }
              }
            ]
          })
        })
      );

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('Failed to parse valid JSON response from Gemini. Please try again.');
    });

    it('successfully processes well-formed Gemini response with cited line numbers and recomputed timeLostMinutes', async () => {
      const mockIncidentPayload = {
        executiveSummary: {
          title: 'Custom Gateway Latency Spike',
          impact: 'Payment 504 timeouts on checkout',
          ttdMinutes: 5,
          ttrMinutes: 35,
          triageTimeRatio: 0.4
        },
        rootCause: {
          summary: 'Third party webhook timeout saturation',
          discoveredAt: '10:20',
          discoveredBy: '@oncall'
        },
        events: [
          {
            timestamp: '10:00',
            author: 'Datadog',
            type: 'CRITICAL_ALERT',
            summary: '504 gateway timeout spike',
            rawSnippet: 'Payment gateway 504 errors detected in prod-us-east',
            sourceLineNumbers: [1],
            timeLostMinutes: 0
          },
          {
            timestamp: '10:05',
            author: 'Engineer',
            type: 'FALSE_LEAD',
            summary: 'Investigating database saturation',
            rawSnippet: 'Investigating database connection pool saturation',
            sourceLineNumbers: [2],
            timeLostMinutes: 5 // Model said 5
          },
          {
            timestamp: '10:20',
            author: 'Engineer',
            type: 'ROOT_CAUSE',
            summary: 'Third party webhook timeout isolated',
            rawSnippet: 'found third-party webhook timeout instead',
            sourceLineNumbers: [3],
            timeLostMinutes: 0
          },
          {
            timestamp: '10:35',
            author: 'Engineer',
            type: 'RESOLUTION',
            summary: 'Traffic recovered',
            rawSnippet: 'traffic recovered',
            sourceLineNumbers: [4],
            timeLostMinutes: 0
          }
        ],
        actionItems: [
          {
            priority: 'P0',
            action: 'Configure strict client timeout on partner webhook',
            owner: '@payments'
          }
        ],
        markdownReport: '# Postmortem Report\n\nCustom incident postmortem details.'
      };

      const fetchSpy = vi.fn().mockImplementation((url, options) => {
        // Assert endpoint does NOT contain ?key= in URL
        expect(url).toBe(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'
        );
        // Assert key is sent in x-goog-api-key header
        expect(options.headers['x-goog-api-key']).toBe('AIzaSyValidKey');
        expect(options.headers['Content-Type']).toBe('application/json');

        const parsedBody = JSON.parse(options.body);
        expect(parsedBody.generationConfig.responseMimeType).toBe('application/json');
        expect(parsedBody.generationConfig.temperature).toBe(0.2);
        expect(parsedBody.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(4096);

        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [{ text: JSON.stringify(mockIncidentPayload) }]
                }
              }
            ]
          })
        });
      });

      vi.stubGlobal('fetch', fetchSpy);

      const result = await synthesizeIncidentLogs(customLog, {
        apiKey: 'AIzaSyValidKey',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.mode).toBe('live_ai');

      // Check 0-based conversion of 1-based sourceLineNumbers [1] -> [0], [2] -> [1], etc.
      expect(result.incident.events[0].sourceLineIndices).toEqual([0]);
      expect(result.incident.events[1].sourceLineIndices).toEqual([1]);

      // Check that FALSE_LEAD at 10:05 followed by next event at 10:20 had timeLostMinutes recomputed from 5 to 15 (10:20 - 10:05 = 15)
      expect(result.incident.events[1].timeLostMinutes).toBe(15);

      // Check grounding: 10:00 matches line 0, 10:05 matches line 1, 10:20 matches line 2, 10:35 matches line 3
      expect(result.verification.grounded).toBe(4);
      expect(result.verification.total).toBe(4);
    });
  });
});
