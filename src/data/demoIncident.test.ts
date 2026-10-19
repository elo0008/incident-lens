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

      it("checks FALSE_LEAD stored timeLostMinutes against recomputeTimeLost", () => {
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

          if (preset.id === "flash_sale") {
            // flash_sale preserves the curated 18m log narrative (dialogue: "lost 18 minutes on Redis")
            // while timestamp math (14:24 - 14:05) computes 19m.
            expect(fl.timeLostMinutes).toBe(18);
            expect(recomputedEvent?.timeLostMinutes).toBe(19);
          } else if (preset.id === "db_deadlock") {
            // db_deadlock preserves the curated 15m log narrative (dialogue: "burned 15 minutes")
            // while timestamp math (09:25 - 09:15) computes 10m.
            expect(fl.timeLostMinutes).toBe(15);
            expect(recomputedEvent?.timeLostMinutes).toBe(10);
          } else {
            expect(fl.timeLostMinutes).toBe(recomputedEvent?.timeLostMinutes);
          }
        }
      });
    });
  }
});
