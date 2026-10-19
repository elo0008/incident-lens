export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const TIMESTAMP_REGEXES = [
  /\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:UTC|GMT|Z))?\]/i, // [14:02:11] or [14:02 UTC]
  /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:UTC|GMT|Z|AM|PM|EST|PST|PDT|EDT)\b/i, // 14:02 UTC or 2:05 PM
  /\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?\b/, // 2026-10-18T14:02
  /\b\d{1,2}:\d{2}:\d{2}\b/ // 14:02:11
];

export function validateInputLogs(rawLog: string): ValidationResult {
  const trimmed = rawLog.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Log stream is empty. Paste incident messages or click "Load Demo Incident".'
    };
  }

  const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 3) {
    return {
      isValid: false,
      error: 'Insufficient log density. Please provide at least 3 lines of incident messages.'
    };
  }

  // Check if at least one timestamp pattern exists
  const hasTimestamp = lines.some(line =>
    TIMESTAMP_REGEXES.some(regex => regex.test(line))
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
