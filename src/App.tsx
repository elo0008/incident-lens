import React, { useState } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { RawLogEditor } from './components/RawLogEditor';
import { EmptyStateBlueprint } from './components/EmptyStateBlueprint';
import { TimelineView } from './components/TimelineView';
import { DEMO_RAW_LOG, DEMO_SYNTHESIZED_DATA } from './data/demoIncident';
import { SynthesizedIncident, SynthesisStatus, TimelineEvent, ViewMode } from './types/incident';

export const App: React.FC = () => {
  const [rawLog, setRawLog] = useState<string>('');
  const [status, setStatus] = useState<SynthesisStatus>('idle');
  const [incident, setIncident] = useState<SynthesizedIncident | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [highlightedLineIndices, setHighlightedLineIndices] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  // Load demo scenario into editor
  const handleLoadDemo = (autoSynthesize = false) => {
    setRawLog(DEMO_RAW_LOG);
    setSelectedEventId(null);
    setHighlightedLineIndices([]);

    if (autoSynthesize) {
      setStatus('loading');
      setTimeout(() => {
        setIncident(DEMO_SYNTHESIZED_DATA);
        setStatus('success');
        const falseLeadEvent = DEMO_SYNTHESIZED_DATA.events.find(e => e.type === 'FALSE_LEAD');
        if (falseLeadEvent) {
          setSelectedEventId(falseLeadEvent.id);
          setHighlightedLineIndices(falseLeadEvent.sourceLineIndices || []);
        }
      }, 500);
    }
  };

  // Synthesize timeline
  const handleSynthesize = () => {
    setStatus('loading');
    
    // Simulate brief processing for realistic UX feel
    setTimeout(() => {
      setIncident(DEMO_SYNTHESIZED_DATA);
      setStatus('success');
      // Auto-select false lead to immediately showcase the unique kernel
      const falseLeadEvent = DEMO_SYNTHESIZED_DATA.events.find(e => e.type === 'FALSE_LEAD');
      if (falseLeadEvent) {
        setSelectedEventId(falseLeadEvent.id);
        setHighlightedLineIndices(falseLeadEvent.sourceLineIndices || []);
      }
    }, 600);
  };

  const handleClear = () => {
    setRawLog('');
    setIncident(null);
    setStatus('idle');
    setSelectedEventId(null);
    setHighlightedLineIndices([]);
  };

  const handleSelectEvent = (event: TimelineEvent) => {
    setSelectedEventId(event.id);
    setHighlightedLineIndices(event.sourceLineIndices || []);
  };

  const handleClearHighlight = () => {
    setSelectedEventId(null);
    setHighlightedLineIndices([]);
  };

  const isDemoLoaded = rawLog === DEMO_RAW_LOG;
  const selectedEvent = incident?.events.find(e => e.id === selectedEventId);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <TopNavbar
        onLoadDemo={handleLoadDemo}
        status={status}
        isDemoLoaded={isDemoLoaded}
      />

      {/* Main Two-Pane Workplace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Raw Log Editor */}
        <section className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col">
          <RawLogEditor
            rawLog={rawLog}
            onChange={setRawLog}
            onSynthesize={handleSynthesize}
            onClear={handleClear}
            status={status}
            highlightedLineIndices={highlightedLineIndices}
            selectedEventSummary={selectedEvent?.summary}
            onClearHighlight={handleClearHighlight}
          />
        </section>

        {/* Right Pane: Synthesis Output */}
        <section className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col bg-slate-950 overflow-hidden">
          {incident && status === 'success' ? (
            <TimelineView
              incident={incident}
              selectedEventId={selectedEventId}
              onSelectEvent={handleSelectEvent}
            />
          ) : (
            <EmptyStateBlueprint onLoadDemo={handleLoadDemo} />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
