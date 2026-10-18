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
   - **Triage Efficiency Bar:** A top summary bar visualizing the ratio between *Triage & Red Herrings* (e.g., 35% of outage) and *Actual Remediation*.
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
  - [ ] Computes and renders the top "Time Spent" triage efficiency bar showing triage/red herring duration vs. remediation duration.
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

## States and Boundaries

- **Empty State:** Left pane contains empty textarea with guide placeholder. Right pane shows dashed timeline skeleton with "No incident loaded" message and clickable demo button.
- **Loading / In-Flight State:** Left textarea is locked. "Synthesize Timeline" button displays spinning indicator. Right pane shows active 3-stage progress pulse with clear descriptive steps.
- **Success State:** Timeline renders fully populated with summary metrics, interactive nodes, and active view switcher.
- **Input Error State:** If text is invalid (under 3 lines or zero timestamps), displays a clear amber warning banner above the left pane: *"Unable to detect chronological timestamps. Please include timestamps (e.g., 14:02 UTC) or load a sample incident."* Raw text is preserved; no API call is triggered.
- **API Failure / Fallback State:** If the LLM request encounters a network or parsing failure, the UI surfaces a graceful error banner with an option to *"Use Pre-synthesized IncidentLens Demo Data"* to guarantee an uninterrupted demo experience.

## Product Decisions
- **Two-Pane Fixed Layout:** Chosen over a multi-page or wizard flow to keep the input logs and synthesized output directly visible side-by-side.
- **Pre-Validation on Client:** Checking for timestamp patterns before calling the LLM prevents wasted latency and confusing LLM hallucinations on blank/garbage input.
- **Traceability via Line Highlighting:** Prioritizing source-linking builds immediate trust with skeptical SREs who require verifiable audit trails.
- **Offline Demo Fallback:** Providing deterministic pre-synthesized fallback data ensures the 60-second video recording and judge evaluation will never break due to third-party API rate limits or latency spikes.

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
