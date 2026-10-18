import React from 'react';
import { SynthesizedIncident, TimelineEvent } from '../types/incident';
import { TriageEfficiencyBar } from './TriageEfficiencyBar';
import { TimelineNodeCard } from './TimelineNodeCard';
import { AlertCircle, Target } from 'lucide-react';

interface TimelineViewProps {
  incident: SynthesizedIncident;
  selectedEventId: string | null;
  onSelectEvent: (event: TimelineEvent) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  incident,
  selectedEventId,
  onSelectEvent
}) => {
  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Triage Efficiency Bar */}
      <TriageEfficiencyBar summary={incident.executiveSummary} />

      {/* Scrollable Node Timeline */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Isolated Root Cause Highlight Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 flex items-start space-x-3 shadow-lg shadow-rose-950/30">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-rose-300">Root Cause Summary</span>
              <span className="text-[10px] font-mono text-slate-400">
                Isolated at {incident.rootCause.discoveredAt} by {incident.rootCause.discoveredBy}
              </span>
            </div>
            <p className="text-slate-300 mt-1 leading-relaxed">
              {incident.rootCause.summary}
            </p>
          </div>
        </div>

        {/* Milestone Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>CHRONOLOGICAL TRIAGE MILESTONES ({incident.events.length})</span>
            <span className="text-[11px] text-slate-500 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-slate-500" />
              <span>Click node to locate in chat log</span>
            </span>
          </div>

          <div className="space-y-4">
            {incident.events.map((event, idx) => (
              <TimelineNodeCard
                key={event.id}
                event={event}
                isSelected={selectedEventId === event.id}
                onSelect={onSelectEvent}
                isLast={idx === incident.events.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
