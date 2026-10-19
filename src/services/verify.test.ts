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

  it("recomputeTimeLost: a FALSE_LEAD at 14:06 followed by an event at 14:29 gets timeLostMinutes = 23", () => {
    const rawLog = "[14:06] Detour on redis cache\n[14:29] Root cause identified";
    const incident = createMockIncident([
      {
        id: "evt-1",
        type: "FALSE_LEAD",
        timestamp: "14:06",
        timeLostMinutes: 10,
        sourceLineIndices: [0],
      },
      {
        id: "evt-2",
        type: "ROOT_CAUSE",
        timestamp: "14:29",
        sourceLineIndices: [1],
      },
    ]);

    const result = verifyIncident(rawLog, incident, {
      recomputeTimeLost: true,
      base: 0,
    });

    expect(result.incident.events[0].timeLostMinutes).toBe(23);
    expect(result.warnings).toContain(
      "evt-1: model said 10 min lost, timestamps say 23. Using 23."
    );
  });

  it("recomputeTimeLost across midnight (23:50 -> 00:10 gives 20)", () => {
    const rawLog = "[23:50] Midnight false lead\n[00:10] Resolved next day";
    const incident = createMockIncident([
      {
        id: "evt-1",
        type: "FALSE_LEAD",
        timestamp: "23:50",
        timeLostMinutes: 0,
        sourceLineIndices: [0],
      },
      {
        id: "evt-2",
        type: "RESOLUTION",
        timestamp: "00:10",
        sourceLineIndices: [1],
      },
    ]);

    const result = verifyIncident(rawLog, incident, {
      recomputeTimeLost: true,
      base: 0,
    });

    expect(result.incident.events[0].timeLostMinutes).toBe(20);
  });

  it("base: 1 treats indices as 1-based", () => {
    const rawLog = "Line 1: first\nLine 2: second\nLine 3: third";
    const incident = createMockIncident([
      {
        id: "evt-1",
        timestamp: "14:00",
        sourceLineIndices: [0, 1, 3, 4],
      },
    ]);

    const result = verifyIncident(rawLog, incident, { base: 1 });

    // With 3 lines and base: 1, valid indices are 1, 2, 3.
    // 0 is out-of-range (< 1) and 4 is out-of-range (> 3).
    expect(result.incident.events[0].sourceLineIndices).toEqual([1, 3]);
    expect(result.warnings).toContain(
      "evt-1: dropped 2 out-of-range line reference(s)."
    );
  });
});
