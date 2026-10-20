import { describe, it, expect } from "vitest";
import { DEMO_PRESETS } from "./demoIncident";
import { verifyIncident } from "../services/verify";

describe("DEMO_PRESETS verification", () => {
  for (const preset of DEMO_PRESETS) {
    describe(`Preset: ${preset.id}`, () => {
      it("is 100% grounded with zero warnings", () => {
        const result = verifyIncident(preset.rawLog, preset.synthesizedData);
        expect(result.groundedCount).toBe(result.totalCount);
        expect(result.warnings).toEqual([]);
      });

      it("verifyIncident with recomputeTimeLost produces ZERO warnings and ttrMinutes equals computed TTR", () => {
        const recomputed = verifyIncident(preset.rawLog, preset.synthesizedData, {
          recomputeTimeLost: true,
        });
        expect(recomputed.warnings).toEqual([]);
        expect(preset.synthesizedData.executiveSummary.ttrMinutes).toBe(
          recomputed.incident.executiveSummary.ttrMinutes
        );
      });

      it("checks every FALSE_LEAD stored minutes equals the recompute", () => {
        const recomputed = verifyIncident(preset.rawLog, preset.synthesizedData, {
          recomputeTimeLost: true,
        });

        const falseLeads = preset.synthesizedData.events.filter(
          (e) => e.type === "FALSE_LEAD"
        );
        expect(falseLeads.length).toBeGreaterThan(0);

        for (const fl of falseLeads) {
          const recomputedEvent = recomputed.incident.events.find(
            (e) => e.id === fl.id
          );
          expect(recomputedEvent).toBeDefined();
          expect(fl.timeLostMinutes).toBe(recomputedEvent?.timeLostMinutes);
        }
      });

      it("checks triageTimeRatio equals round(sum of false-lead minutes / ttrMinutes, 2)", () => {
        const falseLeads = preset.synthesizedData.events.filter(
          (e) => e.type === "FALSE_LEAD"
        );
        const sumFalseLeadMinutes = falseLeads.reduce(
          (sum, e) => sum + (e.timeLostMinutes ?? 0),
          0
        );
        const expectedRatio =
          Math.round(
            (sumFalseLeadMinutes /
              preset.synthesizedData.executiveSummary.ttrMinutes) *
              100
          ) / 100;

        expect(preset.synthesizedData.executiveSummary.triageTimeRatio).toBe(
          expectedRatio
        );
      });

      it("checks the raw log contains no explicit duration claim matching /\\b\\d+\\s+minutes?\\b/i", () => {
        expect(preset.rawLog).not.toMatch(/\b\d+\s+minutes?\b/i);
      });

      it("checks that no event details in any preset contain 'Total duration'", () => {
        for (const event of preset.synthesizedData.events) {
          expect(event.details ?? "").not.toContain("Total duration");
        }
      });

      it("checks markdownReport includes the same TTR and false-lead minutes as structured fields", () => {
        const md = preset.synthesizedData.markdownReport;
        const ttr = preset.synthesizedData.executiveSummary.ttrMinutes;
        expect(md).toContain(`**Time to Resolve (TTR):** ${ttr} minutes`);

        const falseLeads = preset.synthesizedData.events.filter(
          (e) => e.type === "FALSE_LEAD"
        );
        for (const fl of falseLeads) {
          expect(md).toContain(`${fl.timeLostMinutes}m Lost`);
          expect(md).toContain(`${fl.timeLostMinutes} minutes`);
        }
      });
    });
  }
});
