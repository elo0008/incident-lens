import { SynthesizedIncident } from '../types/incident';

export interface IncidentPreset {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  rawLog: string;
  synthesizedData: SynthesizedIncident;
}

// ---------------------------------------------------------
// PRESET 1: Flash Sale 504s (Connection pool exhaustion; Redis detour)
// ---------------------------------------------------------
const FLASH_SALE_RAW_LOG = `[14:02:11] @datadog-bot: ALERT [P1] - PaymentService p99 latency > 4200ms (threshold: 800ms) in us-east-1
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
[14:22:15] @sarah_sre: Disproven: Redis is totally healthy. We lost a lot of time on Redis. Let's look upstream at egress connections.
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
[14:44:00] @marcus_oncall: Closing incident bridge at 14:44 UTC. Moving to postmortem timeline drafting.`;

const FLASH_SALE_SYNTHESIS: SynthesizedIncident = {
  executiveSummary: {
    title: "Payment Gateway 504 Spikes during Flash Sale",
    impact: "12% of checkout transactions timed out over a 40-minute window during peak flash sale traffic.",
    ttdMinutes: 3,
    ttrMinutes: 40,
    triageTimeRatio: 0.43 // 17m out of 40m spent in triage rabbit hole
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
      timeLostMinutes: 17,
      details: "Team suspected Redis cache thrashing due to 89% memory metric. Disproven at 14:22 UTC when latency metrics showed 1.2ms nominal response and stable maxmemory threshold. 17 minutes lost.",
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
      details: "Full resolution verified across all metrics. Resolved at 14:42 UTC, 40 minutes after the first alert; bridge closed at 14:44 UTC.",
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
**Duration:** 40 minutes (14:02 UTC – 14:42 UTC)  
**Time to Detect (TTD):** 3 minutes  
**Time to Resolve (TTR):** 40 minutes  
**Triage Efficiency Ratio:** 43% of incident duration spent investigating false lead (Redis)

---

## Executive Summary
At 14:02 UTC, coinciding with the launch of the promotional Flash Sale (4x baseline traffic), the checkout service began experiencing severe latency degradation, with p99 response times climbing from 350ms to 4200ms and HTTP 504 Gateway Timeout rates peaking at 14.2%. 

Initial triage spent 17 minutes investigating an alleged Redis memory exhaustion rabbit hole before network telemetry confirmed that outbound sockets were saturated by an upstream degradation at our third-party fraud validation provider (FastPay). Implementing an automated circuit breaker and reducing client timeouts to 1200ms restored nominal performance by 14:42 UTC.

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
| **14:05** | \`FALSE_LEAD\` | **17m Lost:** Investigated Redis memory & evictions | @alex_backend (Disproven at 14:22) |
| **14:24** | \`TRIAGE\` | Socket inspection revealed 65k hanging TIME_WAITs | @sarah_sre |
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

// ---------------------------------------------------------
// PRESET 2: Database Deadlock (Exclusive table lock; DDoS false alarm)
// ---------------------------------------------------------
const DB_DEADLOCK_RAW_LOG = `[09:12:05] @pagerduty-bot: [CRITICAL] Postgres order-db-primary write transaction lock count > 4,500
[09:12:35] @datadog-bot: ALERT - API Gateway POST /v2/orders p99 latency spiked to 28.5s (threshold: 400ms)
[09:13:30] @dave_oncall: Acknowledging. Ingress requests are stalling across all checkout endpoints.
[09:14:15] @sam_security: Seeing massive spike in incoming connection requests from foreign ASN ranges.
[09:15:10] @dave_oncall: Could we be under a Layer 7 DDoS flood targeting the orders endpoint?
[09:16:45] @sam_security: Reviewing Cloudflare WAF analytics. Ingress request volume is 3x 10-minute average.
[09:18:20] @dave_oncall: Let's enable Cloudflare 'Under Attack' mode and enable JS challenge rate-limiting on /v2/orders.
[09:20:00] @sam_security: Cloudflare Under Attack mode active. Challenging 100% of untrusted traffic.
[09:21:40] @dave_oncall: Checking origin ingress... Traffic dropped by 45%, but database locks are still climbing! Currently 5,200 waiting.
[09:23:15] @sam_security: Still seeing 504s. The origin server CPU is completely idle at 12%. This doesn't behave like a volumetric DDoS.
[09:25:30] @elena_db: Joining bridge. Looking directly at pg_stat_activity on order-db-primary.
[09:27:10] @elena_db: Wait, this is NOT a DDoS! Cloudflare challenge was a false lead. We burned a lot of time blocking legitimate customers.
[09:28:40] @elena_db: ROOT CAUSE FOUND: PID 89412 is running \`ALTER TABLE orders ADD COLUMN fulfillment_notes TEXT DEFAULT ''\`.
[09:29:25] @elena_db: The migration acquired an AccessExclusiveLock without a lock_timeout. Every single INSERT and UPDATE is queued behind PID 89412!
[09:30:50] @dave_oncall: Who ran that migration during morning peak hours?
[09:31:15] @elena_db: Background batch job from inventory-sync deploy.
[09:32:15] @elena_db: MITIGATION: Executing \`SELECT pg_terminate_backend(89412);\` to kill the blocking DDL statement immediately.
[09:33:00] @elena_db: Terminated PID 89412. Table lock released!
[09:34:40] @dave_oncall: Backlog is draining fast. Active locks dropped from 5,200 to 14 in under 30 seconds.
[09:36:20] @sam_security: Disabling Cloudflare 'Under Attack' mode. Legitimate traffic resuming normally.
[09:38:50] @datadog-bot: RECOVERY - API Gateway POST /v2/orders p99 latency dropped to 42ms
[09:40:10] @pagerduty-bot: RESOLVED - Postgres order-db-primary write transaction lock count nominal (0 waiting)
[09:41:00] @dave_oncall: All systems fully recovered. Zero dropped transactions; queued orders processed. Closing bridge at 09:41 UTC.`;

const DB_DEADLOCK_SYNTHESIS: SynthesizedIncident = {
  executiveSummary: {
    title: "Database Deadlock on Orders Table during Migration",
    impact: "100% of order creation transactions blocked for 26 minutes; 12 minutes lost chasing DDoS false alarm.",
    ttdMinutes: 2,
    ttrMinutes: 26,
    triageTimeRatio: 0.46 // 12m out of 26m lost
  },
  rootCause: {
    summary: "Unindexed schema migration (ALTER TABLE orders) acquired an unbounded AccessExclusiveLock without a lock_timeout, cascading into a complete write-queue deadlock across 5,200 transactions. Misidentified initially as an external L7 DDoS attack.",
    discoveredAt: "09:28 UTC",
    discoveredBy: "@elena_db"
  },
  events: [
    {
      id: "evt-db-1",
      timestamp: "09:12 UTC",
      author: "PagerDuty-Bot",
      type: "CRITICAL_ALERT",
      summary: "Postgres write transaction lock queue breached critical threshold (>4,500 locks).",
      rawSnippet: "[09:12:05] @pagerduty-bot: [CRITICAL] Postgres order-db-primary write transaction lock count > 4,500",
      timeLostMinutes: 0,
      details: "Spike tripped immediately as all worker write transactions queued behind locked orders table.",
      sourceLineIndices: [0, 1]
    },
    {
      id: "evt-db-2",
      timestamp: "09:13 UTC",
      author: "@dave_oncall",
      type: "TRIAGE",
      summary: "Incident bridge established; API gateway order endpoint response times climb to 28.5s.",
      rawSnippet: "[09:13:30] @dave_oncall: Acknowledging. Ingress requests are stalling across all checkout endpoints.",
      timeLostMinutes: 0,
      details: "Engineers observe cascading 504 errors across all checkout and order placement routes.",
      sourceLineIndices: [2, 3]
    },
    {
      id: "evt-db-3",
      timestamp: "09:15 UTC",
      author: "@sam_security",
      type: "FALSE_LEAD",
      summary: "False Lead: Investigated Layer 7 DDoS attack; enabled Cloudflare 'Under Attack' JS challenge mode.",
      rawSnippet: "[09:15:10] @dave_oncall: Could we be under a Layer 7 DDoS flood targeting the orders endpoint?",
      timeLostMinutes: 12,
      details: "Security team misdiagnosed high connection queues as an external volumetric flood. Spent 12 minutes investigating WAF telemetry and challenging valid users while database deadlocks mounted. 12 minutes lost.",
      sourceLineIndices: [4, 5, 6, 7, 8, 9, 10, 11]
    },
    {
      id: "evt-db-4",
      timestamp: "09:25 UTC",
      author: "@elena_db",
      type: "TRIAGE",
      summary: "Database engineer joins; pg_stat_activity reveals 5,200 queries waiting on exclusive table lock.",
      rawSnippet: "[09:25:30] @elena_db: Joining bridge. Looking directly at pg_stat_activity on order-db-primary.",
      timeLostMinutes: 0,
      details: "Telemetry definitively disproved external DDoS: origin CPU was 12% and network nominal.",
      sourceLineIndices: [10, 11]
    },
    {
      id: "evt-db-5",
      timestamp: "09:28 UTC",
      author: "@elena_db",
      type: "ROOT_CAUSE",
      summary: "Root Cause Isolated: PID 89412 running unindexed ALTER TABLE held AccessExclusiveLock without lock_timeout.",
      rawSnippet: "[09:28:40] @elena_db: ROOT CAUSE FOUND: PID 89412 is running `ALTER TABLE orders ADD COLUMN fulfillment_notes...`",
      timeLostMinutes: 0,
      details: "Background inventory-sync deploy executed DDL migration during peak traffic without lock_timeout, blocking all concurrent transactions.",
      sourceLineIndices: [12, 13, 14, 15]
    },
    {
      id: "evt-db-6",
      timestamp: "09:32 UTC",
      author: "@elena_db",
      type: "MITIGATION",
      summary: "Mitigation: Terminated blocking PID via pg_terminate_backend; lock count plummeted from 5,200 to 14.",
      rawSnippet: "[09:32:15] @elena_db: MITIGATION: Executing `SELECT pg_terminate_backend(89412);` to kill the blocking DDL statement immediately.",
      timeLostMinutes: 0,
      details: "Terminating PID 89412 released AccessExclusiveLock immediately. Backlog drained within 30 seconds.",
      sourceLineIndices: [16, 17, 18, 19]
    },
    {
      id: "evt-db-7",
      timestamp: "09:38 UTC",
      author: "@datadog-bot & @pagerduty-bot",
      type: "RESOLUTION",
      summary: "Incident Resolved: Write latencies returned to 42ms; lock count cleared to 0.",
      rawSnippet: "[09:38:50] @datadog-bot: RECOVERY - API Gateway POST /v2/orders p99 latency dropped to 42ms",
      timeLostMinutes: 0,
      details: "Zero lost or corrupted orders; all queued transactions successfully committed. Resolved at 09:38 UTC, 26 minutes after the first alert; bridge closed at 09:41 UTC.",
      sourceLineIndices: [20, 21, 22]
    }
  ],
  actionItems: [
    {
      priority: "P0",
      action: "Set mandatory `SET lock_timeout = '2s';` on all automated migration runners and DDL scripts.",
      owner: "@db-platform"
    },
    {
      priority: "P1",
      action: "Add Postgres lock-wait APM telemetry to PagerDuty with automatic offending PID attribution.",
      owner: "@sre-core"
    },
    {
      priority: "P2",
      action: "Deploy CI/CD linting rule blocking non-concurrent DDL operations on production tables >500k rows.",
      owner: "@infra-devops"
    }
  ],
  markdownReport: `# Incident Postmortem: Database Deadlock on Orders Table during Migration

**Incident Date:** 2026-10-19  
**Severity:** P1 (Critical Outage)  
**Duration:** 26 minutes (09:12 UTC – 09:38 UTC)  
**Time to Detect (TTD):** 2 minutes  
**Time to Resolve (TTR):** 26 minutes  
**Triage Efficiency Ratio:** 46% of incident duration spent investigating false lead (Cloudflare DDoS)

---

## Executive Summary
At 09:12 UTC, Postgres database telemetry alerted on severe write transaction queuing on \`order-db-primary\`, with over 4,500 queries stalled and API Gateway POST latency breaching 28.5 seconds. 

Initial triage misdiagnosed the incoming connection buildup as an external Layer 7 DDoS attack, burning 12 minutes enabling strict Cloudflare challenges. Subsequent database telemetry isolated the true root cause: an unindexed schema migration triggered by an automated inventory-sync deployment held an unbounded \`AccessExclusiveLock\` on the orders table. Terminating the blocking migration PID cleared the 5,200 transaction backlog within 30 seconds and fully restored nominal latencies.

---

## Root Cause Analysis
- **Trigger:** Automated inventory sync job executed \`ALTER TABLE orders ADD COLUMN fulfillment_notes TEXT DEFAULT ''\` during peak morning write traffic.
- **Vulnerability:** PostgreSQL DDL migrations ran without an explicit \`lock_timeout\` configuration, allowing exclusive lock requests to wait indefinitely.
- **Cascade:** Every subsequent INSERT and UPDATE query queued behind the exclusive lock request, exhausting database connection pools and manifesting as 504 timeouts at the ingress API gateway.

---

## Chronological Timeline

| Time (UTC) | Severity / Type | Key Event | Notes / Attribution |
|---|---|---|---|
| **09:12** | \`CRITICAL_ALERT\` | Postgres write locks > 4,500 alert fired | PagerDuty-Bot |
| **09:13** | \`TRIAGE\` | Incident bridge established; API latencies stall | @dave_oncall |
| **09:15** | \`FALSE_LEAD\` | **12m Lost:** Investigated L7 DDoS; enabled Cloudflare challenges | @sam_security (Disproven at 09:27) |
| **09:25** | \`TRIAGE\` | pg_stat_activity reveals 5,200 queries waiting on table lock | @elena_db |
| **09:28** | \`ROOT_CAUSE\` | **Culprit Isolated:** Unindexed ALTER TABLE held AccessExclusiveLock | @elena_db |
| **09:32** | \`MITIGATION\` | Terminated PID 89412 via pg_terminate_backend | @elena_db |
| **09:38** | \`RESOLUTION\` | Lock count dropped to 0, p99 latency returned to 42ms | @datadog-bot |

---

## Remediation & Action Items

- **[P0]** Set mandatory \`SET lock_timeout = '2s';\` on all automated migration runners and DDL scripts (\`@db-platform\`)
- **[P1]** Add Postgres lock-wait APM telemetry to PagerDuty with automatic offending PID attribution (\`@sre-core\`)
- **[P2]** Deploy CI/CD linting rule blocking non-concurrent DDL operations on production tables >500k rows (\`@infra-devops\`)
`
};

export const DEMO_PRESETS: IncidentPreset[] = [
  {
    id: "flash_sale",
    name: "Flash Sale 504s",
    subtitle: "Connection Pool Exhaustion • Redis Detour",
    badge: "Egress / Networking",
    rawLog: FLASH_SALE_RAW_LOG,
    synthesizedData: FLASH_SALE_SYNTHESIS
  },
  {
    id: "db_deadlock",
    name: "Database Deadlock",
    subtitle: "Exclusive Table Lock • DDoS False Alarm",
    badge: "Database / Migration",
    rawLog: DB_DEADLOCK_RAW_LOG,
    synthesizedData: DB_DEADLOCK_SYNTHESIS
  }
];

export const DEMO_RAW_LOG = DEMO_PRESETS[0].rawLog;
export const DEMO_SYNTHESIZED_DATA = DEMO_PRESETS[0].synthesizedData;
