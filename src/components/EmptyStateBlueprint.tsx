import React from 'react';
import { ArrowLeft, Clock, GitBranch, Sparkles } from 'lucide-react';

interface EmptyStateBlueprintProps {
  onLoadDemo: (autoSynthesize?: boolean) => void;
}

export const EmptyStateBlueprint: React.FC<EmptyStateBlueprintProps> = ({ onLoadDemo }) => {
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
            No Incident Timeline Synthesized
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Paste raw Slack, Discord, or alert logs on the left, or immediately test the synthesis pipeline using our pre-loaded real-world incident.
          </p>

          <div className="space-y-3 w-full">
            <button
              id="empty-load-demo-btn"
              onClick={() => onLoadDemo(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 border border-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-cyan-950/60"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Load & Synthesize Flash Sale Outage</span>
            </button>

            <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500 pt-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Or paste custom incident logs on the left</span>
            </div>
          </div>

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
