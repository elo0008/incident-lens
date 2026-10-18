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
- **AI / LLM Integration:** Client-side fetch using standard OpenAI-compatible completions API with `response_format: { type: "json_object" }` or Google Gemini API. *Rationale:* Direct client-side invocation with zero backend requirement.
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
Rendered at the top of the right pane in `success` state. Displays metrics: TTD (Time to Detect), TTR (Time to Resolve), and an interactive stacked visual progress bar dividing *Triage / Red Herrings* from *Active Remediation*.
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
- **OpenAI / Gemini Completion Endpoint (Optional):**
  - Endpoint: Standard chat completions (`/v1/chat/completions` or Gemini equivalent)
  - Payload: Prompt with raw incident text and JSON schema instruction.
  - Response format: Strict JSON object.
  - Fallback: Handled locally via `src/data/demoIncident.ts` without network dependency.

## Important Failure Modes
- **Input without timestamps or < 3 lines:** Client-side validator halts before network call; displays warning banner in `RawLogEditor`.
- **API Network error or Rate Limit (429/500):** Automatically switches to verified demo fallback and surfaces an unobtrusive amber banner: *"Using verified demo synthesis due to API network error"*.
- **Malformed JSON from LLM:** JSON parse catch block logs warning and displays retry option or switches to offline mode.

## What Was Simplified and Why
- **Local Fallback Data** instead of mandatory backend proxy: Eliminates CORS and API key onboarding blockers for anyone cloning and running the repository.
- **Client-side State** instead of a database: Keeps the app 100% lightweight and zero-maintenance.
- **Pre-configured Flash Sale Scenario** instead of live Slack OAuth: Avoids setting up OAuth tokens and Slack apps while demonstrating the exact real-world SRE value.

## Decisions and Open Issues
- **Strict JSON Schema vs. Unstructured Parsing:** Using a typed JSON schema ensures the UI can reliably render the timeline nodes, compute the time-spent ratio, and isolate false leads deterministically.
- **Line Highlighting Mapping:** `synthesisService.ts` correlates `rawSnippet` text back to the input textarea's line index, enabling interactive bidirectional cross-pane inspection.
- **Learner Clarification Resolved:** Ensured the architecture operates fully offline in "Demo Mode" out-of-the-box, fulfilling the learner's goal of building a clean, reliable, and complex agent project.
