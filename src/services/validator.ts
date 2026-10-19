export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const TIMESTAMP_PATTERNS = [
  // Bracketed time formats: [14:02:11], [14:02 UTC], [14:02], [2026-10-19T14:02:00Z]
  /\[\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:UTC|GMT|Z|[A-Z]{2,4}))?\s*\]/i,
  // ISO-8601 variations: 2026-10-19T14:02:00Z, 2026-10-19 14:02, 2026-10-19T14:02
  /\b\d{4}-\d{2}-\d{2}[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/i,
  // 12-hour AM/PM formats: 02:03 PM, 2:03pm, [02:03 PM]
  /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)\b/i,
  // Time with timezone: 14:02 UTC, 14:02:15 GMT, 14:02 PST
  /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:UTC|GMT|Z|[A-Z]{3,4})\b/i,
  // Standard 24h clock with seconds: 14:02:15
  /\b\d{1,2}:\d{2}:\d{2}\b/,
  // Standard 24h clock: 23:58, 00:04, 14:02
  /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/
];

export function validateInputLogs(rawLog: string): ValidationResult {
  const lines = rawLog.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 3) {
    return {
      isValid: false,
      error: 'Insufficient log density. Please provide at least 3 lines of incident messages.'
    };
  }

  // Check if at least one timestamp pattern exists
  const hasTimestamp = lines.some((line) =>
    TIMESTAMP_PATTERNS.some((regex) => regex.test(line))
  );

  if (!hasTimestamp) {
    return {
      isValid: false,
      error:
        'Unable to detect chronological timestamps. Please include timestamps (e.g. [14:02 UTC] or 14:02:11) or click "Load Demo Incident".'
    };
  }

  return { isValid: true };
}
