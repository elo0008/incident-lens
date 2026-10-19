import { describe, it, expect } from "vitest";
import { validateInputLogs } from "./validator";

describe("validateInputLogs", () => {
  it("accepts [14:02 UTC] timestamp format", () => {
    const log = [
      "[14:02 UTC] Alert triggered in auth cluster",
      "[14:05 UTC] Investigating credential cache",
      "[14:10 UTC] Resolved cache exhaustion",
    ].join("\n");

    const result = validateInputLogs(log);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts 14:02:15 timestamp format", () => {
    const log = [
      "14:02:15 Alert triggered in payments",
      "14:05:30 Database latency spiked to 2.4s",
      "14:10:00 Pool size increased and recovered",
    ].join("\n");

    const result = validateInputLogs(log);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts 2026-10-19T14:02:00Z ISO-8601 timestamp format", () => {
    const log = [
      "2026-10-19T14:02:00Z Ingress proxy reporting 502 bad gateway",
      "2026-10-19T14:05:00Z Rerouting traffic through edge fallback",
      "2026-10-19T14:12:00Z Primary gateway back online",
    ].join("\n");

    const result = validateInputLogs(log);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts 2026-10-19 14:02 timestamp format", () => {
    const log = [
      "2026-10-19 14:02 High CPU utilization on worker nodes",
      "2026-10-19 14:06 Scaling out replica set",
      "2026-10-19 14:15 Load normalized across fleet",
    ].join("\n");

    const result = validateInputLogs(log);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts 02:03 PM 12-hour timestamp format", () => {
    const log = [
      "02:03 PM Alert triggered: customer checkout failing",
      "02:07 PM Rolling back deployment v3.4.1",
      "02:15 PM Checkout success rate returned to 99.9%",
    ].join("\n");

    const result = validateInputLogs(log);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a log that crosses midnight (23:58 then 00:04)", () => {
    const log = [
      "23:58 Memory pressure warning on node-1",
      "00:04 Failover completed to node-2 replica",
      "00:15 Cluster health check returned green",
    ].join("\n");

    const result = validateInputLogs(log);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects fewer than 3 non-empty lines with density error", () => {
    const expectedError =
      "Insufficient log density. Please provide at least 3 lines of incident messages.";

    // Empty string
    expect(validateInputLogs("")).toEqual({
      isValid: false,
      error: expectedError,
    });

    // 1 line
    expect(validateInputLogs("14:02 Alert triggered")).toEqual({
      isValid: false,
      error: expectedError,
    });

    // 2 lines with intervening whitespace lines
    const twoLines = "14:02 Alert triggered\n   \n\n14:05 Investigating";
    expect(validateInputLogs(twoLines)).toEqual({
      isValid: false,
      error: expectedError,
    });
  });

  it("rejects input with no recognizable timestamp at all", () => {
    const noTimestamps = [
      "Payment gateway reports degraded connectivity",
      "Engineer dispatched to inspect proxy settings",
      "Config change deployed and metrics stabilized",
    ].join("\n");

    const result = validateInputLogs(noTimestamps);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      'Unable to detect chronological timestamps. Please include timestamps (e.g. [14:02 UTC] or 14:02:11) or click "Load Demo Incident".'
    );
  });
});
