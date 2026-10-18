import { SynthesizedIncident } from '../types/incident';

export const DEMO_RAW_LOG = `[14:02:11] @datadog-bot: ALERT [P1] - PaymentService p99 latency > 4200ms (threshold: 800ms) in us-east-1
[14:02:45] @datadog-bot: ALERT [P1] - HTTP 504 Gateway Timeout rate spiked to 14.2% on /v1/checkout/charge
[14:03:15] @marcus_oncall: Acknowledging. Opening incident bridge. Flash sale launched 3 mins ago, traffic is 4x baseline.
[14:04:02] @sarah_sre: Joining bridge. Looking at Datadog APM dashboard. Checkout service pod CPU is only at 28%.
[14:05:10] @marcus_oncall: Seeing elevated errors in stripe-proxy and checkout-worker. Could it be Redis?
[14:06:20] @alex_backend: Redis memory alerts tripped earlier today on staging. Let me check the prod cluster.
[14:07:35] @alex_backend: Looking at redis-cluster-primary. Memory usage is 89%. Eviction rate is climbing!
[14:09:00] @marcus_oncall: That might be it! Are sessions getting dropped because Redis is thrashing?
[14:11:15] @alex_backend: Running redis-cli INFO stats... Keyspace hits are falling. We might be bottlenecked on cache lookups.
[14:13:40] @marcus_oncall: Should we scale the Redis node group or flush the transient rate-limit keys?
[14:16:05] @alex_backend: Preparing script to flush non-critical session cache keys and scale to r6g.2xlarge.
[14:19:20] @sarah_sre: Wait before flushing! Look at Redis latency metrics—p99 response time is 1.2ms. That is completely normal.
[14:21:40] @alex_backend: Double checking... Wait, the memory usage is stable at 89% because maxmemory is configured to 90%. No OOM evictions.
[14:22:15] @sarah_sre: Disproven: Redis is totally healthy. We lost 18 minutes on Redis. Let's look upstream at egress connections.
[14:24:00] @marcus_oncall: Back to square one. Payment pods are still spewing 504s. Node event loop lag is 450ms!
[14:25:30] @sarah_sre: Checking netstat on checkout-service-78f99-x2k41. TIME_WAIT connections to external IPs are maxed out (65k).
[14:27:12] @sarah_sre: Inspecting outbound sockets... 92% of active sockets are hanging on api.fastpay-partner.net (fraud validation webhook).
[14:28:45] @sarah_sre: ROOT CAUSE FOUND: FastPay fraud webhook latency surged to 8.5 seconds. Our HTTP client has default 30s timeout and a pool limit of 500 connections. Every checkout worker is completely saturated waiting on FastPay!
[14:30:10] @marcus_oncall: Confirmed. FastPay status page just updated: 'Degraded performance in North America API gateway.'
[14:31:30] @sarah_sre: Mitigation proposal: Enable the circuit breaker feature flag \`FLAG_BYPASS_FRAUD_WEBHOOK_ON_TIMEOUT\` with a 1200ms fallback.
[14:33:00] @alex_backend: Applying ConfigMap update to set FASTPAY_TIMEOUT_MS=1200 and enable circuit breaker.
[14:35:15] @alex_backend: Rolling restart triggered for checkout-service pods across us-east-1.
[14:37:40] @marcus_oncall: New pods are coming up healthy. Active socket count dropped from 65k to 1,200.
[14:39:10] @datadog-bot: RECOVERY - PaymentService p99 latency returned to 340ms (below threshold 800ms)
[14:41:00] @datadog-bot: RECOVERY - HTTP 504 error rate dropped to 0.04%
[14:42:30] @sarah_sre: Latency nominal, 504s eliminated, all queued orders processing. Incident mitigated.
[14:44:00] @marcus_oncall: Closing incident bridge at 14:44 UTC. Total duration: 42 minutes. Moving to postmortem timeline drafting.`;

export const DEMO_SYNTHESIZED_DATA: SynthesizedIncident = {
  executiveSummary: {
    title: "Payment Gateway 504 Spikes during Flash Sale",
    impact: "12% of checkout transactions timed out over a 42-minute window during peak flash sale traffic.",
    ttdMinutes: 3,
    ttrMinutes: 42,
    triageTimeRatio: 0.43 // 18m out of 42m spent in triage rabbit hole
  },
  rootCause: {
    summary: "Third-party fraud verification webhook (FastPay) latency spiked to 8.5s. Uncapped 30s client timeout and fixed 500-connection socket pool exhausted all Node.js outbound connections, causing cascading 504 Gateway Timeouts across the checkout service.",
    discoveredAt: "14:28 UTC",
    discoveredBy: "@sarah_sre"
  },
  events: [
    {
      id: "evt-1",
      timestamp: "14:02 UTC",
      author: "Datadog-Bot",
      type: "CRITICAL_ALERT",
      summary: "PaymentService p99 latency threshold breached (>4200ms) with 14.2% 504 Gateway Timeouts.",
      rawSnippet: "[14:02:11] @datadog-bot: ALERT [P1] - PaymentService p99 latency > 4200ms",
      timeLostMinutes: 0,
      details: "Spike coincides exactly with scheduled 14:00 Flash Sale traffic burst (4x baseline).",
      sourceLineIndices: [0, 1]
    },
    {
      id: "evt-2",
      timestamp: "14:03 UTC",
      author: "@marcus_oncall",
      type: "TRIAGE",
      summary: "Incident bridge opened; on-call triage begins.",
      rawSnippet: "[14:03:15] @marcus_oncall: Acknowledging. Opening incident bridge.",
      timeLostMinutes: 0,
      details: "Triage engineers note checkout pods CPU is low (28%), ruling out compute exhaustion.",
      sourceLineIndices: [2, 3]
    },
    {
      id: "evt-3",
      timestamp: "14:05 UTC",
      author: "@alex_backend",
      type: "FALSE_LEAD",
      summary: "False Lead: Investigated Redis cluster memory saturation and eviction thrashing.",
      rawSnippet: "[14:05:10] @marcus_oncall: Seeing elevated errors in stripe-proxy... Could it be Redis?",
      timeLostMinutes: 18,
      details: "Team suspected Redis cache thrashing due to 89% memory metric. Disproven at 14:22 UTC when latency metrics showed 1.2ms nominal response and stable maxmemory threshold. 18 minutes lost.",
      sourceLineIndices: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    },
    {
      id: "evt-4",
      timestamp: "14:24 UTC",
      author: "@sarah_sre",
      type: "TRIAGE",
      summary: "Egress socket inspection reveals 65,000 hanging TIME_WAIT outbound connections.",
      rawSnippet: "[14:25:30] @sarah_sre: Checking netstat on checkout-service... TIME_WAIT connections to external IPs are maxed out (65k)",
      timeLostMinutes: 0,
      details: "Netstat analysis shifted focus from internal infrastructure to external third-party dependencies.",
      sourceLineIndices: [14, 15, 16]
    },
    {
      id: "evt-5",
      timestamp: "14:28 UTC",
      author: "@sarah_sre",
      type: "ROOT_CAUSE",
      summary: "Root Cause Isolated: FastPay fraud webhook latency surged, exhausting Node.js connection pool.",
      rawSnippet: "[14:28:45] @sarah_sre: ROOT CAUSE FOUND: FastPay fraud webhook latency surged to 8.5 seconds.",
      timeLostMinutes: 0,
      details: "92% of hanging sockets were waiting on api.fastpay-partner.net with 30s timeouts. FastPay confirms API gateway degradation.",
      sourceLineIndices: [17, 18]
    },
    {
      id: "evt-6",
      timestamp: "14:31 UTC",
      author: "@sarah_sre & @alex_backend",
      type: "MITIGATION",
      summary: "Mitigation: Enabled timeout circuit breaker (1200ms fallback) and rolling restarted pods.",
      rawSnippet: "[14:31:30] @sarah_sre: Mitigation proposal: Enable the circuit breaker feature flag... [14:35:15] @alex_backend: Rolling restart triggered",
      timeLostMinutes: 0,
      details: "ConfigMap updated with FASTPAY_TIMEOUT_MS=1200. Sockets dropped from 65k to 1,200 within 2 minutes.",
      sourceLineIndices: [19, 20, 21, 22]
    },
    {
      id: "evt-7",
      timestamp: "14:42 UTC",
      author: "@datadog-bot & @sarah_sre",
      type: "RESOLUTION",
      summary: "Incident Resolved: p99 latency returned to 340ms, 504 error rate dropped to 0.04%.",
      rawSnippet: "[14:42:30] @sarah_sre: Latency nominal, 504s eliminated, all queued orders processing. Incident mitigated.",
      timeLostMinutes: 0,
      details: "Full resolution verified across all metrics. Bridge closed at 14:44 UTC. Total duration: 42 minutes.",
      sourceLineIndices: [23, 24, 25, 26]
    }
  ],
  actionItems: [
    {
      priority: "P0",
      action: "Set strict 800ms client-side timeout and non-blocking circuit breaker on FastPay fraud validation endpoint.",
      owner: "@checkout-core"
    },
    {
      priority: "P1",
      action: "Implement separate HTTP agent connection pools per outbound third-party vendor so slow partners cannot exhaust global socket capacity.",
      owner: "@platform-infra"
    },
    {
      priority: "P2",
      action: "Add Datadog synthetic monitors alerting specifically on external vendor webhook p95 latency.",
      owner: "@sre-observability"
    }
  ],
  markdownReport: `# Incident Postmortem: Payment Gateway 504 Spikes during Flash Sale

**Incident Date:** 2026-10-18  
**Severity:** P1 (Critical Outage)  
**Duration:** 42 minutes (14:02 UTC – 14:44 UTC)  
**Time to Detect (TTD):** 3 minutes  
**Time to Resolve (TTR):** 42 minutes  
**Triage Efficiency Ratio:** 43% of incident duration spent investigating false lead (Redis)

---

## Executive Summary
At 14:02 UTC, coinciding with the launch of the promotional Flash Sale (4x baseline traffic), the checkout service began experiencing severe latency degradation, with p99 response times climbing from 350ms to 4200ms and HTTP 504 Gateway Timeout rates peaking at 14.2%. 

Initial triage spent 18 minutes investigating an alleged Redis memory exhaustion rabbit hole before network telemetry confirmed that outbound sockets were saturated by an upstream degradation at our third-party fraud validation provider (FastPay). Implementing an automated circuit breaker and reducing client timeouts to 1200ms restored nominal performance by 14:42 UTC.

---

## Root Cause Analysis
- **Trigger:** FastPay North America API gateway experienced unannounced latency degradation, causing webhook responses to stall for 8.5 seconds.
- **Vulnerability:** The \`checkout-service\` utilized a shared global HTTP connection pool (500 maximum sockets) with an uncapped 30-second default request timeout.
- **Cascade:** The 4x traffic burst rapidly queued hundreds of concurrent checkout transactions waiting on FastPay, exhausting the entire Node.js socket pool and blocking all subsequent HTTP requests, manifesting as cascading 504s to end customers.

---

## Chronological Timeline

| Time (UTC) | Severity / Type | Key Event | Notes / Attribution |
|---|---|---|---|
| **14:02** | \`CRITICAL_ALERT\` | PaymentService p99 > 4.2s alert fired | Datadog-Bot |
| **14:03** | \`TRIAGE\` | Incident bridge established | @marcus_oncall |
| **14:05** | \`FALSE_LEAD\` | **18m Lost:** Investigated Redis memory & evictions | @alex_backend (Disproven at 14:22) |
| **14:25** | \`TRIAGE\` | Socket inspection revealed 65k hanging TIME_WAITs | @sarah_sre |
| **14:28** | \`ROOT_CAUSE\` | **Culprit Isolated:** FastPay webhook latency (8.5s) | @sarah_sre |
| **14:31** | \`MITIGATION\` | Deployed 1200ms timeout & circuit breaker | @alex_backend |
| **14:42** | \`RESOLUTION\` | Errors returned to 0.04%, p99 < 350ms | @sarah_sre |

---

## Remediation & Action Items

- **[P0]** Set strict 800ms client timeout with fail-open circuit breaker on FastPay webhook (\`@checkout-core\`)
- **[P1]** Isolate third-party HTTP connection pools per external vendor (\`@platform-infra\`)
- **[P2]** Add dedicated Datadog synthetic monitors for external API latency (\`@sre-observability\`)
`
};
