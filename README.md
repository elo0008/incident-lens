# IncidentLens

When a website breaks, engineers scramble in a chat. IncidentLens turns that chat into a timeline and shows how much time was lost chasing the wrong cause.

---

## Try it in 3 Steps

1. **Load a sample incident:** Select a preset from the navbar dropdown (*Flash Sale 504s* or *Database Deadlock*).
2. **Click "Synthesize Timeline":** The timeline renders with categorized milestones, false-lead rabbit holes, and root-cause isolation.
3. **Click any milestone card:** The exact source chat/log lines that support that milestone immediately highlight in the raw log viewer on the left.

---

## Sample Mode vs Live AI

IncidentLens operates with transparent boundaries between built-in sample data and live AI extraction:

- **Sample Mode (Offline Verified):**
  - Includes **2 built-in sample incidents**:
    - *Flash Sale 504s* (Connection pool exhaustion; Redis detour): **17 of 40 minutes lost (43%)**.
    - *Database Deadlock* (Exclusive table lock; DDoS false alarm): **12 of 26 minutes lost (46%)**.
  - Returns stored, verified results instantly with **no AI API call**.
  - Does not invent or simulate timelines for arbitrary pasted logs without an API key.

- **Live AI Mode (Google Gemini Free Tier):**
  - Analyzes your own pasted incident logs using **Google Gemini** (`gemini-3.6-flash`, with automatic retry on transient errors and fallback to `gemini-3.5-flash`).
  - Requires your own free Gemini API key from [Google AI Studio](https://aistudio.google.com/).
  - **Browser-Only Storage:** Your API key is stored exclusively in your browser's `localStorage` and sent directly to Google's API endpoint over HTTPS. It is never logged, proxied, or sent to any third-party server.
  - **Privacy Notice:** Free-tier Gemini API requests may be used by Google to improve its products. Do not paste confidential, proprietary, or sensitive customer logs.
  - **Estimates, Not Exact Math:** Live results are estimates. The measured time lost depends on which exact log lines the model cites, so numbers can vary by a few minutes between runs. The live Time to Detect (TTD) chip is labeled as an AI estimate (`~Xm`). However, every single milestone is checked against the raw log, and the app displays an honest `"N/M milestones traced to log lines"` badge showing exactly how many milestones are grounded in cited log lines. Live mode is designed for incident chat/alert logs with timestamps and does not claim to work on arbitrary unstructured text.

---

## How It Works

IncidentLens implements deterministic post-processing and verification on top of LLM extraction:

1. **Numbered Line Prompting & Schema Extraction (`src/services/synthesisService.ts`):**
   - The raw log is prefixed with 1-based line numbers (`N| line`).
   - Gemini outputs structured JSON matching a strict schema, citing exact verbatim snippets and line numbers for every milestone.
   - For every `FALSE_LEAD`, the model is instructed to cite both the line where the wrong hypothesis was raised and the line where it was disproven or abandoned.
   - Action item owners must appear as a handle or name in the source log; otherwise they are sanitized to `"unassigned"`.

2. **False-Lead Detour Measurement (`src/services/verify.ts`):**
   - For each `FALSE_LEAD` event, the system identifies all cited source lines that contain timestamps.
   - Timestamps (`HH:MM` or `HH:MM:SS`) are converted to seconds and unwrapped across midnight boundaries in chronological line order.
   - The detour span is measured from the earliest timestamp (`start`) to the latest timestamp (`end`) among the cited lines:
     $$\text{timeLostMinutes} = \text{Math.round}\left(\frac{\text{end} - \text{start}}{60}\right)$$
   - If fewer than two cited lines contain timestamps or `end <= start`, the model's estimate is preserved, but an explicit warning is recorded indicating that the detour span could not be independently verified.

3. **Grounding Verification (`src/services/verify.ts`):**
   - Out-of-bounds line numbers are dropped with recorded warnings.
   - For each milestone, the system verifies that the milestone's timestamp matches a timestamp found in its cited lines within a 1-minute tolerance ($\le 1\text{ min}$).
   - The UI surfaces the verified count directly in the badge: `"N/M milestones traced to log lines"`.

4. **Deterministic Metrics & Postmortem Formatting (`src/services/synthesisService.ts`):**
   - Time to Resolve (TTR) is recomputed from the first milestone timestamp to the resolution milestone timestamp.
   - The triage efficiency ratio is deterministically computed as:
     $$\text{triageTimeRatio} = \frac{\sum \text{false-lead minutes}}{\text{ttrMinutes}}$$
   - Any model-generated duration or ratio lines in the markdown postmortem are stripped and replaced by an authoritative `Key metrics (computed from log timestamps)` block.

---

## How This Was Built

IncidentLens was built with an AI coding agent following the **Build With AI: Basics** planning workflow:

- [devpost/scope.md](devpost/scope.md) — Scope definition, core kernel, and proof-of-concept boundary.
- [devpost/prd.md](devpost/prd.md) — Product requirements document, user journeys, states, and decision log.
- [devpost/spec.md](devpost/spec.md) — Technical specification, component architecture, data model, and verification contract.
- [devpost/checklist.md](devpost/checklist.md) — Step-by-step implementation slices and verification checkpoints.
- [app-map.html](https://incident-lens-flame.vercel.app/app-map.html) — Interactive architecture and code tour map (also available in the repository at [devpost/app-map.html](devpost/app-map.html)).

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (v9 or higher)

### Run Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit tests
npm test

# Build production bundle
npm run build
```

---

## License

MIT License — Copyright (c) 2026 Madhav Krishna T. See [LICENSE](LICENSE) for details.
