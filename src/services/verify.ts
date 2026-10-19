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

function toMinutes(s: string | undefined): number | null {
  if (!s) return null;
  const m = TIME_RE.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function unwrap(values: (number | null)[]): (number | null)[] {
  let offset = 0;
  let prev: number | null = null;
  return values.map((v) => {
    if (v === null) return null;
    if (prev !== null && v + offset < prev) offset += 1440;
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
    const mins = unwrap(events.map((e) => toMinutes(e.timestamp)));
    events.forEach((e, idx) => {
      if (e.type !== "FALSE_LEAD") return;
      const start = mins[idx];
      const end = mins.slice(idx + 1).find((m) => m !== null) ?? null;
      if (start === null || end === null) return;
      const computed = end - start;
      if (computed >= 0 && computed !== e.timeLostMinutes) {
        if (e.timeLostMinutes !== undefined) {
          warnings.push(`${e.id}: model said ${e.timeLostMinutes} min lost, timestamps say ${computed}. Using ${computed}.`);
        }
        e.timeLostMinutes = computed;
      }
    });
  }

  return {
    incident: { ...incident, events },
    warnings,
    groundedCount,
    totalCount: events.length,
  };
}
