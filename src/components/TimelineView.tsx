import React, { useState } from 'react';
import { SynthesizedIncident, TimelineEvent } from '../types/incident';
import { TriageEfficiencyBar } from './TriageEfficiencyBar';
import { TimelineNodeCard } from './TimelineNodeCard';
import { AlertCircle, Filter, Target } from 'lucide-react';

interface TimelineViewProps {
  incident: SynthesizedIncident;
  selectedEventId: string | null;
  onSelectEvent: (event: TimelineEvent) => void;
}

export type MilestoneFilter = 'all' | 'root_alerts' | 'false_leads';

export const TimelineView: React.FC<TimelineViewProps> = ({
  incident,
  selectedEventId,
  onSelectEvent
}) => {
  const [filter, setFilter] = useState<MilestoneFilter>('all');

  const alertAndRootCount = incident.events.filter(
    (e) => e.type === 'ROOT_CAUSE' || e.type === 'CRITICAL_ALERT'
  ).length;

  const falseLeadCount = incident.events.filter((e) => e.type === 'FALSE_LEAD').length;

  const filteredEvents = incident.events.filter((event) => {
    if (filter === 'root_alerts') {
      return event.type === 'ROOT_CAUSE' || event.type === 'CRITICAL_ALERT';
    }
    if (filter === 'false_leads') {
      return event.type === 'FALSE_LEAD';
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

        {/* Milestone Feed & Filter Bar */}
        <div className="space-y-4">
          {/* High-Density Milestone Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80 px-1">
            <div className="flex items-center space-x-1.5 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <button
                id="filter-all-milestones"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 ${
                  filter === 'all'
                    ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>All Milestones</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-slate-400">
                  {incident.events.length}
                </span>
              </button>

              <button
                id="filter-root-alerts"
                onClick={() => setFilter('root_alerts')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 ${
                  filter === 'root_alerts'
                    ? 'bg-rose-950/50 text-rose-300 font-semibold border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-rose-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>Root Cause & Alerts Only</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-rose-300/80">
                  {alertAndRootCount}
                </span>
              </button>

              <button
                id="filter-false-leads"
                onClick={() => setFilter('false_leads')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 ${
                  filter === 'false_leads'
                    ? 'bg-amber-950/50 text-amber-300 font-semibold border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-amber-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>False Leads Only</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300/80">
                  {falseLeadCount}
                </span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {filter === 'all'
                  ? `Showing all ${incident.events.length} milestones`
                  : `Filtered: ${filteredEvents.length} of ${incident.events.length} milestones`}
              </span>
            </div>
          </div>

          {/* Cards List */}
          {filteredEvents.length > 0 ? (
            <div className="space-y-4">
              {filteredEvents.map((event, idx) => (
                <TimelineNodeCard
                  key={event.id}
                  event={event}
                  isSelected={selectedEventId === event.id}
                  onSelect={onSelectEvent}
                  isLast={idx === filteredEvents.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 font-mono text-xs">
              No milestones found matching current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
