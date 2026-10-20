import { describe, it, expect } from "vitest";
import { verifyIncident } from "./verify";
import type { SynthesizedIncident, TimelineEvent } from "../types/incident";

function createMockIncident(events: Partial<TimelineEvent>[]): SynthesizedIncident {
  return {
    executiveSummary: {
      title: "Test Incident",
      impact: "Production impacted",
      ttdMinutes: 2,
      ttrMinutes: 30,
      triageTimeRatio: 0.4,
    },
    rootCause: {
      summary: "Database deadlock",
      discoveredAt: "14:29",
      discoveredBy: "@oncall",
    },
    events: events.map((e, idx) => ({
      id: e.id ?? `evt-${idx + 1}`,
      timestamp: e.timestamp ?? "14:00",
      author: e.author ?? "@engineer",
      type: e.type ?? "TRIAGE",
      summary: e.summary ?? `Event ${idx + 1}`,
      rawSnippet: e.rawSnippet ?? "Snippet",
      sourceLineIndices: e.sourceLineIndices ?? [0],
      timeLostMinutes: e.timeLostMinutes,
      ...e,
    })),
    actionItems: [],
    markdownReport: "# Postmortem",
  };
}

describe("verifyIncident", () => {
  it("an out-of-range line index is dropped and produces a warning", () => {
    const rawLog = "Line 0: alert\nLine 1: triage\nLine 2: resolution";
    const incident = createMockIncident([
      {
        id: "evt-1",
        timestamp: "14:00",
        sourceLineIndices: [1, 99, -5],
      },
    ]);

    const result = verifyIncident(rawLog, incident, { base: 0 });

    expect(result.incident.events[0].sourceLineIndices).toEqual([1]);
    expect(result.warnings).toContain(
      "evt-1: dropped 2 out-of-range line reference(s)."
    );
  });

  it("an event whose timestamp is absent from every cited timestamped line is NOT counted as grounded", () => {
    const rawLog = "[14:00] Alert fired\n[14:05] Checking database\n[14:10] Investigating";
    const incident = createMockIncident([
      {
        id: "evt-1",
        timestamp: "14:30",
        sourceLineIndices: [0, 1],
      },
    ]);

    const result = verifyIncident(rawLog, incident, { base: 0 });

    expect(result.groundedCount).toBe(0);
    expect(result.warnings).toContain(
      "evt-1: timestamp 14:30 not found in cited lines."
    );
  });

  it("an event with a matching timestamp (within 1 minute) IS grounded", () => {
    const rawLog = "[14:05:40] Investigating cache metrics";
    const incident = createMockIncident([
      {
        id: "evt-1",
        timestamp: "14:06",
        sourceLineIndices: [0],
      },
    ]);

    const result = verifyIncident(rawLog, incident, { base: 0 });

    expect(result.groundedCount).toBe(1);
    expect(
      result.warnings.some((w) => w.includes("not found in cited lines"))
    ).toBe(false);
  });

  it("recomputeTimeLost: false lead citing lines stamped 16:46:00 and 16:54:30 gives 9 (8m30s rounds up)", () => {
    const rawLog = "[16:46:00] Suspected Kafka consumer lag\n[16:50:00] Investigating offset commits\n[16:54:30] Disproven: Kafka offsets nominal";
    const incident = createMockIncident([
      {
        id: "evt-1",
        type: "FALSE_LEAD",
        timestamp: "16:46:00",
        timeLostMinutes: 4,
        sourceLineIndices: [0, 2],
      },
      {
        id: "evt-2",
        type: "RESOLUTION",
        timestamp: "17:16:00",
        sourceLineIndices: [2],
      },
    ]);

    const result = verifyIncident(rawLog, incident, {
      recomputeTimeLost: true,
      base: 0,
    });

    expect(result.incident.events[0].timeLostMinutes).toBe(9);
  });

  it("recomputeTimeLost: a single cited line keeps the model's estimate and adds the warning", () => {
    const rawLog = "[14:05:00] Single cited line for false lead\n[14:20:00] Next event";
    const incident = createMockIncident([
      {
        id: "evt-1",
        type: "FALSE_LEAD",
        timestamp: "14:05:00",
        timeLostMinutes: 12,
        sourceLineIndices: [0],
      },
      {
        id: "evt-2",
        type: "RESOLUTION",
        timestamp: "14:35:00",
        sourceLineIndices: [1],
      },
    ]);

    const result = verifyIncident(rawLog, incident, {
      recomputeTimeLost: true,
      base: 0,
    });

    expect(result.incident.events[0].timeLostMinutes).toBe(12);
    expect(result.warnings).toContain(
      "evt-1: minutes lost is an unverified estimate (cited lines do not span the detour)"
    );
  });

  it("recomputeTimeLost across midnight: 23:58 -> 00:06 gives 8", () => {
    const rawLog = "[23:58] Suspecting replica sync stall\n[00:06] Disproven: replica caught up";
    const incident = createMockIncident([
      {
        id: "evt-1",
        type: "FALSE_LEAD",
        timestamp: "23:58",
        timeLostMinutes: 0,
        sourceLineIndices: [0, 1],
      },
      {
        id: "evt-2",
        type: "RESOLUTION",
        timestamp: "00:28",
        sourceLineIndices: [1],
      },
    ]);

    const result = verifyIncident(rawLog, incident, {
      recomputeTimeLost: true,
      base: 0,
    });

    expect(result.incident.events[0].timeLostMinutes).toBe(8);
  });

  it("recomputeTimeLost: a TTR mismatch is corrected and warned", () => {
    const rawLog = "[10:00] First alert\n[10:15] Triage\n[10:45] Issue resolved";
    const incident = createMockIncident([
      {
        id: "evt-1",
        type: "CRITICAL_ALERT",
        timestamp: "10:00",
        sourceLineIndices: [0],
      },
      {
        id: "evt-2",
        type: "TRIAGE",
        timestamp: "10:15",
        sourceLineIndices: [1],
      },
      {
        id: "evt-3",
        type: "RESOLUTION",
        timestamp: "10:45",
        sourceLineIndices: [2],
      },
    ]);
    // Model estimated 20m, but 10:45 - 10:00 = 45m (differs by > 1)
    incident.executiveSummary.ttrMinutes = 20;

    const result = verifyIncident(rawLog, incident, {
      recomputeTimeLost: true,
      base: 0,
    });

    expect(result.incident.executiveSummary.ttrMinutes).toBe(45);
    expect(result.warnings).toContain(
      "TTR mismatch: model said 20 min, timestamps say 45 min. Using 45."
    );
  });

  it("base: 1 treats indices as 1-based", () => {
    const rawLog = "Line 1: first\nLine 2: second\nLine 3: third";
    const incident = createMockIncident([
      {
        id: "evt-1",
        timestamp: "14:00",
        sourceLineIndices: [1],
      },
    ]);

    const result = verifyIncident(rawLog, incident, { base: 1 });

    expect(result.incident.events[0].sourceLineIndices).toEqual([1]);
    expect(result.warnings).toEqual([]);
  });
});
