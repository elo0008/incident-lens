import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getStoredAISettings,
  saveAISettings,
  getBlockingReason,
  synthesizeIncidentLogs,
  SynthesisError,
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  setRetryDelaysForTesting,
  resetRetryDelays,
  setFallbackModelForTesting,
  resetFallbackModel,
  setTimeoutForTesting,
  resetTimeout
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

describe('synthesisService (Google Gemini Provider & Resilience)', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    setRetryDelaysForTesting([0, 0]);
    resetFallbackModel();
    resetTimeout();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetRetryDelays();
    resetFallbackModel();
    resetTimeout();
    vi.restoreAllMocks();
  });

  describe('settings and storage isolation', () => {
    it('ignores old localStorage key incidentlens_ai_settings', () => {
      // Seed old OpenAI key in old storage key
      mockLocalStorage.setItem(
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

      expect(mockLocalStorage.getItem('incidentlens_ai_settings_v2')).toBeTruthy();
      expect(mockLocalStorage.getItem('incidentlens_ai_settings')).toBeNull();

      const loaded = getStoredAISettings();
      expect(loaded.apiKey).toBe('AIzaSyTestKey123');
      expect(loaded.provider).toBe('gemini');
      expect(loaded.model).toBe('gemini-3.6-flash');
    });

    it('falls back unknown stored models to DEFAULT_MODEL', () => {
      mockLocalStorage.setItem(
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

  describe('synthesizeIncidentLogs execution and resilience', () => {
    const customLog = [
      '10:00 Alert: Payment gateway 504 errors detected in prod-us-east',
      '10:05 Investigating database connection pool saturation as potential cause',
      '10:20 Database healthy; found third-party webhook timeout instead',
      '10:35 Webhook timeout circuit breaker applied and traffic recovered'
    ].join('\n');

    const validMockIncidentPayload = {
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
          sourceLineNumbers: [2, 3],
          timeLostMinutes: 5
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

    it('handles 503 then success on retry and returns result with primary model', async () => {
      let callCount = 0;
      const fetchSpy = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: { message: 'Model experiencing high demand' } })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify(validMockIncidentPayload) }] }
              }
            ]
          })
        });
      });

      vi.stubGlobal('fetch', fetchSpy);

      const result = await synthesizeIncidentLogs(customLog, {
        apiKey: 'AIzaSyValid',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.mode).toBe('live_ai');
      expect(result.model).toBe('gemini-3.6-flash');
      expect(result.verification.grounded).toBe(4);
    });

    it('handles 503 three times then success on the fallback model', async () => {
      let callCount = 0;
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        callCount++;
        if (callCount <= 3) {
          // 3 transient failures on primary model
          expect(url).toContain('gemini-3.6-flash');
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: { message: 'High demand' } })
          });
        }
        // 4th call on fallback model
        expect(url).toContain(FALLBACK_MODEL!);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify(validMockIncidentPayload) }] }
              }
            ]
          })
        });
      });

      vi.stubGlobal('fetch', fetchSpy);

      const result = await synthesizeIncidentLogs(customLog, {
        apiKey: 'AIzaSyValid',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });

      expect(fetchSpy).toHaveBeenCalledTimes(4);
      expect(result.mode).toBe('live_ai');
      expect(result.model).toBe(FALLBACK_MODEL);
    });

    it('throws overload SynthesisError when 503 persists on all attempts and fallback', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'Google raw error: backend overloaded' } })
      });

      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'AIzaSyValid',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow("Google's model is overloaded right now. Try again in a minute.");

      // 3 attempts on primary + 1 on fallback = 4 calls
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    // Test (a): primary 503 x3 then fallback 404 -> throws overload message, NOT 404 message
    it('throws overload message when primary returns 503 x3 and fallback returns 404', async () => {
      let callCount = 0;
      const fetchSpy = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: { message: 'High demand' } })
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ error: { message: 'Model not found' } })
        });
      });

      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'AIzaSyValid',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow("Google's model is overloaded right now. Try again in a minute.");

      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    // Test (b): FALLBACK_MODEL null -> exactly 3 fetch calls on persistent 503
    it('makes exactly 3 fetch calls on persistent 503 when FALLBACK_MODEL is null', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'High demand' } })
      });

      vi.stubGlobal('fetch', fetchSpy);
      setFallbackModelForTesting(null);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'AIzaSyValid',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow("Google's model is overloaded right now. Try again in a minute.");

      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    // Test (c): timeout/abort on the first attempt then success on retry returns a result
    it('retries when first attempt times out and returns result on successful retry', async () => {
      let callCount = 0;
      const fetchSpy = vi.fn().mockImplementation((_url, options) => {
        callCount++;
        if (callCount === 1) {
          return new Promise((_, reject) => {
            if (options?.signal?.aborted) {
              reject(new DOMException('The user aborted a request.', 'AbortError'));
              return;
            }
            options?.signal?.addEventListener('abort', () => {
              reject(new DOMException('The user aborted a request.', 'AbortError'));
            });
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                finishReason: 'STOP',
                content: { parts: [{ text: JSON.stringify(validMockIncidentPayload) }] }
              }
            ]
          })
        });
      });

      vi.stubGlobal('fetch', fetchSpy);

      setTimeoutForTesting(10);

      const result = await synthesizeIncidentLogs(customLog, {
        apiKey: 'AIzaSyValid',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.mode).toBe('live_ai');
      expect(result.model).toBe('gemini-3.6-flash');
    });

    // Test (d): primary 404 message includes the model name and fetch is called once
    it('includes model name in primary 404 error message and calls fetch once', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({})
      });
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('Gemini model "gemini-3.6-flash" was not found for this API key (HTTP 404).');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry 429 quota exhaustion (called exactly once)', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({})
      });

      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'AIzaSyValid',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow(
        'Google Gemini quota or rate limit reached (HTTP 429). Please try again later or check your Google AI Studio quota.'
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry 403 permission denied (called exactly once)', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Permission denied' } })
      });

      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'AIzaSyValid',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow(
        'Google denied access (HTTP 403). The API key may be invalid or restricted, or the Gemini API may not be enabled for it. Check the key in Settings.'
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('handles network / browser CORS rejection after retries', async () => {
      const fetchSpy = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'AIzaSyTest',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow(
        "Could not reach Google's API (network or browser CORS error). Check your connection and try again."
      );

      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it('handles HTTP 400 with invalid API key error without retry', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 400,
            message: 'API key not valid. Please pass a valid API key.',
            status: 'INVALID_ARGUMENT'
          }
        })
      });
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'bad-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('Google rejected the API key. Check it in Settings.');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('handles HTTP 400 other error including API message without retry', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 400,
            message: 'Request payload contains unsupported field',
            status: 'INVALID_ARGUMENT'
          }
        })
      });
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        synthesizeIncidentLogs(customLog, {
          apiKey: 'test-key',
          provider: 'gemini',
          model: 'gemini-3.6-flash'
        })
      ).rejects.toThrow('Google API error (HTTP 400): Request payload contains unsupported field');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
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
      const fetchSpy = vi.fn().mockImplementation((url, options) => {
        expect(url).toBe(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'
        );
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
                  parts: [{ text: JSON.stringify(validMockIncidentPayload) }]
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
      expect(result.model).toBe('gemini-3.6-flash');

      // Check 0-based conversion of 1-based sourceLineNumbers [1] -> [0], [2, 3] -> [1, 2], etc.
      expect(result.incident.events[0].sourceLineIndices).toEqual([0]);
      expect(result.incident.events[1].sourceLineIndices).toEqual([1, 2]);

      // Check that FALSE_LEAD citing 10:05 and 10:20 had timeLostMinutes recomputed from 5 to 15 (10:20 - 10:05 = 15)
      expect(result.incident.events[1].timeLostMinutes).toBe(15);

      // Check grounding: 10:00 matches line 0, 10:05 matches line 1, 10:20 matches line 2, 10:35 matches line 3
      expect(result.verification.grounded).toBe(4);
      expect(result.verification.total).toBe(4);
    });

    it('normalizes actionItem owners and post-processes markdownReport to strip unverified metrics and insert computed Key metrics block', async () => {
      const mockPayload = {
        executiveSummary: {
          title: 'Custom Gateway Latency Spike',
          impact: 'Payment 504 timeouts on checkout',
          ttdMinutes: 5,
          ttrMinutes: 35,
          triageTimeRatio: 0.69
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
            sourceLineNumbers: [2, 3],
            timeLostMinutes: 15
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
            action: 'Fix connection pools',
            owner: 'cart-service-team'
          },
          {
            priority: 'P1',
            action: 'Update timeout configs',
            owner: '@oncall'
          }
        ],
        markdownReport: [
          '# Incident Postmortem: Gateway Latency',
          '',
          '- **Duration:** 99 minutes',
          '- **Triage Time Ratio:** 0.69',
          '- **Time to Detect:** 5 minutes',
          '',
          '## Executive Summary',
          'Traffic was impacted during the promotional window.',
          '',
          '## Timeline',
          'At 10:00, alerts fired.'
        ].join('\n')
      };

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [{ text: JSON.stringify(mockPayload) }]
              }
            }
          ]
        })
      });
      vi.stubGlobal('fetch', fetchSpy);

      const testLog = [
        '10:00 Alert: Payment gateway 504 errors detected in prod-us-east',
        '10:05 @oncall: Investigating database connection pool saturation as potential cause',
        '10:20 @oncall: Database healthy; found third-party webhook timeout instead',
        '10:35 @oncall: Webhook timeout circuit breaker applied and traffic recovered'
      ].join('\n');

      const result = await synthesizeIncidentLogs(testLog, {
        apiKey: 'AIzaSyValidKey',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      });

      // 1. Verify owner normalization: not in log -> "unassigned", in log -> preserved
      expect(result.incident.actionItems[0].owner).toBe('unassigned');
      expect(result.incident.actionItems[1].owner).toBe('@oncall');

      // 2. Verify markdown post-processing: unverified metrics stripped
      expect(result.incident.markdownReport).not.toContain('99 minutes');
      expect(result.incident.markdownReport).not.toContain('0.69');
      expect(result.incident.markdownReport).not.toContain('Time to Detect:');

      // 3. Verify Key metrics block inserted with values computed from the log
      expect(result.incident.markdownReport).toContain('**Key metrics (computed from log timestamps):**');
      expect(result.incident.markdownReport).toContain('- Duration: 35 minutes (10:00 to 10:35)');
      expect(result.incident.markdownReport).toContain('- Time to resolve: 35 minutes');
      expect(result.incident.markdownReport).toContain('- Minutes lost on wrong turns: 15 minutes');
      expect(result.incident.markdownReport).toContain('- Share of incident lost on wrong turns: 43%');

      // 4. Verify original timeline text is preserved
      expect(result.incident.markdownReport).toContain('## Timeline');
      expect(result.incident.markdownReport).toContain('At 10:00, alerts fired.');
    });
  });
});
