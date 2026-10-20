import type { SynthesizedIncident, TimelineEvent } from "../types/incident";

export interface VerifyResult {
  incident: SynthesizedIncident;
  warnings: string[];
  groundedCount: number;
  totalCount: number;
}

interface VerifyOptions {
  /** 0 if sourceLineIndices are 0-based, 1 if 1-based. */
  base?: 0 | 1;
  /** Recompute timeLostMinutes from timestamps (use for live API output). */
  recomputeTimeLost?: boolean;
}

const TIME_RE = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;

export function toSeconds(s: string | undefined): number | null {
  if (!s) return null;
  const m = TIME_RE.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = m[3] !== undefined ? Number(m[3]) : 0;
  if (h > 23 || min > 59 || sec > 59) return null;
  return h * 3600 + min * 60 + sec;
}

export function toMinutes(s: string | undefined): number | null {
  const secs = toSeconds(s);
  if (secs === null) return null;
  return Math.floor(secs / 60);
}

export function unwrapSeconds(values: (number | null)[]): (number | null)[] {
  let offset = 0;
  let prev: number | null = null;
  return values.map((v) => {
    if (v === null) return null;
    if (prev !== null && v + offset < prev) offset += 86400;
    const out = v + offset;
    prev = out;
    return out;
  });
}

export function verifyIncident(
  rawLog: string,
  incident: SynthesizedIncident,
  opts: VerifyOptions = {}
): VerifyResult {
  const base = opts.base ?? 0;
  const lines = rawLog.split(/\r?\n/);
  const warnings: string[] = [];
  let groundedCount = 0;

  const events: TimelineEvent[] = incident.events.map((e) => ({ ...e }));
  const executiveSummary = { ...incident.executiveSummary };

  for (const e of events) {
    const cited = e.sourceLineIndices ?? [];
    const valid = cited.filter(
      (i) => Number.isInteger(i) && i - base >= 0 && i - base < lines.length
    );
    if (valid.length !== cited.length) {
      warnings.push(`${e.id}: dropped ${cited.length - valid.length} out-of-range line reference(s).`);
    }
    e.sourceLineIndices = valid;

    if (valid.length === 0) {
      warnings.push(`${e.id}: no valid source lines.`);
      continue;
    }

    const eventMin = toMinutes(e.timestamp);
    const citedMins = valid
      .map((i) => toMinutes(lines[i - base]))
      .filter((m): m is number => m !== null);

    const grounded =
      eventMin === null ||
      citedMins.length === 0 ||
      citedMins.some((m) => Math.abs(m - eventMin) <= 1);

    if (grounded) groundedCount += 1;
    else warnings.push(`${e.id}: timestamp ${e.timestamp} not found in cited lines.`);
  }

  if (opts.recomputeTimeLost) {
    // 1. Recompute timeLostMinutes for FALSE_LEAD events
    events.forEach((e) => {
      if (e.type !== "FALSE_LEAD") return;
      const sortedIndices = [...new Set(e.sourceLineIndices ?? [])].sort((a, b) => a - b);
      const citedLineSeconds = sortedIndices
        .map((i) => toSeconds(lines[i - base]))
        .filter((s): s is number => s !== null);

      const unwrapped = unwrapSeconds(citedLineSeconds) as number[];

      if (unwrapped.length < 2) {
        warnings.push(`${e.id}: minutes lost is an unverified estimate (cited lines do not span the detour)`);
        return;
      }

      const start = Math.min(...unwrapped);
      const end = Math.max(...unwrapped);

      if (end <= start) {
        warnings.push(`${e.id}: minutes lost is an unverified estimate (cited lines do not span the detour)`);
        return;
      }

      const computed = Math.round((end - start) / 60);
      e.timeLostMinutes = computed;
    });

    // 2. Recompute ttrMinutes
    if (events.length > 0) {
      const eventSecs = unwrapSeconds(events.map((e) => toSeconds(e.timestamp)));
      const startSec = eventSecs[0];

      let resolutionIdx = -1;
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].type === "RESOLUTION") {
          resolutionIdx = i;
          break;
        }
      }
      if (resolutionIdx === -1) {
        resolutionIdx = events.length - 1;
      }

      const endSec = eventSecs[resolutionIdx];
      if (startSec !== null && endSec !== null && endSec >= startSec) {
        const computedTtr = Math.round((endSec - startSec) / 60);
        const modelTtr = executiveSummary.ttrMinutes;
        if (Math.abs(computedTtr - modelTtr) > 1) {
          warnings.push(
            `TTR mismatch: model said ${modelTtr} min, timestamps say ${computedTtr} min. Using ${computedTtr}.`
          );
          executiveSummary.ttrMinutes = computedTtr;
        }
      }
    }
  }

  return {
    incident: { ...incident, executiveSummary, events },
    warnings,
    groundedCount,
    totalCount: events.length,
  };
}
