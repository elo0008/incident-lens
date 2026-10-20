---
doc: spec
status: approved
---

# IncidentLens — Technical Spec

## How This Works, In Plain Language
IncidentLens is a single-page web app built with React, Vite, and Tailwind CSS. The app runs completely in the browser. 
- On the left is a code-editor-style input pane where an engineer pastes raw incident chatter or clicks **"Load Demo Incident"** to load a pre-built realistic 40+ line incident log.
- On the right is an interactive canvas that toggles between an interactive chronological milestone timeline and an SRE Postmortem Markdown document.
- When the user clicks **"Synthesize Timeline"**, a client-side service calls an LLM endpoint requesting a strict JSON object that classifies triage milestones, tags false lead rabbit holes with calculated minutes lost, and isolates the root cause.
- If no API key is provided, or if the request fails/times out, IncidentLens automatically falls back to an embedded, pre-synthesized dataset in `src/data/demoIncident.ts` with a visual **"Demo Mode (Offline Verified)"** indicator. This ensures a 100% bulletproof demo recording and offline evaluation.

PRD ref: `prd.md > The Core Journey`, `prd.md > Look and Feel`.

## The Core Journey Through the System
1. **User loads the app:** The browser renders the shell at `http://localhost:5173`. The state starts in `idle` mode. The left pane shows an empty editor; the right pane renders `EmptyStateBlueprint`.
2. **User clicks "Load Demo Incident":** `demoIncident.ts` loads the raw text of "Payment Gateway 504 Spikes during Flash Sale" directly into the left editor textarea.
3. **User clicks "Synthesize Timeline":**
   - The client runs a fast regex timestamp validator (`validateInputLogs`). If fewer than 3 lines or no timestamps are found, an inline alert displays and execution halts (implements `prd.md > Features and Behavior > 1. Raw Log Ingestion & Validation`).
   - The UI enters `loading` state: the button spins, and `LoadingPulse` renders with a 3-stage animated progress sequence (implements `prd.md > States and Boundaries > Loading / In-Flight State`).
   - `synthesisService.ts` calls the LLM with prompt + JSON schema enforcement (or instantly yields local verified demo data if offline / no API key).
4. **Data renders in Timeline View:**
   - `TriageEfficiencyBar` calculates and displays the ratio of Red Herrings vs. Actual Remediation.
   - `TimelineList` maps over `events`, rendering typed node cards (`[Critical Alert]`, `[False Lead / Rabbit Hole]`, `[Root Cause Isolated]`, `[Mitigation Attempt]`, `[Incident Resolved]`).
   - Dotted line sub-threads and amber styling surround false leads. A crimson/violet halo wraps the root cause node.
5. **Node-to-source traceability:** Clicking any node in `TimelineNodeCard` highlights the line indices in `RawLogEditor` (implements `prd.md > Features and Behavior > 3. Source Traceability`).
6. **User switches to Postmortem Markdown:** Clicking the view toggle switches the right pane to `PostmortemView`, rendering Github-flavored markdown using `react-markdown` and `remark-gfm`. Clicking **"Copy Markdown"** copies the document to clipboard and flashes confirmation (implements `prd.md > Features and Behavior > 4. SRE Postmortem Markdown Generation`).

## Stack
- **Build Tool / Bundler:** [Vite](https://vitejs.dev/) (`^6.0`) with React + TypeScript. *Rationale:* Instant Hot Module Replacement (HMR), zero-config bundling, and strong type safety.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (`^3.4`) + [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin). *Rationale:* Clean utility classes for high-density slate-950 dark mode, custom scrollbars, and markdown rendering.
- **Iconography:** [lucide-react](https://lucide.dev/) (`^0.475`). *Rationale:* Crisp, modern developer tool icons (AlertTriangle, Check, Copy, Terminal, Clock, RefreshCw, Cpu, Layers).
- **Markdown Previewer:** [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm). *Rationale:* Standard GitHub-flavored markdown parsing (tables, task lists, code blocks) in pure React.
- **AI / LLM Integration:** Client-side fetch using Google Gemini REST API (`https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`) with `responseMimeType: "application/json"`. *Rationale:* Free tier available via Google AI Studio without upfront credits, enabling live testing by the author.
- **Offline Fallback Engine:** Built-in TypeScript module (`src/data/demoIncident.ts`). *Rationale:* Guarantees zero latency and 100% demo resilience.

## Where It Runs and How Someone Tries It
- **Runtime:** Browser (Chrome, Firefox, Edge, Safari).
- **Environment:** Node.js 18+ for local development.
- **Running Locally:**
  ```bash
  npm install
  npm run dev
  ```
  Open `http://localhost:5173`.
- **API Keys:** Optional. An input in the top settings drawer allows entering an API key (stored in `localStorage`). If no key is set, the app seamlessly defaults to verified offline demo synthesis.
- **For the Demo Video:** Start the dev server, load `http://localhost:5173`, click **"Load Demo Incident"**, click **"Synthesize Timeline"**, show the rabbit hole node and triage efficiency bar, click a node to show source line highlighting, toggle to the Postmortem preview, and click **"Copy Markdown"**.

## Look and Feel
Implements `prd.md > Look and Feel`.
- **Theme:** Ultra-dark developer workstation aesthetic (`bg-slate-950` / `#0B0F19`, panels `bg-slate-900/90` / `#111827`, borders `border-slate-800`).
- **Typography:** Inter for headings and UI controls; JetBrains Mono / Fira Code (`font-mono`) for timestamps, log lines, raw text, and metrics.
- **Color Accents:**
  - Amber (`text-amber-400`, `bg-amber-500/10`, `border-amber-500/30`): False leads and rabbit holes.
  - Violet/Crimson (`ring-rose-500/50`, `bg-rose-500/10`, `text-rose-400`): Root cause halo.
  - Emerald (`text-emerald-400`, `bg-emerald-500/10`): Mitigations, resolutions, and clipboard success.
  - Cyan (`text-cyan-400`): Timestamps and system telemetry alerts.

## Components

### App (`src/App.tsx`)
Root component managing application layout, global incident state, active view mode (`timeline` vs `postmortem`), selected node ID for cross-pane highlighting, and synthesis status (`idle` | `loading` | `success` | `error`).
PRD ref: `prd.md > Screens and Layout`.

### TopNavbar (`src/components/TopNavbar.tsx`)
Header displaying IncidentLens branding, status indicators, API key settings toggle, and quick-action buttons.
PRD ref: `prd.md > Screens and Layout`.

### RawLogEditor (`src/components/RawLogEditor.tsx`)
The left pane: multiline raw textarea with line numbers, character/line stats, clear button, inline validation warnings, and the primary "Synthesize Timeline" button. Highlights specific lines when `selectedNode` is set in state.
PRD ref: `prd.md > Features and Behavior > 1. Raw Log Ingestion & Validation`, `3. Source Traceability`.

### EmptyStateBlueprint (`src/components/EmptyStateBlueprint.tsx`)
Rendered in the right pane when state is `idle` and no incident is loaded. Shows a dashed blueprint outline with an instant "Load Demo Incident" button.
PRD ref: `prd.md > States and Boundaries > Empty State`.

### LoadingPulse (`src/components/LoadingPulse.tsx`)
Rendered during `loading` state. Displays the 3-stage animated progress sequence with pulsing step indicators.
PRD ref: `prd.md > States and Boundaries > Loading / In-Flight State`.

### TriageEfficiencyBar (`src/components/TriageEfficiencyBar.tsx`)
Rendered at the top of the right pane in `success` state. Displays metrics: TTD (Time to Detect), TTR (Time to Resolve), and an interactive stacked visual progress bar dividing *Lost on wrong turns* from *Rest of the incident*.
PRD ref: `prd.md > Features and Behavior > 2. Timeline Synthesis & Rabbit Hole Detection`.

### TimelineView (`src/components/TimelineView.tsx`)
Container for the chronological milestone feed. Renders vertical connecting lines, branch indicators for false leads, and individual `TimelineNodeCard` elements.
PRD ref: `prd.md > Features and Behavior > 2. Timeline Synthesis & Rabbit Hole Detection`.

### TimelineNodeCard (`src/components/TimelineNodeCard.tsx`)
Individual milestone card with severity badge, timestamp, author, summary, details, and callouts (e.g. "Time lost: 18 mins"). Supports click-to-highlight corresponding raw log lines.
PRD ref: `prd.md > Features and Behavior > 2. Timeline Synthesis & Rabbit Hole Detection`, `3. Source Traceability`.

### PostmortemView (`src/components/PostmortemView.tsx`)
Renders the generated SRE postmortem document in styled markdown format, with copy-to-clipboard functionality and download button.
PRD ref: `prd.md > Features and Behavior > 4. SRE Postmortem Markdown Generation`.

## Data Model

```typescript
export type EventType =
  | "CRITICAL_ALERT"
  | "TRIAGE"
  | "FALSE_LEAD"
  | "ROOT_CAUSE"
  | "MITIGATION"
  | "RESOLUTION";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  author: string;
  type: EventType;
  summary: string;
  rawSnippet: string;
  timeLostMinutes?: number;
  details?: string;
  sourceLineIndices?: number[]; // lines in raw log for cross-pane highlighting
}

export interface ExecutiveSummary {
  title: string;
  impact: string;
  ttdMinutes: number;
  ttrMinutes: number;
  triageTimeRatio: number; // e.g. 0.42 = 42% of time spent on triage/rabbit holes
}

export interface RootCause {
  summary: string;
  discoveredAt: string;
  discoveredBy: string;
}

export interface ActionItem {
  priority: "P0" | "P1" | "P2";
  action: string;
  owner: string;
}

export interface SynthesizedIncident {
  executiveSummary: ExecutiveSummary;
  rootCause: RootCause;
  events: TimelineEvent[];
  actionItems: ActionItem[];
  markdownReport: string;
}
```

## File Structure

```
incident-lens/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   └── incident.ts          # Core TypeScript data schemas
│   ├── data/
│   │   └── demoIncident.ts      # 40+ line raw log & verified pre-synthesized JSON
│   ├── services/
│   │   ├── validator.ts         # Fast client-side timestamp/log validation
│   │   └── synthesisService.ts  # LLM API caller with offline demo fallback
│   └── components/
│       ├── TopNavbar.tsx
│       ├── RawLogEditor.tsx
│       ├── EmptyStateBlueprint.tsx
│       ├── LoadingPulse.tsx
│       ├── TriageEfficiencyBar.tsx
│       ├── TimelineView.tsx
│       ├── TimelineNodeCard.tsx
│       └── PostmortemView.tsx
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   └── spec.md
└── .gitignore
```

## External Services and Dependencies
- **Google Gemini Endpoint (Optional for Custom Logs):**
  - Endpoint: Google AI Studio REST `generateContent` (`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`)
  - Primary Model: `gemini-3.6-flash` (with transient retry on 500/503/504 and fallback to `gemini-3.5-flash`)
  - Payload: Numbered raw incident text (`1| text`) with system prompt and JSON schema instructions requesting explicit line citations for every milestone.
  - Response format: Strict JSON object enforced via `generationConfig.responseMimeType = "application/json"`.
  - Authentication: Free-tier API key from Google AI Studio, stored exclusively in browser localStorage.

## Slice 6: Honest Analysis and Verification

### 1. Sample Mode Bounding & Guardrails
- When no API key is present (`settings.apiKey` is empty), the application operates in **Sample mode**.
- Synthesis is permitted ONLY for the 2 built-in sample incidents (Flash Sale 504s and Database Deadlock).
- Any custom or unrecognized log text triggers an immediate inline amber warning banner in the editor:
  `"Sample mode only analyzes the 2 built-in incidents. To analyze your own log, add a Gemini API key in Settings (gear icon)."`
- Execution halts immediately: no loading card is shown and no timeline is generated.

### 2. Removal of Generic Synthetic Offline Generator
- The arbitrary generator function (`generateOfflineSynthesis`), which previously invented fictional milestones for unrecognized logs, is completely removed.
- This supersedes the earlier design decision *"Deterministic Offline Fallback"*.

### 3. Explicit API Error Surfaces (Google Gemini)
- When a live Gemini request fails, the application captures and surfaces the specific error reason directly to the user:
  - *Invalid API Key* (HTTP 400 / 403 API key rejected)
  - *Quota Exhaustion* (HTTP 429 rate limit or daily quota reached)
  - *Model Not Found* (HTTP 404 endpoint/model identifier error)
  - *Network / CORS Unavailable* (client-side connection or CORS block)
  - *Blocked / Empty Response* (safety blocks or empty candidate list from Gemini)
  - *Malformed JSON Response* (invalid schema or non-parseable payload)
- A failed live call never produces a timeline and never silently falls back to canned or invented data.

### 4. Line Numbered Prompting & Verification Engine
- **Prompt Enhancement:** Before sending the raw log to Gemini, lines are indexed and prepended with explicit line numbers (`N| text`). The prompt directs the model to cite the exact line numbers (e.g. `sourceLineNumbers: [14, 15]`) for every extracted event.
- **Verification Engine (`verifyIncident` in `src/services/verify.ts`):**
  - Iterates over each event produced by the model.
  - Drops out-of-range line references and records warnings.
  - Verifies that the milestone's timestamp matches the timestamp on at least one cited line within a 1-minute tolerance window.
  - **Detour Span Calculation:** For each `FALSE_LEAD` event, extracts all cited lines with valid timestamps (`HH:MM` or `HH:MM:SS`), unwraps them across midnight in chronological line order, and computes `timeLostMinutes = Math.round((end - start) / 60)`. If fewer than two cited lines contain timestamps or `end <= start`, the model's estimate is kept with an explicit warning indicating unverified duration.
  - **TTR Recomputation:** Recomputes `ttrMinutes` from the first event timestamp to the resolution event timestamp.
  - Derives overall `triageTimeRatio` deterministically: $\frac{\sum \text{false-lead minutes}}{\text{ttrMinutes}}$.

### 5. Live Postmortem Markdown Formatting & Action Item Sanitization
- In `synthesisService.ts`, unverified model arithmetic is stripped: any lines matching `/Duration|Time to Detect|Time to Resolve|TTD|TTR|Triage Time Ratio|Triage Efficiency/` are removed.
- An authoritative `Key metrics (computed from log timestamps)` block is inserted directly under the document heading containing verified duration, TTR, minutes lost on wrong turns, and share percentage.
- Action item owners are checked against handles/names in the raw log (`resolveActionItemOwner`). If the owner does not appear in the log, it is sanitized to `"unassigned"`.
- Live Time to Detect (TTD) chip in `TriageEfficiencyBar` displays with a tilde (`~Xm`) and tooltip indicating it is an AI estimate from the log, not computed from timestamps.

### 6. Verifiable Grounding Badge
- The top header displays a computed grounding badge:
  `"N/M milestones traced to log lines"` (e.g. `7/7 milestones traced to log lines`).

### 7. Engine Badge & UI Cleanup
- Top navbar engine status displays one of three explicit states:
  1. `"Sample mode"` (no API key configured)
  2. `"Live AI ready"` (valid API key stored in settings)
  3. `"Live AI"` (synthesis produced via live model response)
- Settings modal configuration is streamlined strictly to Google Gemini (free-tier key).
- The settings modal includes an explicit data privacy notice:
  *"Notice: Google AI Studio free-tier requests may be logged and used by Google to improve products. Do not paste confidential or proprietary logs."*

### 8. Left-Aligned Inspect View Typography
- In `RawLogEditor`, lines rendered in Inspect View use `text-left` alignment to maintain natural monospace readability for logs.

### 9. Plain-English Intro Header
- A concise, one-line plain-English explainer banner sits prominently above the two panes whenever no synthesized result is on screen:
  *"Paste raw incident chat & alerts or select a built-in sample to synthesize a verifiable SRE timeline and postmortem."*

## Important Failure Modes
- **Input without timestamps or < 3 lines:** Client-side validator halts before network call; displays warning banner in `RawLogEditor`.
- **Sample Mode with Custom Logs:** Client-side matcher detects unindexed log; halts and displays amber guidance banner directing user to Settings.
- **API Network error or Rate Limit (429/500):** Surfaces specific diagnostic error alert; halts execution without silent canned data substitution.
- **Gemini Safety Block or Empty Candidates:** Surfaces specific diagnostic alert that content was blocked or empty; halts execution without producing a timeline.
- **Malformed JSON from LLM:** Error handler surfaces explicit JSON parse failure and prompts for retry.

## What Was Simplified and Why
- **Sample Mode for Built-In Incidents Only:** Keeps the app 100% dependable for demo evaluations without risking fabricated inferences for unverified user logs.
- **Direct Google Gemini Integration:** Uses Google AI Studio free tier so live analysis can be tested without paid credits.
- **Client-Side Verification Step:** Guarantees auditability mathematically before presenting data to the user.
- **Risk Note & 2-Hour Timebox:** If browser-direct calls to the Gemini API cannot be made to work within a 2-hour timebox (due to CORS, endpoint, or environment limitations), the project will ship strictly in sample-only mode and state so transparently in the README and Devpost submission.

## Decisions and Open Issues

### Decision Log — Oct 19, 2026: Honest Analysis and Source Grounding Verification
- **Context:** Reviewers and hackathon judges may paste their own raw incident logs into the editor without entering an API key, or with an invalid key.
- **Decision:** Remove the generic offline synthesizer that invented arbitrary events for custom logs, and restrict Sample mode strictly to the built-in sample incidents. Require an API key for custom logs, explicitly surface API errors without silent fallback, and deterministically verify all cited line numbers and timestamps.
- **Reasoning:** Fabricating synthetic events for arbitrary logs directly contradicts IncidentLens's core promise—that every single milestone is rigorously grounded in and auditable against the source log. Grounding verification and truthful error boundaries build authentic engineering trust.

- **Strict JSON Schema vs. Unstructured Parsing:** Using a typed JSON schema ensures the UI can reliably render the timeline nodes, compute the time-spent ratio, and isolate false leads deterministically.
- **Line Highlighting Mapping:** `synthesisService.ts` correlates `rawSnippet` text back to the input textarea's line index, enabling interactive bidirectional cross-pane inspection.

### Decision Log — Oct 19, 2026: Kafka Scenario Cut, 2 Samples Ship
- **Context:** Earlier drafts planned three demo presets (including a proposed Kafka consumer lag scenario).
- **Decision:** Cut the Kafka scenario and ship strictly 2 built-in sample incidents (`flash_sale` and `db_deadlock`).
- **Reasoning:** Sizing down to two realistic, fully grounded scenarios guarantees 100% auditability and source line traceability without inflating maintenance surface.

### Decision Log — Oct 19, 2026: Switch Live Analysis Provider to Google Gemini (Free Tier)
- **Context:** The project has zero OpenAI API credits, making it impossible for the author to test and demonstrate live dynamic incident synthesis.
- **Decision:** Switch live analysis provider exclusively to Google Gemini (REST `generateContent` via Google AI Studio free tier). OpenAI support is removed, not kept alongside. Sample-mode guidance and settings modal are updated to refer to Gemini API keys, with an explicit privacy disclaimer regarding free-tier data logging.
- **Risk Note & 2-Hour Timebox:** If live Gemini calls cannot be made to work directly from the browser within a 2-hour timebox, the project will ship in sample-only mode and say so honestly in the README and submission.

### Decision Log — Oct 20, 2026: Postmortem Toolbar Polish & Grounding Badge De-duplication
- **Decision:** Grounding badge lives only in the app header; PostmortemView toolbar no longer repeats it.

### Decision Log — Oct 20, 2026: Honest Efficiency Bar Labels
- **Decision:** Rename efficiency bar segments from "Triage & Red Herrings" / "Active Remediation" to "Lost on wrong turns" / "Rest of the incident", because the first segment measures strictly time spent on FALSE_LEAD detours while the second encompasses all other incident time (including detection, triage, and root cause diagnosis, not solely remediation).




