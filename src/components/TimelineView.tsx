import React, { useState } from 'react';
import { SynthesizedIncident, TimelineEvent } from '../types/incident';
import { TriageEfficiencyBar } from './TriageEfficiencyBar';
import { TimelineNodeCard } from './TimelineNodeCard';
import { AlertCircle, Filter, Sparkles, Target } from 'lucide-react';

interface TimelineViewProps {
  incident: SynthesizedIncident;
  selectedEventId: string | null;
  onSelectEvent: (event: TimelineEvent) => void;
}

type MilestoneFilter = 'all' | 'critical' | 'false_leads';

export const TimelineView: React.FC<TimelineViewProps> = ({
  incident,
  selectedEventId,
  onSelectEvent
}) => {
  const [filter, setFilter] = useState<MilestoneFilter>('all');

  const allCount = incident.events.length;
  const criticalCount = incident.events.filter(
    (e) => e.type === 'ROOT_CAUSE' || e.type === 'CRITICAL_ALERT'
  ).length;
  const falseLeadsCount = incident.events.filter((e) => e.type === 'FALSE_LEAD').length;

  const filteredEvents = incident.events.filter((e) => {
    if (filter === 'critical') {
      return e.type === 'ROOT_CAUSE' || e.type === 'CRITICAL_ALERT';
    }
    if (filter === 'false_leads') {
      return e.type === 'FALSE_LEAD';
    }
    return true;
  });

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

        {/* Milestone Filter Toolbar */}
        <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between flex-wrap gap-2 shadow-sm">
          <div className="flex items-center space-x-1.5 text-xs font-mono flex-wrap gap-y-1">
            <div className="flex items-center space-x-1 mr-1 text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Filter:</span>
            </div>

            {/* Pill 1: All Milestones */}
            <button
              id="filter-all-milestones-btn"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 ${
                filter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <span>All Milestones</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filter === 'all' ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-500'
              }`}>
                {allCount}
              </span>
            </button>

            {/* Pill 2: Root Cause & Alerts Only */}
            <button
              id="filter-critical-milestones-btn"
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 ${
                filter === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
              <span>Root Cause & Alerts</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filter === 'critical' ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-800 text-slate-500'
              }`}>
                {criticalCount}
              </span>
            </button>

            {/* Pill 3: False Leads Only */}
            <button
              id="filter-false-leads-milestones-btn"
              onClick={() => setFilter('false_leads')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 ${
                filter === 'false_leads'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              <span>False Leads Only</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filter === 'false_leads' ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-500'
              }`}>
                {falseLeadsCount}
              </span>
            </button>
          </div>

          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline transition-colors px-1"
            >
              Reset to all
            </button>
          )}
        </div>

        {/* Milestone Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="font-semibold text-slate-300">
              {filter === 'all'
                ? `CHRONOLOGICAL TRIAGE MILESTONES (${incident.events.length})`
                : `FILTERED MILESTONES (${filteredEvents.length} of ${incident.events.length})`}
            </span>
            <span className="text-[11px] text-slate-500 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-slate-500" />
              <span>Click node to locate in chat log</span>
            </span>
          </div>

          <div className="space-y-4">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event, idx) => (
                <TimelineNodeCard
                  key={event.id}
                  event={event}
                  index={idx}
                  isSelected={selectedEventId === event.id}
                  onSelect={onSelectEvent}
                  isLast={idx === filteredEvents.length - 1}
                />
              ))
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 font-mono text-xs">
                No milestones match this filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
