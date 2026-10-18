---
doc: scope
status: approved
---

# IncidentLens

A web-based incident postmortem timeline synthesizer that transforms chaotic chat logs and alert dumps into an audit-ready, interactive SRE timeline and postmortem document.

## The Unique Kernel
Most AI summarizers produce flat bullet lists. IncidentLens explicitly detects and visualizes **triage rabbit holes and false leads**—mapping when engineers chased the wrong hypothesis (e.g., suspected cache leaks), measuring the exact "time lost," and isolating the true root cause alongside a visual "Time Spent" triage efficiency bar.

## Who It's For
On-call engineers, tech leads, and SREs at startups and fast-moving engineering teams.
- **Current reality:** After an outage, they spend 1–2 agonizing hours scrolling back through frantic Slack/Discord channels, terminal snippets, and noisy bot alerts to manually piece together timestamps for the Post-Incident Review (PIR).
- **With IncidentLens:** They paste the raw log dump (or load a pre-set incident), click synthesize, and get a structured, time-stamped milestone timeline and an audit-ready markdown postmortem in seconds.

## The Core Loop
1. **Input:** The user pastes raw, messy incident logs into the left pane—or clicks the one-click demo button (**"Load Flash Sale Incident"**).
2. **Synthesize:** Clicks **"Synthesize Timeline"**. The engine extracts timestamps, classifies message types, flags rabbit holes with time-lost metrics, and pinpoints the root cause.
3. **Inspect & Review:** The right pane renders an interactive, color-coded node timeline:
   - Visual **"Time Spent"** triage breakdown bar (e.g., 35% Red Herrings vs. 65% Remediation).
   - Amber warning badges with dotted connector lines for **[False Lead / Rabbit Hole]** sub-threads.
   - Crimson/violet halo callout for the **[Root Cause Isolated]** milestone.
   - Green badge for **[Incident Mitigated / Resolved]**.
4. **Export:** The user clicks **"Export Postmortem (Markdown)"** to copy or download a clean SRE report ready for GitHub, Jira, or Notion.

## Inspiration & Identity
- **Aesthetic:** High-density, professional developer tool aesthetic (sleek dark mode, monospace accents, crisp status indicators, and clean typography). Inspired by modern observability tools like Datadog, Grafana, and Linear.
- **Mood:** Calm, authoritative, and audit-ready—turning chaos into immediate order.

## Why This Matters to the Learner
- Firsthand recognition that postmortems are critical for reliability but universally dreaded because log synthesis is painful manual labor.
- Opportunity to level up AI agent orchestration skills: mastering structured JSON schema extraction, deterministic prompt engineering, and building a clean, complex developer tool spec-first.

## What "Working" Looks Like
A crisp 60-second live demo:
1. Open IncidentLens in a browser.
2. Click **"Load Flash Sale Incident"** (loading 40+ chaotic messages of Datadog 504 alerts, engineer panic, and a 20-minute detour chasing a Redis memory leak).
3. Click **"Synthesize Timeline"**.
4. Within seconds, the UI renders the chronological node timeline with:
   - The top Time Spent breakdown bar.
   - An amber flagged rabbit hole sub-thread: *"False Lead: 18m spent chasing Redis cache saturation (Disproven at 14:22 UTC)"*.
   - The crimson root cause node: Third-party payment webhook timeout pool exhaustion.
   - The mitigation and resolution markers.
5. Click **"Copy SRE Postmortem"** and paste the formatted markdown showing a complete, publication-ready postmortem.

## The POC Boundary
- **In Scope (Now):**
  - Lightweight single-page web app built with React, Vite, and Tailwind CSS.
  - Two-pane dashboard: raw text/log input pane on the left, interactive timeline & preview pane on the right.
  - Realistic bundled demo scenario (*Payment Gateway 504 Spikes during Flash Sale* with 40+ messages).
  - Ability to paste custom text/logs.
  - LLM extraction pipeline with structured JSON schema (with an instant fallback demo mode for deterministic offline evaluation/demo recording).
  - Node-based timeline with visual badges: Critical Alert, False Lead / Rabbit Hole (with time lost), Root Cause Isolated, and Mitigation/Resolution.
  - Triage efficiency / Time Spent summary bar.
  - One-click Markdown postmortem generator & clipboard copy.

## Later
- Direct Slack / Discord OAuth webhook integration to import incident threads directly.
- Multi-incident workspace persistence and historical incident analytics (e.g., MTTR trends, recurring rabbit holes).
- Direct API export to Jira issues or Notion databases.

## Explicitly Cut
- **User authentication / Accounts:** Not needed for the core timeline extraction proof of concept; avoids setup friction.
- **Heavy backend database (Postgres/Supabase):** The PoC is completely client-driven and stateless; incident data lives in local session state.
- **Conversational chatbot / conversational back-and-forth:** IncidentLens is a deterministic synthesis tool, not a generic chat assistant.
