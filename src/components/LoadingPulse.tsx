import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, GitBranch, Layers, Loader2 } from 'lucide-react';

interface LoadingPulseProps {
  onComplete?: () => void;
}

const STAGES = [
  {
    id: 1,
    title: 'Building the timeline',
    detail: 'Parsing channel logs, bot alerts, and mapping UTC timeline anchors',
    icon: Clock,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10'
  },
  {
    id: 2,
    title: 'Measuring the wrong turns',
    detail: 'Detecting red herring rabbit holes, calculating minutes lost, and pinpointing culprit',
    icon: GitBranch,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bg: 'bg-amber-500/10'
  },
  {
    id: 3,
    title: 'Checking against the log',
    detail: 'Synthesizing triage ratio bar, milestone cards, and audit-ready markdown',
    icon: Layers,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10'
  }
];

export const LoadingPulse: React.FC<LoadingPulseProps> = () => {
  const [activeStage, setActiveStage] = useState<number>(1);

  useEffect(() => {
    // 800ms per stage (Total ~2.4s) to allow crisp video narration
    const timer1 = setTimeout(() => setActiveStage(2), 800);
    const timer2 = setTimeout(() => setActiveStage(3), 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-950 text-center select-none overflow-y-auto">
      <div className="max-w-md w-full border border-slate-800 rounded-2xl p-8 bg-slate-900/80 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Central Spinning Radar */}
        <div className="relative mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-center relative shadow-lg shadow-cyan-950/50">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/30 animate-ping opacity-40" />
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-100 tracking-tight mb-1">
          Synthesizing Postmortem Intelligence
        </h3>
        <p className="text-xs text-slate-400 mb-6 font-mono">
          Phase {activeStage} of 3 in progress
        </p>

        {/* 3-Stage Stepper List */}
        <div className="space-y-3.5 text-left">
          {STAGES.map((stage) => {
            const isCompleted = activeStage > stage.id;
            const isCurrent = activeStage === stage.id;
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                className={`p-3 rounded-xl border transition-all duration-300 flex items-start space-x-3 ${
                  isCurrent
                    ? `${stage.bg} ${stage.borderColor} shadow-md`
                    : isCompleted
                    ? 'bg-slate-950/60 border-slate-800/80 opacity-90'
                    : 'bg-slate-950/30 border-slate-850 opacity-40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <div className="relative flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                    </div>
                  ) : (
                    <Icon className="w-4 h-4 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-semibold leading-tight ${
                      isCurrent
                        ? 'text-slate-100'
                        : isCompleted
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {stage.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {stage.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* SRE Operational Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Determinism: Strict JSON</span>
          <span className="text-cyan-400">Zero Telemetry Leak</span>
        </div>
      </div>
    </div>
  );
};
