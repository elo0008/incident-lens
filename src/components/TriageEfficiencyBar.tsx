import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Hourglass } from 'lucide-react';
import { ExecutiveSummary } from '../types/incident';

interface TriageEfficiencyBarProps {
  summary: ExecutiveSummary;
}

export const TriageEfficiencyBar: React.FC<TriageEfficiencyBarProps> = ({ summary }) => {
  const triagePercent = Math.round(summary.triageTimeRatio * 100);
  const remediationPercent = 100 - triagePercent;
  const triageMinutes = Math.round(summary.ttrMinutes * summary.triageTimeRatio);
  const remediationMinutes = summary.ttrMinutes - triageMinutes;

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {/* Title & Impact */}
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
            <span>{summary.title}</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              SEV-1
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{summary.impact}</p>
        </div>

        {/* Quick SRE KPI Badges */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">TTD:</span>
            <span className="text-slate-200 font-semibold">{summary.ttdMinutes}m</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">TTR:</span>
            <span className="text-slate-200 font-semibold">{summary.ttrMinutes}m</span>
          </div>
        </div>
      </div>

      {/* Visual Triage Efficiency Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-amber-400/90 flex items-center space-x-1.5 font-medium">
            <Hourglass className="w-3.5 h-3.5 text-amber-400" />
            <span>Triage & Red Herrings: {triageMinutes} mins ({triagePercent}%)</span>
          </span>
          <span className="text-emerald-400/90 flex items-center space-x-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Remediation: {remediationMinutes} mins ({remediationPercent}%)</span>
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            style={{ width: `${triagePercent}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-700 relative group cursor-help"
            title={`Triage & Rabbit Holes: ${triageMinutes} mins (${triagePercent}%)`}
          />
          <div
            style={{ width: `${remediationPercent}%` }}
            className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500 transition-all duration-700 relative group cursor-help"
            title={`Remediation & Fix Verification: ${remediationMinutes} mins (${remediationPercent}%)`}
          />
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 pt-0.5">
          <AlertCircle className="w-3 h-3 text-slate-500" />
          <span>Click any timeline milestone below to highlight source messages in the raw chat log.</span>
        </div>
      </div>
    </div>
  );
};
