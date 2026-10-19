---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Bootstrap project shell & render interactive timeline kernel with demo incident**
  Becomes usable: A running dark-mode two-pane app where clicking "Load Demo Incident" loads the Flash Sale incident into the editor, clicking "Synthesize Timeline" runs the synthesis pipeline, and immediately renders the unique kernel: the Triage Efficiency ratio bar, the chronological milestone timeline with amber False Lead rabbit-hole cards (showing time lost), and the crimson Root Cause halo card.
  Why now: Proves the core value and unique kernel on day one—proves the scaffold, state, theme, data model, and rendering pipeline end-to-end so every subsequent feature builds on a working foundation.
  PRD ref: `prd.md > The Core Journey` (steps 1-4), `prd.md > Features and Behavior > 2. Timeline Synthesis & Rabbit Hole Detection`
  Spec ref: `spec.md > Stack`, `spec.md > Look and Feel`, `spec.md > Components > App, TopNavbar, RawLogEditor, EmptyStateBlueprint, TriageEfficiencyBar, TimelineView, TimelineNodeCard`, `spec.md > Data Model`
  Build: Initialize Vite React TypeScript project, Tailwind CSS, Typography, Lucide icons; set up `src/types/incident.ts` and `src/data/demoIncident.ts`; create dark-mode two-pane layout with navbar, editor, and timeline rendering with false lead and root cause badges.
  Verify (mechanical): Run `npm run build` and ensure zero type errors; start dev server and confirm page loads at `http://localhost:5173` without console errors; clicking "Load Demo Incident" populates text, clicking "Synthesize" renders timeline with `[False Lead / Rabbit Hole]` and `[Root Cause Isolated]` nodes and triage bar.
  Learner check: Open `http://localhost:5173`, click "Load Demo Incident", click "Synthesize Timeline", and inspect the high-density dark mode, triage efficiency bar, and amber false lead callout.
  Commit: `Initialize IncidentLens and render core timeline kernel with false leads`

- [x] **2. Source traceability & cross-pane log line highlighting**
  Becomes usable: Clicking any milestone card in the timeline instantly highlights the exact source line(s) in the left raw log editor and scrolls them into view.
  Why now: High-priority SRE trust requirement—lets engineers immediately audit the AI's inferences against the raw chaotic logs.
  PRD ref: `prd.md > Features and Behavior > 3. Source Traceability`
  Spec ref: `spec.md > Components > RawLogEditor, TimelineNodeCard`
  Build: Connect `selectedNodeId` in App state between `TimelineNodeCard` and `RawLogEditor`; implement custom line-highlighted editor view in `RawLogEditor` that visually tags and scrolls to source lines corresponding to the active card.
  Verify (mechanical): Select node in state, verify rendered editor displays active line highlight class on the targeted lines.
  Learner check: Click the "Redis cache saturation" false lead node in the timeline, and verify that lines corresponding to `@alex: checking redis memory...` highlight on the left.
  Commit: `Add cross-pane node-to-source log line highlighting`

- [x] **3. Input validation, 3-stage progress pulse & error handling**
  Becomes usable: Client-side regex pre-validation catches invalid or timestampless input with an inline warning banner; clicking synthesize activates an animated 3-stage progress pulse (*"Extracting messages..."* → *"Isolating root cause..."* → *"Assembling timeline..."*).
  Why now: Robustness and UX polish—prevents broken requests or confused user states and creates an engaging operational feel during synthesis.
  PRD ref: `prd.md > Features and Behavior > 1. Raw Log Ingestion & Validation`, `prd.md > States and Boundaries > Loading / In-Flight State`, `Input Error State`
  Spec ref: `spec.md > Components > LoadingPulse, RawLogEditor`, `spec.md > services/validator.ts`
  Build: Implement `validator.ts` to check line count and timestamp patterns; implement `LoadingPulse.tsx` with animated stepped progress; wire up validation banner and loading states in `App.tsx` and `RawLogEditor.tsx`.
  Verify (mechanical): Test invalid input (<3 lines or no timestamps) and confirm warning banner appears and synthesis is blocked; test valid input and confirm 3-stage pulse displays before result.
  Learner check: Clear the editor, type "hello world", hit Synthesize, verify the warning banner appears, then load demo incident and watch the 3-stage pulse.
  Commit: `Add log validation and 3-stage loading progress pulse`

- [x] **4. SRE postmortem markdown preview & one-click clipboard export**
  Becomes usable: The user can toggle between `[Timeline View]` and `[Postmortem Markdown]`, inspect the formatted SRE postmortem (using `react-markdown` and `remark-gfm`), and click `[Copy Markdown]` with instant clipboard write and flashing checkmark confirmation.
  Why now: Delivers the primary tangible output of IncidentLens—completing the full core loop and closing the product definition.
  PRD ref: `prd.md > Features and Behavior > 4. SRE Postmortem Markdown Generation`
  Spec ref: `spec.md > Components > PostmortemView`
  Build: Implement `PostmortemView.tsx` with markdown rendering styles (prose-invert, tables, callouts) and clipboard copy API with visual feedback; wire into segmented tab switcher.
  Verify (mechanical): Verify tab switching renders markdown; copy button triggers `navigator.clipboard.writeText` and updates state to show "Copied!".
  Learner check: Click [Postmortem Markdown], review the formatted SRE postmortem document, click [Copy Markdown], and paste into a scratchpad or notes app to verify format.
  Commit: `Add SRE postmortem markdown preview and one-click clipboard export`

- [x] **5. Configurable LLM API engine & graceful offline fallback**
  Becomes usable: Optional settings drawer in `TopNavbar` to enter an OpenAI or Gemini API key (stored in `localStorage`) for live dynamic log synthesis, while preserving automatic fallback to offline demo data when offline or without a key.
  Why now: Proves real live AI extraction while keeping the application 100% resilient for demo recording and offline evaluation.
  PRD ref: `prd.md > States and Boundaries > API Failure / Fallback State`
  Spec ref: `spec.md > External Services and Dependencies`, `spec.md > services/synthesisService.ts`
  Build: Implement `synthesisService.ts` to construct the prompt and call the LLM endpoint; store API settings in localStorage; add status badge (`Demo Mode (Offline Verified)` vs `Live AI Engine`).
  Verify (mechanical): Run `npm run build` with zero type errors; dev server runs cleanly; test synthesis with and without simulated API response.
  Learner check: Open settings, check the API key drawer and offline badge status, test synthesizing custom logs.
  Commit: `Add configurable live LLM synthesis with seamless offline fallback`

- [ ] **6. Honest analysis and verification**
  Becomes usable: The system guarantees honest boundaries and verified grounding: Sample mode strictly analyzes only the 3 built-in sample incidents (with clear inline guidance for custom logs); live AI prompts for line numbers and verifies line existence + timestamp matching; UI displays a computed "N/M milestones traced to log lines" badge; and failed API calls surface specific diagnostics without silent canned data substitution.
  Why now: SRE trust requirement—reviewers and evaluators must be confident that milestones are rigorously grounded in the raw log and not hallucinated or quietly mocked.
  PRD ref: `prd.md > Features and Behavior > 5. Honest Analysis & Verifiable Traceability (Slice 6)`, `prd.md > Decision Log`
  Spec ref: `spec.md > Slice 6: Honest Analysis and Verification`, `spec.md > Decisions and Open Issues`
  Build:
    - [ ] Sample mode boundary: When no API key is present, analyze ONLY the 3 built-in incidents. Any other pasted log shows an inline amber banner: *"Sample mode only analyzes the 3 built-in incidents. To analyze your own log, add an OpenAI API key in Settings (gear icon)."* No timeline is generated and no loading card is shown.
    - [ ] Remove the generic offline synthesizer that invents events for arbitrary logs (superseding "Deterministic Offline Fallback").
    - [ ] Surface specific error diagnostics for live API failures (bad key, rate limit, network, invalid JSON) with zero silent fallback to canned data.
    - [ ] Live prompt numbers log lines and instructs the model to cite line numbers; add verify step checking that cited lines exist and milestone timestamp matches a cited line within 1 minute; compute false lead time lost and triage ratio deterministically from timestamps.
    - [ ] Update UI to display `"N/M milestones traced to log lines"` computed by verify step, retiring the old `[Audit Ready]` wording.
    - [ ] Update engine badge states: `"Sample mode"`, `"Live AI ready"`, `"Live AI"`; remove Gemini option from settings; remove `"v0.1.0-poc"` chip.
    - [ ] Update RawLogEditor inspect view to use `text-left` instead of `text-justify`.
    - [ ] Add a one-line plain-English intro banner above the two panes until an incident result is on screen.
  Verify (mechanical): Run `npm run build` with zero errors; test custom log in Sample mode to verify amber banner blocks synthesis; test live API error surfacing without silent fallback; verify line citation and timestamp matching logic; confirm badge reads "N/M milestones traced to log lines" and inspect view is text-left.
  Learner check: Paste a custom log in Sample mode, observe amber banner; switch to a preset and verify "N/M milestones traced to log lines"; check engine badge states.
  Commit: `feat: implement honest analysis, verification step, and sample mode boundaries (Slice 6)`

## Hands-on Checkpoints

- [x] Early usable behavior explored — Slice 1 (core timeline kernel and demo incident synthesis running end-to-end)
- [x] Final kick-the-tires exploration and feedback completed

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Focused architectural walkthrough tracing raw log ingestion (`RawLogEditor.tsx`) through strict JSON schema parsing and line-offset correlation (`synthesisService.ts`) to milestone card rendering (`TimelineNodeCard.tsx`).
Route and stops: `src/components/RawLogEditor.tsx` (scroll-synced editor), `src/services/synthesisService.ts` (dual-engine LLM/offline fallback), `src/components/TimelineNodeCard.tsx` (false lead and root cause cards).
Edit outcome: Line-number gutter scroll synchronization and 800ms-per-phase loading pulse pacing implemented, verified in browser, and committed.
Reflection: Dual-engine schema resilience ensures 100% demo dependability without third-party API rate-limit friction.
Activity mode: live app and editor with interactive `devpost/app-map.html` companion.

## Revisions

- Synchronized textarea vertical scroll with line-number gutter (`RawLogEditor.tsx`) using locked `leading-6` heights to eliminate visual misalignment when scrolling.
- Extended 3-stage progress pulse pacing to 800ms per phase (total 2.4s) in `LoadingPulse.tsx` and `App.tsx` so synthesis phases are readable during video demonstration.
- Fixed top-left source trace badge orb clipping by removing outer `overflow-hidden`, padding to `px-3 py-1.5`, and applying `relative flex h-2 w-2 shrink-0 mr-2` to prevent half-moon crop.
- Enforced whole-word typography wrapping (`whitespace-pre-wrap break-words text-justify`) across inspect code blocks and log outputs.
- Implemented Multi-Scenario Preset Selector with 2 realistic presets: "Flash Sale 504s" (Connection pool exhaustion; Redis detour) and "Database Deadlock" (Exclusive table lock; DDoS false alarm).
- Added Timeline Milestone Filter Bar (`[All Milestones]`, `[Root Cause & Alerts Only]`, `[False Leads Only]`) dynamically isolating matching events.
- Added One-Click Jira/GitHub Task Export formatting remediation action items into clean markdown task checklists with priority tags.

## Decision Log

### Oct 19, 2026 — Honest Analysis and Grounding Verification (Slice 6)
- **Context:** Reviewers and hackathon judges may paste their own raw incident logs into the editor without entering an OpenAI API key, or with an invalid key.
- **Decision:** Remove the generic offline synthesizer that invented arbitrary events for custom logs, and restrict Sample mode strictly to the built-in sample incidents. Require an API key for custom logs, explicitly surface API errors without silent fallback, and deterministically verify all cited line numbers and timestamps.
- **Reasoning:** Fabricating synthetic events for arbitrary logs directly contradicts IncidentLens's core promise—that every single milestone is rigorously grounded in and auditable against the source log. Grounding verification and truthful error boundaries build authentic engineering trust.


