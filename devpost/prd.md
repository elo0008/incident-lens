---
doc: prd
status: approved
---

# IncidentLens — Product Requirements

A web-based incident postmortem timeline synthesizer that transforms chaotic chat logs and alert dumps into an audit-ready, interactive SRE timeline and postmortem document.
Source: `scope.md > The Core Loop`, `scope.md > The Unique Kernel`.

## The Core Journey
1. **Arrival & Initial State:** The user lands on a two-pane dashboard in a high-density, charcoal/slate dark theme. The left pane contains an empty text editor with placeholder instructions and a prominent **"Load Demo Incident"** action button. The right pane displays a subtle dashed-line timeline blueprint with a call-to-action to paste logs or load the demo.
2. **Input / Sample Loading:** The user clicks **"Load Demo Incident"**, which pre-populates the left pane with the realistic "Payment Gateway 504 Spikes during Flash Sale" scenario (40+ lines of Datadog alerts, engineer triage chatter, a 20-minute detour chasing Redis memory saturation, and eventual isolation of third-party webhook connection pool exhaustion). Alternatively, the user pastes their own raw incident logs.
3. **Execution & In-Flight State:** The user clicks **"Synthesize Timeline"**. The button enters a loading state with an active spinner, and the right pane displays an animated 3-stage progress pulse:
   - *Phase 1:* "Extracting messages and normalizing timestamps..."
   - *Phase 2:* "Isolating root cause and identifying false lead detours..."
   - *Phase 3:* "Assembling chronological timeline & SRE postmortem..."
4. **Interactive Timeline Inspection:** The right pane transitions smoothly into the synthesized **Timeline View**:
   - **Triage Efficiency Bar:** A top summary bar visualizing the ratio between *Lost on wrong turns* (e.g., 35% of outage) and *Rest of the incident*.
   - **Chronological Node Cards:** High-density milestone cards with normalized timestamps (UTC), author tags, and severity badges (`[Critical Alert]`, `[Mitigation Attempt]`, `[Incident Resolved]`).
   - **False Lead / Rabbit Hole Callouts:** Rendered with amber warning badges, dotted connector lines, and explicit callouts (*"Investigated: Redis cache saturation. Disproven at 14:22 UTC. Time lost: 18 mins"*).
   - **Root Cause Milestone:** Rendered with a prominent crimson/violet halo badge (`[Root Cause Isolated]`) with author attribution and discovery details.
5. **Cross-Pane Source Traceability:** Clicking any timeline node highlights the exact corresponding raw text line(s) in the left editor pane, allowing instant verification of source chat logs.
6. **Postmortem Export & Verification:** The user clicks the **[Postmortem Markdown]** toggle to preview the generated SRE postmortem document (Executive Summary, Impact, Timeline, Root Cause, Action Items). Clicking **[Copy Markdown]** copies the formatted text to the clipboard and flashes a green checkmark confirmation (*"Copied to Clipboard!"*).

## Screens and Layout
- **Single-Screen Two-Pane Layout:**
  - **Top Navigation Bar:** IncidentLens logo/title, active status indicator, and instant **"Load Demo Incident"** trigger.
  - **Left Pane (Input Surface):**
    - Header with line/character counter and a **"Clear"** button.
    - Full-height raw log editor textarea (monospace font).
    - Inline validation banner at top of pane for unparseable input.
    - Sticky bottom action bar with primary **"Synthesize Timeline"** button.
  - **Right Pane (Synthesis & Output Surface):**
    - Header with segmented view switcher: **`[Timeline View]`** and **`[Postmortem Markdown]`**, alongside persistent **`[Copy Markdown]`** button.
    - Dynamic main viewport rendering either the Empty State blueprint, the 3-Stage Loading Stepper, the Interactive Node Timeline, or the Formatted Markdown Preview.

## Look and Feel
- **Visual Theme:** High-density, professional developer tool aesthetic (Linear meets Grafana).
- **Palette:** Deep slate and charcoal background palette (`#0B0F19` background, `#111827` surface panels, `#1F2937` borders).
- **Accents:**
  - Amber (`#F59E0B` / `#D97706`): `[False Lead / Rabbit Hole]` badges and dotted connector threads.
  - Crimson/Violet (`#EF4444` / `#8B5CF6`): `[Root Cause Isolated]` highlight halo and key discovery markers.
  - Emerald (`#10B981`): `[Resolution / Mitigated]` badges and copy-success confirmation.
  - Cyan / Slate (`#06B6D4` / `#64748B`): Timestamps, system alert badges, and metadata tags.
- **Typography:** Modern clean sans-serif (Inter) for UI chrome and controls; crisp monospace (JetBrains Mono / Fira Code) for timestamps, raw logs, author handles, and code snippets.
- **Strictly Avoided:** No floating chatbot widgets, no pastel AI sparkles/gradients, no generic pill buttons, and no multi-step modal wizards.

## Features and Behavior

### 1. Raw Log Ingestion & Validation
- As an SRE, I want to paste raw, unformatted incident chat and alert logs so that I don't have to clean them up manually.
  - [ ] Accepts multiline raw text containing timestamps, usernames, and alert snippets.
  - [ ] "Load Demo Incident" immediately injects the 40+ line Flash Sale incident dataset.
  - [ ] If input is fewer than 3 lines or has no discernable timestamps, blocks synthesis and displays an inline warning banner without making API calls.

### 2. Timeline Synthesis & Rabbit Hole Detection
- As an incident commander, I want to clearly distinguish false leads from the true root cause so that the postmortem reveals where engineering time was lost.
  - [ ] Normalizes mixed timestamp formats into consistent chronological order.
  - [ ] Computes and renders the top "Time Spent" triage efficiency bar showing duration lost on wrong turns vs. the rest of the incident.
  - [ ] Classifies events into typed nodes: Critical Alert, Triage / Investigation, False Lead, Root Cause, Mitigation, and Resolution.
  - [ ] Flags false leads with amber badges, dotted connector styling, and calculated "Time lost" duration.
  - [ ] Highlights the root cause node with a distinctive crimson/violet halo.

### 3. Source Traceability
- As a postmortem reviewer, I want to see the exact chat message behind every milestone so that I can audit the AI's inference.
  - [ ] Clicking any milestone card in the timeline highlights the corresponding line(s) in the left raw log editor.

### 4. SRE Postmortem Markdown Generation
- As an engineer, I want an audit-ready Markdown postmortem document ready for GitHub, Jira, or Notion with one click.
  - [ ] Generates standard SRE postmortem sections: Summary, Impact, Timeline Table, Root Cause Analysis, and Remediation Items.
  - [ ] Toggle switch allows inspecting rendered markdown directly in the right pane.
  - [ ] Clicking "Copy Markdown" writes the raw markdown to clipboard and temporarily flashes visual confirmation.

### 5. Honest Analysis & Verifiable Traceability (Slice 6)
- As an SRE or evaluator testing IncidentLens, I want guaranteed truth in advertising and strict verification so that custom logs are never given fabricated output and every milestone is genuinely traced to source lines.
  - [ ] **Sample Mode Boundary:** When no API key is provided, the app operates strictly in "Sample mode" and analyzes ONLY the built-in sample incidents. Pasting any unrecognized/custom log displays an inline amber warning banner: *"Sample mode only analyzes the 2 built-in incidents. To analyze your own log, add a Gemini API key in Settings (gear icon)."* Synthesis is blocked immediately—no timeline is generated and no loading card is shown.
  - [ ] **Removal of Synthetic Generator:** The generic offline synthesizer that invented arbitrary events for custom logs is permanently removed (superseding the earlier "Deterministic Offline Fallback" decision).
  - [ ] **Explicit API Error Surfaces (Google Gemini):** Live analysis uses Google Gemini REST API (`generateContent` with a free-tier key from Google AI Studio). Invalid key (400/403), quota exhaustion (429), model-not-found (404), network/CORS errors, and blocked/empty responses each display a specific, informative error message and never produce a timeline or silently fall back to canned data.
  - [ ] **Settings Modal Privacy Disclaimer:** The settings modal warns that free-tier Gemini API requests may be used by Google to improve its products, advising users not to paste confidential or proprietary logs.
  - [ ] **Numbered Line Prompting & Verification Engine:** The live AI prompt numbers each log line and instructs the model to cite exact line numbers for each event. A verification step verifies every milestone: cited line numbers must exist in the raw log, and the milestone timestamp must match a cited line within 1 minute.
  - [ ] **Deterministic Metric Calculation & Detour Math:** Time lost for false leads is calculated from the earliest to latest timestamp among cited lines with timestamps, and TTR is recomputed from first to resolution milestone. Overall triage efficiency ratio is calculated deterministically.
  - [ ] **Live Postmortem Metric Stripping & Owner Sanitization:** Unverified model-written duration/TTD/TTR/ratio lines are stripped and replaced with an authoritative "Key metrics (computed from log timestamps)" block. Action item owners not present in the log become "unassigned".
  - [ ] **Estimated Live TTD Chip:** Live TTD is displayed as an estimate (`~Xm`) with an informative tooltip.
  - [ ] **Grounded Traceability Badge:** The UI displays a live verification badge: `N/M milestones traced to log lines` computed by the verify step.
  - [ ] **Engine Badge Accuracy & UI Cleanup:** Engine badge explicitly shows one of three states: *"Sample mode"*, *"Live AI ready"*, or *"Live AI"*. Configuration is streamlined strictly to Gemini.
  - [ ] **Left-Aligned Inspect View:** RawLogEditor inspect view enforces `text-left` alignment for clean monospace log scanning.
  - [ ] **Plain-English Intro Banner:** A one-line plain-English explainer sits above the two panes until an incident synthesis result is actively displayed on screen.

## States and Boundaries

- **Empty State:** Left pane contains empty textarea with guide placeholder. Right pane shows dashed timeline skeleton with "No incident loaded" message and clickable demo button.
- **Loading / In-Flight State:** Left textarea is locked. "Synthesize Timeline" button displays spinning indicator. Right pane shows active 3-stage progress pulse with clear descriptive steps.
- **Success State:** Timeline renders fully populated with summary metrics, interactive nodes, and active view switcher.
- **Input Error State:** If text is invalid (under 3 lines or zero timestamps), displays a clear amber warning banner above the left pane: *"Unable to detect chronological timestamps. Please include timestamps (e.g., 14:02 UTC) or load a sample incident."* Raw text is preserved; no API call is triggered.
- **Sample Mode Custom Log Boundary State:** In Sample mode (no API key), pasting custom logs displays an amber banner directing the user to add a Gemini API key in Settings, with no loading pulse or fake timeline generation.
- **API Failure State:** If a live Gemini request fails (invalid key, 429 quota exhaustion, 404 model-not-found, network/CORS error, blocked/empty response, or invalid JSON), displays a specific diagnostic error banner explaining the exact failure. It never produces a timeline or silently falls back to canned data.

## Product Decisions
- **Two-Pane Fixed Layout:** Chosen over a multi-page or wizard flow to keep the input logs and synthesized output directly visible side-by-side.
- **Pre-Validation on Client:** Checking for timestamp patterns before calling the LLM prevents wasted latency and confusing LLM hallucinations on blank/garbage input.
- **Traceability via Line Highlighting:** Prioritizing source-linking builds immediate trust with skeptical SREs who require verifiable audit trails.
- **Sample Mode for Built-In Incidents Only:** Preserves 100% dependable zero-key demonstrations using verified sample incidents, while establishing honest boundaries for arbitrary user inputs.

## Decision Log

### Oct 19, 2026 — Honest Analysis Over Fabricated Fallbacks
- **Context:** Reviewers and hackathon judges may paste their own raw incident logs into the editor without entering an API key, or with an invalid key.
- **Decision:** Remove the generic offline synthesizer that invented arbitrary events for custom logs, and restrict Sample mode strictly to the built-in sample incidents. When a live API call fails, display the specific error rather than silently falling back to canned data.
- **Reasoning:** Fabricating synthetic events for arbitrary logs directly contradicts IncidentLens's core promise—that every milestone is genuinely grounded in the source log. Grounding verification and truthful failure modes build authentic engineering trust.

### Oct 19, 2026 — Switch Live Analysis Provider to Google Gemini (Free Tier)
- **Context:** The project has no OpenAI API credits, making it impossible for the author to test and verify the live analysis pathway.
- **Decision:** Switch live dynamic analysis to Google Gemini (REST `generateContent` with free-tier keys from Google AI Studio). OpenAI support is removed entirely rather than kept alongside. Update sample-mode guidance and settings to refer to Gemini API keys, and add a clear privacy warning in settings that Google AI Studio free-tier requests may be used by Google to improve its products.
- **Risk Note & 2-Hour Timebox:** If live Gemini calls cannot be made to work directly from the browser within a 2-hour timebox (due to CORS, endpoint, or environment limitations), the project will ship strictly in sample-only mode and state so honestly in the README and hackathon submission.

### Oct 20, 2026 — Honest Efficiency Bar Labels
- **Decision:** Rename efficiency bar segments from "Triage & Red Herrings" / "Active Remediation" to "Lost on wrong turns" / "Rest of the incident", because the first segment measures strictly time spent on FALSE_LEAD detours while the second encompasses all other incident time (including detection, triage, and root cause diagnosis, not solely remediation).

## What We're Building
- Single-page React/Vite/Tailwind dashboard with two-pane layout.
- High-density dark theme with monospace typography and color-coded status badges.
- Pre-loaded "Payment Gateway 504 Spikes" 40+ line realistic incident dataset.
- Real-time client-side input validation.
- 3-stage animated in-flight loading pulse.
- Structured timeline visualization with triage ratio bar, false lead sub-threads, and root cause halo.
- Cross-pane node-to-source line highlighting.
- Postmortem Markdown preview tab and clipboard export with visual feedback.
- Deterministic fallback mode for zero-fail demos.

## Deferred From the POC
- **Live Slack/Discord Webhooks:** Deferred to keep the POC completely standalone without requiring OAuth permissions or bot installations.
- **Customizable Postmortem Templates:** Deferred; the POC uses standard Google/PagerDuty-style SRE postmortem structure.
- **Multi-Incident Historical Database:** Out of scope for this bite-sized hackathon; incident state lives in memory for the active session.

## Possible Later Enhancements
- Interactive node editing: Allow engineers to manually re-classify a milestone or adjust the time-lost calculation before export.
- Slack App integration: `/incidentlens summarize` bot command to synthesize the active channel thread directly into Slack.

## Non-Goals
- Generic chatbot conversation interface (IncidentLens is a deterministic synthesis dashboard).
- Complex multi-tenant user authentication or database management.
- Real-time live log streaming / automated PagerDuty alert polling.

## Open Questions
- None blocking spec approval; LLM structured schema and exact UI component breakdown will be formalized in `4-spec`.
