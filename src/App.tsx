import React, { useState } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { RawLogEditor } from './components/RawLogEditor';
import { EmptyStateBlueprint } from './components/EmptyStateBlueprint';
import { TimelineView } from './components/TimelineView';
import { PostmortemView } from './components/PostmortemView';
import { LoadingPulse } from './components/LoadingPulse';
import { DEMO_PRESETS } from './data/demoIncident';
import { validateInputLogs } from './services/validator';
import {
  getBlockingReason,
  getStoredAISettings,
  SynthesisError,
  synthesizeIncidentLogs,
  VerificationSummary
} from './services/synthesisService';
import { SynthesizedIncident, SynthesisStatus, TimelineEvent, ViewMode } from './types/incident';
import { Clock, FileText } from 'lucide-react';

export const App: React.FC = () => {
  const [rawLog, setRawLog] = useState<string>('');
  const [status, setStatus] = useState<SynthesisStatus>('idle');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [incident, setIncident] = useState<SynthesizedIncident | null>(null);
  const [verification, setVerification] = useState<VerificationSummary | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [highlightedLineIndices, setHighlightedLineIndices] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [activeMode, setActiveMode] = useState<'offline_verified' | 'live_ai'>('offline_verified');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeResultModel, setActiveResultModel] = useState<string | null>(null);

  const handleRawLogChange = (newVal: string) => {
    setRawLog(newVal);
    if (warningMessage) {
      setWarningMessage(null);
    }
    // Check if typed log matches any preset
    const matchingPreset = DEMO_PRESETS.find(p => p.rawLog.trim() === newVal.trim());
    setActivePresetId(matchingPreset ? matchingPreset.id : null);
  };

  // Preset selector: populates raw logs into the left editor ONLY, resetting right pane to idle
  const handleSelectPreset = (presetId: string) => {
    const preset = DEMO_PRESETS.find((p) => p.id === presetId) || DEMO_PRESETS[0];
    setActivePresetId(preset.id);
    setRawLog(preset.rawLog);
    // Explicitly reset right pane to idle (do not trigger synthesis)
    setIncident(null);
    setVerification(null);
    setActiveResultModel(null);
    setStatus('idle');
    setWarningMessage(null);
    setSelectedEventId(null);
    setHighlightedLineIndices([]);
    setViewMode('timeline');
  };

  // Legacy demo loader fallback
  const handleLoadDemo = () => {
    handleSelectPreset('flash_sale');
  };

  const triggerSynthesisProcess = async (textToSynthesize?: string) => {
    setWarningMessage(null);
    setStatus('loading');

    const targetText = textToSynthesize || rawLog;
    const settings = getStoredAISettings();

    try {
      // 2400ms allows the 3-stage progress pulse to transition through all steps (800ms each)
      const [result] = await Promise.all([
        synthesizeIncidentLogs(targetText, settings),
        new Promise((res) => setTimeout(res, 2400))
      ]);

      setIncident(result.incident);
      setVerification(result.verification);
      setActiveMode(result.mode);
      setActiveResultModel(result.model);
      setStatus('success');

      // Auto-select false lead or root cause to showcase kernel immediately
      const falseLeadEvent = result.incident.events.find((e) => e.type === 'FALSE_LEAD');
      if (falseLeadEvent) {
        setSelectedEventId(falseLeadEvent.id);
        setHighlightedLineIndices(falseLeadEvent.sourceLineIndices || []);
      }
    } catch (err: unknown) {
      setStatus('idle');
      setIncident(null);
      setVerification(null);
      setActiveResultModel(null);
      if (err instanceof SynthesisError) {
        setWarningMessage(err.message);
      } else {
        console.error('Unexpected synthesis error:', err);
        setWarningMessage('An unexpected error occurred during incident synthesis. Please check the developer console.');
      }
    }
  };

  // Synthesize timeline with pre-validation and blocking reason checks
  const handleSynthesize = () => {
    const validation = validateInputLogs(rawLog);
    if (!validation.isValid) {
      setWarningMessage(validation.error || 'Invalid input logs.');
      return;
    }

    const blockingReason = getBlockingReason(rawLog, getStoredAISettings());
    if (blockingReason) {
      setWarningMessage(blockingReason);
      return;
    }

    triggerSynthesisProcess();
  };

  const handleClear = () => {
    setRawLog('');
    setIncident(null);
    setVerification(null);
    setActiveResultModel(null);
    setStatus('idle');
    setWarningMessage(null);
    setSelectedEventId(null);
    setHighlightedLineIndices([]);
    setViewMode('timeline');
    setActivePresetId(null);
  };

  const handleSelectEvent = (event: TimelineEvent) => {
    setSelectedEventId(event.id);
    setHighlightedLineIndices(event.sourceLineIndices || []);
  };

  const handleClearHighlight = () => {
    setSelectedEventId(null);
    setHighlightedLineIndices([]);
  };

  const selectedEvent = incident?.events.find((e) => e.id === selectedEventId);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <TopNavbar
        onSelectPreset={handleSelectPreset}
        status={status}
        activePresetId={activePresetId}
        activeMode={activeMode}
        activeResultModel={activeResultModel}
      />

      {/* One-Line Plain-English Intro (visible until results are on screen) */}
      {status !== 'success' && (
        <div className="bg-slate-900/70 border-b border-slate-800 px-4 py-2 text-xs text-slate-300 font-sans flex items-center justify-between shrink-0 animate-fadeIn">
          <p className="truncate">
            Paste an outage chat or load a sample. IncidentLens builds the timeline, flags the wrong turns the team took, and shows what they cost.
          </p>
        </div>
      )}

      {/* Main Two-Pane Workplace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Raw Log Editor */}
        <section className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col">
          <RawLogEditor
            rawLog={rawLog}
            onChange={handleRawLogChange}
            onSynthesize={handleSynthesize}
            onClear={handleClear}
            status={status}
            highlightedLineIndices={highlightedLineIndices}
            selectedEventSummary={selectedEvent?.summary}
            warningMessage={warningMessage}
            onClearHighlight={handleClearHighlight}
          />
        </section>

        {/* Right Pane: Synthesis Output */}
        <section className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col bg-slate-950 overflow-hidden">
          {status === 'loading' ? (
            <LoadingPulse />
          ) : incident && status === 'success' ? (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Segmented View Mode Toggle Header */}
              <div className="h-10 px-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
                {/* View Mode Switcher */}
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                  <button
                    id="tab-timeline-view"
                    onClick={() => setViewMode('timeline')}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all duration-100 active:scale-95 ${
                      viewMode === 'timeline'
                        ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Timeline View</span>
                  </button>

                  <button
                    id="tab-postmortem-view"
                    onClick={() => setViewMode('postmortem')}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all duration-100 active:scale-95 ${
                      viewMode === 'postmortem'
                        ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Postmortem Markdown</span>
                  </button>
                </div>

                {/* Grounding Verification Badge */}
                {verification && (
                  <div
                    title={
                      verification.warnings.length > 0
                        ? verification.warnings.join('\n')
                        : 'All milestones verified against source log timestamps.'
                    }
                    className={`text-xs font-mono px-2.5 py-1 rounded-md border flex items-center space-x-1.5 transition-colors cursor-help ${
                      verification.grounded === verification.total
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        verification.grounded === verification.total
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span>
                      {verification.grounded}/{verification.total} milestones traced to log lines
                    </span>
                  </div>
                )}
              </div>

              {/* View Container */}
              <div className="flex-1 overflow-hidden">
                {viewMode === 'timeline' ? (
                  <div key="timeline-view" className="h-full animate-view-fade">
                    <TimelineView
                      incident={incident}
                      selectedEventId={selectedEventId}
                      onSelectEvent={handleSelectEvent}
                      mode={activeMode}
                    />
                  </div>
                ) : (
                  <div key="postmortem-view" className="h-full animate-view-fade">
                    <PostmortemView
                      incident={incident}
                      verification={verification ?? undefined}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyStateBlueprint
              onLoadDemo={handleLoadDemo}
              onSelectPreset={handleSelectPreset}
              hasLogsLoaded={rawLog.trim().length > 0}
              lineCount={rawLog.split('\n').filter(Boolean).length}
            />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
