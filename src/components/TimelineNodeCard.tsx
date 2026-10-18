import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  GitBranch,
  Target,
  User,
  Wrench
} from 'lucide-react';
import { EventType, TimelineEvent } from '../types/incident';

interface TimelineNodeCardProps {
  event: TimelineEvent;
  isSelected: boolean;
  onSelect: (event: TimelineEvent) => void;
  isLast: boolean;
}

const getBadgeConfig = (type: EventType) => {
  switch (type) {
    case 'CRITICAL_ALERT':
      return {
        label: 'CRITICAL ALERT',
        icon: AlertOctagon,
        badgeStyle: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        nodeDot: 'bg-rose-500 ring-rose-500/20'
      };
    case 'FALSE_LEAD':
      return {
        label: 'FALSE LEAD / RABBIT HOLE',
        icon: AlertTriangle,
        badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950',
        nodeDot: 'bg-amber-400 ring-amber-400/30'
      };
    case 'ROOT_CAUSE':
      return {
        label: 'ROOT CAUSE ISOLATED',
        icon: Target,
        badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-400/50 shadow-md shadow-rose-950/60 font-semibold',
        nodeDot: 'bg-rose-400 ring-rose-400/40 ring-4'
      };
    case 'MITIGATION':
      return {
        label: 'MITIGATION ATTEMPT',
        icon: Wrench,
        badgeStyle: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        nodeDot: 'bg-cyan-400 ring-cyan-400/20'
      };
    case 'RESOLUTION':
      return {
        label: 'INCIDENT RESOLVED',
        icon: CheckCircle2,
        badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        nodeDot: 'bg-emerald-400 ring-emerald-400/30'
      };
    case 'TRIAGE':
    default:
      return {
        label: 'INVESTIGATION',
        icon: Compass,
        badgeStyle: 'bg-slate-800 text-slate-300 border-slate-700',
        nodeDot: 'bg-slate-400 ring-slate-400/20'
      };
  }
};

export const TimelineNodeCard: React.FC<TimelineNodeCardProps> = ({
  event,
  isSelected,
  onSelect,
  isLast
}) => {
  const config = getBadgeConfig(event.type);
  const Icon = config.icon;
  const isFalseLead = event.type === 'FALSE_LEAD';
  const isRootCause = event.type === 'ROOT_CAUSE';

  return (
    <div className="relative pl-7 group">
      {/* Vertical Spine */}
      {!isLast && (
        <div
          className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${
            isFalseLead ? 'border-l-2 border-dashed border-amber-500/40' : 'bg-slate-800'
          }`}
        />
      )}

      {/* Node Bullet Dot */}
      <div
        className={`absolute left-1 top-2.5 w-4 h-4 rounded-full ring-2 flex items-center justify-center transition-all ${
          config.nodeDot
        } ${isSelected ? 'scale-125 ring-4' : 'group-hover:scale-110'}`}
      />

      {/* Main Card Container */}
      <div
        onClick={() => onSelect(event)}
        className={`rounded-xl border p-4 transition-all cursor-pointer relative ${
          isSelected
            ? 'bg-slate-850 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
            : isRootCause
            ? 'bg-slate-900/90 border-rose-500/50 hover:border-rose-400 ring-1 ring-rose-500/20 shadow-lg shadow-rose-950/20'
            : isFalseLead
            ? 'bg-slate-900/80 border-amber-500/30 hover:border-amber-500/50 hover:bg-slate-850'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
        }`}
      >
        {/* Card Header: Timestamp, Badge, Author */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-semibold text-cyan-400 flex items-center space-x-1 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              <Clock className="w-3 h-3 text-cyan-500" />
              <span>{event.timestamp}</span>
            </span>

            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border flex items-center space-x-1 ${config.badgeStyle}`}
            >
              <Icon className="w-3 h-3" />
              <span>{config.label}</span>
            </span>
          </div>

          <div className="flex items-center space-x-1 text-xs font-mono text-slate-400">
            <User className="w-3 h-3 text-slate-500" />
            <span className="text-slate-300">{event.author}</span>
          </div>
        </div>

        {/* Summary */}
        <h4
          className={`text-sm font-semibold mb-1.5 leading-snug ${
            isRootCause
              ? 'text-rose-200'
              : isFalseLead
              ? 'text-amber-200'
              : 'text-slate-200'
          }`}
        >
          {event.summary}
        </h4>

        {/* Details & Rabbit Hole Callout */}
        {event.details && (
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            {event.details}
          </p>
        )}

        {/* Explicit False Lead Rabbit Hole Box */}
        {isFalseLead && event.timeLostMinutes && event.timeLostMinutes > 0 && (
          <div className="mb-3 rounded-lg p-2.5 bg-amber-500/10 border border-amber-500/30 flex items-start space-x-2.5">
            <GitBranch className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-amber-300">
                Detour Identified — {event.timeLostMinutes} Minutes Lost
              </span>
              <p className="text-amber-200/80 text-[11px] mt-0.5">
                Engineers pursued cache saturation until latency metrics nominal state proved the cluster was healthy.
              </p>
            </div>
          </div>
        )}

        {/* Source Snippet preview with click prompt */}
        <div className="bg-slate-950/90 rounded border border-slate-800/80 p-2 font-mono text-[11px] text-slate-400 flex items-center justify-between overflow-hidden">
          <span className="truncate pr-2 text-slate-300">
            {event.rawSnippet}
          </span>
          <span className="text-[10px] text-cyan-400/80 shrink-0 uppercase tracking-wider font-sans group-hover:text-cyan-300 font-medium">
            View Source →
          </span>
        </div>
      </div>
    </div>
  );
};
