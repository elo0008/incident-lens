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

export const DEADLOCK_RAW_LOG = `[09:15:02] @datadog-bot: ALERT [P1] - Postgres Primary CPU at 98%, active connection count 1,980 / 2,000 max_connections
[09:15:35] @datadog-bot: ALERT [P1] - API Gateway HTTP 500 error rate spiked to 23.4% on /api/v2/transactions/commit
[09:16:10] @elena_oncall: Acknowledging P1. Traffic volume spiked from 12k req/sec to 45k req/sec in 90 seconds.
[09:17:05] @security_sam: Looking at Cloudflare edge logs. We're seeing thousands of concurrent POST requests with random user agents from suspicious ASN subnets. Could this be a Layer 7 DDoS attack?
[09:18:40] @elena_oncall: That explains the huge traffic spike! Enabling Under Attack mode on Cloudflare edge.
[09:20:15] @security_sam: Under Attack mode active. Challenge page enabled. But database active connections are still pinned at 2,000!
[09:22:30] @security_sam: Inspecting firewall drop counters... We dropped 80% of edge requests, yet API 500s are increasing, not decreasing!
[09:25:00] @security_sam: Digging into origin ingress... The traffic surge wasn't external hackers. It's legitimate client apps aggressively retrying failing transactions with zero exponential backoff!
[09:27:10] @david_dba: Joining bridge. It is NOT a DDoS attack. Cloudflare drops had zero effect because the bottleneck is internal. We lost 14 minutes chasing DDoS.
[09:28:45] @david_dba: Running pg_stat_activity query... Found 1,450 queries in 'idle in transaction' and 'exclusive lock' state waiting on PID 88412!
[09:30:20] @david_dba: ROOT CAUSE ISOLATED: A background billing migration job executed 'ALTER TABLE user_balances ADD COLUMN tax_exempt_status' without SHARE UPDATE EXCLUSIVE lock. It took an ACCESS EXCLUSIVE lock, blocking all balance updates!
[09:32:05] @elena_oncall: Who triggered that migration? It was supposed to run on the read-replica during the maintenance window!
[09:33:40] @david_dba: Cancelling blocking PID 88412 now: pg_terminate_backend(88412).
[09:35:15] @david_dba: Migration process killed. Waiting for Postgres transaction rollback to complete.
[09:37:00] @david_dba: Rollback finished. Queue of 1,450 locked transactions flushed through.
[09:38:20] @datadog-bot: RECOVERY - Postgres active connections returned to baseline (145 / 2,000)
[09:40:05] @datadog-bot: RECOVERY - HTTP 500 error rate dropped to 0.01%
[09:41:30] @elena_oncall: API latencies normal. Balance updates clearing without errors. Disabling Cloudflare Under Attack mode.
[09:43:00] @elena_oncall: Incident resolved at 09:43 UTC. Total duration: 28 minutes. Initiating postmortem review.`;

export const DEADLOCK_SYNTHESIZED_DATA: SynthesizedIncident = {
  executiveSummary: {
    title: "Database Lock Contention & Transaction Timeout Storm",
    impact: "23.4% of checkout commit requests failed with HTTP 500 over a 28-minute outage window.",
    ttdMinutes: 1,
    ttrMinutes: 28,
    triageTimeRatio: 0.50 // 14m lost out of 28m total
  },
  rootCause: {
    summary: "An unscheduled background billing migration executed 'ALTER TABLE user_balances' without a non-blocking safety wrapper. It acquired an ACCESS EXCLUSIVE table lock, blocking 1,450 concurrent transactions and exhausting the Postgres 2,000-connection limit. Unchecked client retries compounded the storm.",
    discoveredAt: "09:30 UTC",
    discoveredBy: "@david_dba"
  },
  events: [
    {
      id: "evt-dl-1",
      timestamp: "09:15 UTC",
      author: "Datadog-Bot",
      type: "CRITICAL_ALERT",
      summary: "Postgres primary CPU hit 98% and active connection pool saturated (1,980/2,000).",
      rawSnippet: "[09:15:02] @datadog-bot: ALERT [P1] - Postgres Primary CPU at 98%, active connection count 1,980 / 2,000",
      timeLostMinutes: 0,
      details: "HTTP 500 error rate spiked to 23.4% across payment and ledger commit routes.",
      sourceLineIndices: [0, 1]
    },
    {
      id: "evt-dl-2",
      timestamp: "09:16 UTC",
      author: "@elena_oncall",
      type: "TRIAGE",
      summary: "On-call acknowledges P1 outage; observes traffic volume surging from 12k to 45k req/sec.",
      rawSnippet: "[09:16:10] @elena_oncall: Acknowledging P1. Traffic volume spiked from 12k req/sec to 45k req/sec in 90 seconds.",
      timeLostMinutes: 0,
      details: "Rapid surge prompted initial suspicions of sudden external traffic abuse.",
      sourceLineIndices: [2]
    },
    {
      id: "evt-dl-3",
      timestamp: "09:17 UTC",
      author: "@security_sam & @elena_oncall",
      type: "FALSE_LEAD",
      summary: "False Lead: Investigated external Layer 7 DDoS attack and enabled Cloudflare Under Attack mode.",
      rawSnippet: "[09:17:05] @security_sam: Seeing thousands of concurrent POST requests... Could this be a Layer 7 DDoS attack?",
      timeLostMinutes: 14,
      details: "Team suspected volumetric Layer 7 DDoS attack and enabled aggressive edge challenge pages. Dropping 80% of traffic had zero impact on database lockup. Traffic burst was actually caused by internal client retries without jitter. 14 minutes lost.",
      sourceLineIndices: [3, 4, 5, 6, 7, 8]
    },
    {
      id: "evt-dl-4",
      timestamp: "09:28 UTC",
      author: "@david_dba",
      type: "TRIAGE",
      summary: "Database triage reveals 1,450 queries waiting on exclusive table lock behind PID 88412.",
      rawSnippet: "[09:28:45] @david_dba: Running pg_stat_activity query... Found 1,450 queries in 'idle in transaction' waiting on PID 88412!",
      timeLostMinutes: 0,
      details: "Database telemetry conclusively moved diagnosis from edge network to internal locking contention.",
      sourceLineIndices: [9]
    },
    {
      id: "evt-dl-5",
      timestamp: "09:30 UTC",
      author: "@david_dba",
      type: "ROOT_CAUSE",
      summary: "Root Cause Isolated: Unscheduled ALTER TABLE migration acquired ACCESS EXCLUSIVE lock on user_balances.",
      rawSnippet: "[09:30:20] @david_dba: ROOT CAUSE ISOLATED: A background billing migration job executed 'ALTER TABLE user_balances...'",
      timeLostMinutes: 0,
      details: "Migration ran without zero-downtime safety wrappers, locking all read/write balance transactions.",
      sourceLineIndices: [10, 11]
    },
    {
      id: "evt-dl-6",
      timestamp: "09:33 UTC",
      author: "@david_dba",
      type: "MITIGATION",
      summary: "Mitigation: Terminated blocking PID 88412 and rolled back migration transaction.",
      rawSnippet: "[09:33:40] @david_dba: Cancelling blocking PID 88412 now: pg_terminate_backend(88412).",
      timeLostMinutes: 0,
      details: "Terminated query process and allowed lock queue to clear gracefully without corrupting state.",
      sourceLineIndices: [12, 13, 14]
    },
    {
      id: "evt-dl-7",
      timestamp: "09:38 UTC",
      author: "@datadog-bot & @elena_oncall",
      type: "RESOLUTION",
      summary: "Incident Resolved: Postgres connection pool drained to baseline (145/2,000); errors cleared.",
      rawSnippet: "[09:38:20] @datadog-bot: RECOVERY - Postgres active connections returned to baseline (145 / 2,000)",
      timeLostMinutes: 0,
      details: "HTTP 500 error rate dropped to 0.01%. Under Attack mode disabled. Bridge closed at 09:43 UTC. Total duration: 28 minutes.",
      sourceLineIndices: [15, 16, 17, 18]
    }
  ],
  actionItems: [
    {
      priority: "P0",
      action: "Install pg-safe-migrations linter in CI to prohibit raw ACCESS EXCLUSIVE locks on production tables.",
      owner: "@dba-infra"
    },
    {
      priority: "P1",
      action: "Implement randomized exponential backoff with full jitter on client transaction retry logic to prevent retry storms.",
      owner: "@client-apps"
    },
    {
      priority: "P2",
      action: "Configure Datadog monitor alerting on transactions holding locks for greater than 5 seconds.",
      owner: "@sre-observability"
    }
  ],
  markdownReport: `# Incident Postmortem: Database Lock Contention & Transaction Timeout Storm

**Incident Date:** 2026-10-18  
**Severity:** P1 (Critical Outage)  
**Duration:** 28 minutes (09:15 UTC – 09:43 UTC)  
**Time to Detect (TTD):** 1 minute  
**Time to Resolve (TTR):** 28 minutes  
**Triage Efficiency Ratio:** 50% of incident duration spent investigating false lead (DDoS attack)

---

## Executive Summary
At 09:15 UTC, the primary Postgres database cluster experienced severe lock contention, with CPU hitting 98% and active connection counts reaching 1,980 out of the 2,000 maximum ceiling. As a result, 23.4% of API transaction commits failed with HTTP 500.

Triage initially burned 14 minutes chasing an assumed Layer 7 volumetric DDoS attack, enabling Cloudflare Under Attack challenge screens that had zero impact on error rates. Origin inspection subsequently revealed that the traffic spike was composed of client apps aggressively retrying failing transactions without backoff. DBA intervention at 09:28 UTC isolated an unscheduled background migration holding an \`ACCESS EXCLUSIVE\` lock on \`user_balances\`. Terminating the blocking PID restored full system stability by 09:43 UTC.

---

## Root Cause Analysis
- **Trigger:** An unscheduled background billing migration script executed \`ALTER TABLE user_balances ADD COLUMN tax_exempt_status\` directly against the production primary without concurrent table alteration protections.
- **Lock Contention:** The DDL acquired an \`ACCESS EXCLUSIVE\` lock on \`user_balances\`, blocking all inbound SELECT, INSERT, and UPDATE queries touching user balance state.
- **Thundering Herd:** As frontend requests timed out, client SDKs initiated aggressive un-jittered retries, multiplying traffic volume from 12k to 45k req/sec and rapidly exhausting the Postgres 2,000-connection limit.

---

## Chronological Timeline

| Time (UTC) | Severity / Type | Key Event | Notes / Attribution |
|---|---|---|---|
| **09:15** | \`CRITICAL_ALERT\` | Postgres CPU 98%, connections 1,980/2,000 | Datadog-Bot |
| **09:16** | \`TRIAGE\` | Traffic spikes from 12k to 45k req/sec | @elena_oncall |
| **09:17** | \`FALSE_LEAD\` | **14m Lost:** Investigated Layer 7 DDoS & enabled Cloudflare edge drops | @security_sam (Disproven at 09:27) |
| **09:28** | \`TRIAGE\` | \`pg_stat_activity\` shows 1,450 queries waiting on PID 88412 | @david_dba |
| **09:30** | \`ROOT_CAUSE\` | **Culprit Isolated:** Unscheduled ACCESS EXCLUSIVE lock on \`user_balances\` | @david_dba |
| **09:33** | \`MITIGATION\` | Terminated blocking query (\`pg_terminate_backend(88412)\`) | @david_dba |
| **09:38** | \`RESOLUTION\` | Connection pool drained to baseline, 500 errors dropped to 0.01% | @elena_oncall |

---

## Remediation & Action Items

- **[P0]** Install \`pg-safe-migrations\` linter in CI to prohibit raw ACCESS EXCLUSIVE locks on production tables (\`@dba-infra\`)
- **[P1]** Implement randomized exponential backoff with full jitter on client transaction retry logic to prevent retry storms (\`@client-apps\`)
- **[P2]** Configure Datadog monitor alerting on transactions holding locks for greater than 5 seconds (\`@sre-observability\`)
`
};

export interface DemoPreset {
  id: 'flash_sale' | 'db_deadlock';
  title: string;
  subtitle: string;
  summary: string;
  rawLog: string;
  synthesized: SynthesizedIncident;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'flash_sale',
    title: 'Flash Sale 504s',
    subtitle: 'Connection pool exhaustion; Redis detour',
    summary: 'Third-party webhook stall with 18m Redis rabbit hole',
    rawLog: DEMO_RAW_LOG,
    synthesized: DEMO_SYNTHESIZED_DATA
  },
  {
    id: 'db_deadlock',
    title: 'Database Deadlock',
    subtitle: 'Exclusive table lock; DDoS false alarm',
    summary: 'ALTER TABLE exclusive lock with 14m DDoS rabbit hole',
    rawLog: DEADLOCK_RAW_LOG,
    synthesized: DEADLOCK_SYNTHESIZED_DATA
  }
];
