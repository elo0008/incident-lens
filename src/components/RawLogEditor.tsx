import React from 'react';
import { Play, RotateCcw, Sparkles, Terminal } from 'lucide-react';
import { SynthesisStatus } from '../types/incident';

interface RawLogEditorProps {
  rawLog: string;
  onChange: (val: string) => void;
  onSynthesize: () => void;
  onClear: () => void;
  status: SynthesisStatus;
  highlightedLineIndices?: number[];
  warningMessage?: string | null;
}

export const RawLogEditor: React.FC<RawLogEditorProps> = ({
  rawLog,
  onChange,
  onSynthesize,
  onClear,
  status,
  highlightedLineIndices = [],
  warningMessage
}) => {
  const lines = rawLog ? rawLog.split('\n') : [];
  const lineCount = lines.length;
  const charCount = rawLog.length;

  return (
    <div className="h-full flex flex-col bg-slate-900/60 border-r border-slate-800 overflow-hidden">
      {/* Editor Header */}
      <div className="h-10 px-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">Raw Incident Log Stream</span>
          <span className="text-[10px] text-slate-500">
            ({lineCount} {lineCount === 1 ? 'line' : 'lines'}, {charCount} chars)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {rawLog.length > 0 && (
            <button
              onClick={onClear}
              disabled={status === 'loading'}
              className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
              title="Clear editor"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Warning Banner */}
      {warningMessage && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 font-mono flex items-center space-x-2 shrink-0">
          <span>⚠️ {warningMessage}</span>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 relative overflow-hidden bg-slate-950 font-mono text-xs flex">
        {/* Line Numbers */}
        <div className="w-12 py-3 bg-slate-950/80 border-r border-slate-800/60 text-slate-600 select-none text-right pr-2 shrink-0 overflow-hidden leading-relaxed font-mono">
          {lines.length > 0 ? (
            lines.map((_, i) => (
              <div
                key={i}
                className={`${
                  highlightedLineIndices.includes(i)
                    ? 'text-cyan-400 font-bold bg-cyan-500/10'
                    : ''
                }`}
              >
                {i + 1}
              </div>
            ))
          ) : (
            <div>1</div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={rawLog}
          onChange={(e) => onChange(e.target.value)}
          disabled={status === 'loading'}
          placeholder={`Paste chaotic Slack/Discord chat, Datadog alerts, or terminal outputs here...\n\nExample:\n[14:02:11] @datadog-bot: ALERT - PaymentService p99 > 4200ms\n[14:03:15] @marcus_oncall: Acknowledging. Traffic is 4x baseline.\n[14:06:20] @alex_backend: Redis memory alerts tripped earlier...\n\nOr click "Load Demo Incident" in the header to load our 42-minute Flash Sale incident.`}
          className="flex-1 p-3 bg-transparent text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none font-mono text-xs leading-relaxed overflow-y-auto selection:bg-cyan-500/30"
          spellCheck={false}
        />
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
        <div className="text-[11px] font-mono text-slate-500">
          {highlightedLineIndices.length > 0 ? (
            <span className="text-cyan-400">
              Highlighting lines {highlightedLineIndices.map(n => n + 1).join(', ')}
            </span>
          ) : (
            <span>Ready for synthesis</span>
          )}
        </div>

        <button
          id="synthesize-btn"
          onClick={onSynthesize}
          disabled={status === 'loading' || rawLog.trim().length === 0}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs tracking-wide transition-all shadow-md shadow-cyan-950/50 hover:shadow-cyan-900/40"
        >
          {status === 'loading' ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Synthesize Timeline</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
