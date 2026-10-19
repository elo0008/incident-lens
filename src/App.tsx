import React, { useState } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { RawLogEditor } from './components/RawLogEditor';
import { EmptyStateBlueprint } from './components/EmptyStateBlueprint';
import { TimelineView } from './components/TimelineView';
import { PostmortemView } from './components/PostmortemView';
import { LoadingPulse } from './components/LoadingPulse';
import { DEMO_PRESETS, DEMO_RAW_LOG } from './data/demoIncident';
import { validateInputLogs } from './services/validator';
import { getStoredAISettings, synthesizeIncidentLogs } from './services/synthesisService';
import { SynthesizedIncident, SynthesisStatus, TimelineEvent, ViewMode } from './types/incident';
import { Check, Clock, Copy, Download, FileText, ListTodo } from 'lucide-react';

export const App: React.FC = () => {
  const [rawLog, setRawLog] = useState<string>('');
  const [status, setStatus] = useState<SynthesisStatus>('idle');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [incident, setIncident] = useState<SynthesizedIncident | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [highlightedLineIndices, setHighlightedLineIndices] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [copiedDoc, setCopiedDoc] = useState<boolean>(false);
  const [copiedTasks, setCopiedTasks] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<'offline_verified' | 'live_ai'>('offline_verified');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

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

    // 2400ms allows the 3-stage progress pulse to transition through all steps (800ms each)
    const [result] = await Promise.all([
      synthesizeIncidentLogs(targetText, settings),
      new Promise((res) => setTimeout(res, 2400))
    ]);

    setIncident(result.incident);
    setActiveMode(result.mode);
    setStatus('success');

    // Auto-select false lead or root cause to showcase kernel immediately
    const falseLeadEvent = result.incident.events.find((e) => e.type === 'FALSE_LEAD');
    if (falseLeadEvent) {
      setSelectedEventId(falseLeadEvent.id);
      setHighlightedLineIndices(falseLeadEvent.sourceLineIndices || []);
    }
  };

  // Synthesize timeline with pre-validation
  const handleSynthesize = () => {
    const validation = validateInputLogs(rawLog);
    if (!validation.isValid) {
      setWarningMessage(validation.error || 'Invalid input logs.');
      return;
    }

    triggerSynthesisProcess();
  };

  const handleClear = () => {
    setRawLog('');
    setIncident(null);
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

  const handleCopyMarkdown = async () => {
    if (!incident) return;
    try {
      await navigator.clipboard.writeText(incident.markdownReport);
      setCopiedDoc(true);
      setTimeout(() => setCopiedDoc(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown', err);
    }
  };

  const handleCopyTasks = async () => {
    if (!incident) return;
    try {
      const title = incident.executiveSummary.title;
      let md = `### Incident Action Items: ${title}\n\n`;
      incident.actionItems.forEach((item) => {
        md += `- [ ] **[${item.priority}]** ${item.action} (Owner: ${item.owner})\n`;
      });
      await navigator.clipboard.writeText(md);
      setCopiedTasks(true);
      setTimeout(() => setCopiedTasks(false), 2000);
    } catch (err) {
      console.error('Failed to copy tasks', err);
    }
  };

  const handleDownloadMd = () => {
    if (!incident) return;
    const blob = new Blob([incident.markdownReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'incident-postmortem.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      />

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
              {/* Row 1: View Switcher & Consolidated Action Bar */}
              <div className="h-12 px-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0 flex-wrap gap-2">
                {/* View Mode Switcher */}
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                  <button
                    id="tab-timeline-view"
                    onClick={() => setViewMode('timeline')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
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
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
                      viewMode === 'postmortem'
                        ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Postmortem Markdown</span>
                  </button>
                </div>

                {/* Consolidated Export Action Button Group */}
                <div className="flex items-center space-x-2">
                  <button
                    id="header-copy-jira-tasks-btn"
                    onClick={handleCopyTasks}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono border transition-all ${
                      copiedTasks
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-slate-100 hover:border-slate-600'
                    }`}
                    title="Copy action items as GitHub/Jira markdown checklist"
                  >
                    {copiedTasks ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied Tasks!</span>
                      </>
                    ) : (
                      <>
                        <ListTodo className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Copy Jira Tasks</span>
                        <span className="sm:hidden">Tasks</span>
                      </>
                    )}
                  </button>

                  <button
                    id="header-export-md-btn"
                    onClick={handleDownloadMd}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-all"
                    title="Download incident-postmortem.md file"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Export .md</span>
                    <span className="sm:hidden">.md</span>
                  </button>

                  <button
                    id="header-copy-markdown-btn"
                    onClick={handleCopyMarkdown}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium border transition-all ${
                      copiedDoc
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                        : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-200 shadow-sm shadow-cyan-950/40'
                    }`}
                    title="Copy full synthesized postmortem markdown"
                  >
                    {copiedDoc ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* View Container */}
              <div className="flex-1 overflow-hidden">
                {viewMode === 'timeline' ? (
                  <TimelineView
                    incident={incident}
                    selectedEventId={selectedEventId}
                    onSelectEvent={handleSelectEvent}
                  />
                ) : (
                  <PostmortemView incident={incident} />
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
