import React from 'react';
import { ArrowLeft, Clock, Database, GitBranch, Network, Play, Sparkles } from 'lucide-react';
import { DEMO_PRESETS } from '../data/demoIncident';

interface EmptyStateBlueprintProps {
  onLoadDemo?: (autoSynthesize?: boolean) => void;
  onSelectPreset?: (presetId: string) => void;
  hasLogsLoaded?: boolean;
  lineCount?: number;
}

export const EmptyStateBlueprint: React.FC<EmptyStateBlueprintProps> = ({
  onLoadDemo,
  onSelectPreset,
  hasLogsLoaded,
  lineCount
}) => {
  const handlePresetClick = (presetId: string) => {
    if (onSelectPreset) {
      onSelectPreset(presetId);
    } else if (onLoadDemo) {
      onLoadDemo(true);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 md:p-8 text-center select-none overflow-y-auto">
      <div className="max-w-md w-full border border-dashed border-slate-800 rounded-xl p-6 md:p-8 bg-slate-900/40 relative overflow-hidden group hover:border-slate-700 transition-colors shadow-xl">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
            <Clock className="w-6 h-6 stroke-[1.5]" />
          </div>

          <h3 className="text-base font-semibold text-slate-200 tracking-tight mb-2">
            {hasLogsLoaded ? 'Raw Logs Ingested' : 'No Incident Timeline Synthesized'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-5">
            {hasLogsLoaded
              ? `${lineCount || 0} log lines loaded into the editor. Click the button below to extract chronological milestones, detect false leads, and isolate the root cause.`
              : 'Paste raw Slack, Discord, or alert logs on the left, or select a realistic scenario preset to load sample logs:'}
          </p>

          {hasLogsLoaded ? (
            <div className="w-full space-y-3">
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-left">
                <div className="flex items-center space-x-2 text-cyan-300 font-mono text-xs font-semibold mb-1">
                  <Play className="w-4 h-4 text-cyan-400 fill-current" />
                  <span>Ready for Analysis</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Click the glowing <strong className="text-cyan-300">Synthesize Timeline</strong> button in the bottom-left action bar to analyze these logs.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs font-mono text-cyan-400 animate-pulse pt-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Click [Synthesize Timeline] on the left</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 w-full">
              {DEMO_PRESETS.map((preset) => {
                const Icon = preset.id === 'db_deadlock' ? Database : Network;

                return (
                  <button
                    key={preset.id}
                    id={`empty-preset-${preset.id}-btn`}
                    onClick={() => handlePresetClick(preset.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group/btn shadow-md"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover/btn:bg-cyan-500/20 transition-colors shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-slate-100 group-hover/btn:text-cyan-300 transition-colors">
                            {preset.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {preset.subtitle}
                        </p>
                      </div>
                    </div>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 opacity-60 group-hover/btn:opacity-100 shrink-0 ml-2" />
                  </button>
                );
              })}

              <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500 pt-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Or paste custom incident logs on the left</span>
              </div>
            </div>
          )}

          {/* Blueprint preview wireframe */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>False Lead Detection</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <GitBranch className="w-3.5 h-3.5 text-rose-400" />
              <span>Root Cause Isolation</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
