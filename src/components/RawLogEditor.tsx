import React, { useEffect, useRef, useState } from 'react';
import { Edit3, Eye, Play, RotateCcw, Terminal, X } from 'lucide-react';
import { SynthesisStatus } from '../types/incident';

interface RawLogEditorProps {
  rawLog: string;
  onChange: (val: string) => void;
  onSynthesize: () => void;
  onClear: () => void;
  status: SynthesisStatus;
  highlightedLineIndices?: number[];
  selectedEventSummary?: string | null;
  warningMessage?: string | null;
  onClearHighlight?: () => void;
}

export const RawLogEditor: React.FC<RawLogEditorProps> = ({
  rawLog,
  onChange,
  onSynthesize,
  onClear,
  status,
  highlightedLineIndices = [],
  selectedEventSummary,
  warningMessage,
  onClearHighlight
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const highlightedRef = useRef<HTMLDivElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inspectScrollRef = useRef<HTMLDivElement | null>(null);

  const lines = rawLog ? rawLog.split('\n') : [];
  const lineCount = lines.length;
  const charCount = rawLog.length;

  // Auto-scroll to first highlighted line when selection changes
  useEffect(() => {
    if (highlightedLineIndices.length > 0 && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [highlightedLineIndices]);

  // If user clears the log, revert to edit mode
  useEffect(() => {
    if (!rawLog) {
      setIsEditing(true);
    }
  }, [rawLog]);

  // Synchronize textarea vertical scroll with gutter
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

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
          {/* Mode toggle */}
          {rawLog.length > 0 && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                isEditing
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-slate-100'
              }`}
              title={isEditing ? 'Switch to interactive highlighted line viewer' : 'Edit raw log text'}
            >
              {isEditing ? (
                <>
                  <Eye className="w-3 h-3 text-cyan-400" />
                  <span>Inspect View</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3 text-slate-400" />
                  <span>Edit Raw</span>
                </>
              )}
            </button>
          )}

          {rawLog.length > 0 && (
            <button
              id="clear-btn"
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

      {/* Active Source Highlight Callout Banner */}
      {highlightedLineIndices.length > 0 && selectedEventSummary && (
        <div className="px-3.5 py-2 bg-cyan-950/40 border-b border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center justify-between shrink-0 animate-fadeIn">
          <div className="flex items-center space-x-2 truncate pr-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block shrink-0" />
            <span className="font-semibold text-cyan-200">
              Lines {highlightedLineIndices.map(n => n + 1).join(', ')}:
            </span>
            <span className="text-slate-300 truncate text-[11px]">
              {selectedEventSummary}
            </span>
          </div>
          {onClearHighlight && (
            <button
              onClick={onClearHighlight}
              className="text-cyan-400 hover:text-cyan-200 p-1 rounded hover:bg-cyan-900/40 shrink-0"
              title="Clear line highlight"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Optional Warning Banner */}
      {warningMessage && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 font-mono flex items-center space-x-2 shrink-0">
          <span>⚠️ {warningMessage}</span>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 relative overflow-hidden bg-slate-950 font-mono text-xs flex">
        {isEditing || lines.length === 0 ? (
          /* Editable Textarea Mode with Synchronized Gutter */
          <div className="flex w-full h-full overflow-hidden">
            {/* Gutter Line Numbers - Scroll synchronized to textarea */}
            <div
              ref={gutterRef}
              className="w-12 py-3 bg-slate-950/90 border-r border-slate-800/60 text-slate-600 select-none text-right pr-2 shrink-0 font-mono overflow-hidden"
            >
              {lines.length > 0 ? (
                lines.map((_, i) => (
                  <div key={i} className="h-6 leading-6 text-right pr-1">
                    {i + 1}
                  </div>
                ))
              ) : (
                <div className="h-6 leading-6 text-right pr-1">1</div>
              )}
            </div>

            {/* Native Textarea */}
            <textarea
              ref={textareaRef}
              id="raw-log-textarea"
              value={rawLog}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleTextareaScroll}
              disabled={status === 'loading'}
              placeholder={`Paste chaotic Slack/Discord chat, Datadog alerts, or terminal outputs here...\n\nExample:\n[14:02:11] @datadog-bot: ALERT - PaymentService p99 > 4200ms\n[14:03:15] @marcus_oncall: Acknowledging. Traffic is 4x baseline.\n[14:06:20] @alex_backend: Redis memory alerts tripped earlier...\n\nOr click "Load Demo Incident" in the header to load our 42-minute Flash Sale incident.`}
              className="flex-1 py-3 px-3 bg-transparent text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none font-mono text-xs leading-6 overflow-auto whitespace-pre selection:bg-cyan-500/30"
              spellCheck={false}
            />
          </div>
        ) : (
          /* Interactive Line Viewer Mode - Single Scroll Container */
          <div
            ref={inspectScrollRef}
            className="w-full h-full overflow-auto flex scroll-smooth"
          >
            {/* Gutter Column */}
            <div className="w-12 py-3 bg-slate-950 border-r border-slate-800/60 text-slate-600 select-none text-right pr-2 shrink-0 font-mono sticky left-0 z-10">
              {lines.map((_, i) => {
                const isHighlighted = highlightedLineIndices.includes(i);
                return (
                  <div
                    key={i}
                    className={`h-6 leading-6 flex items-center justify-end pr-1 transition-colors ${
                      isHighlighted
                        ? 'text-cyan-300 font-bold bg-cyan-500/20 rounded-l'
                        : 'text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>

            {/* Lines Column */}
            <div className="flex-1 py-3 overflow-x-auto">
              {lines.map((line, i) => {
                const isHighlighted = highlightedLineIndices.includes(i);
                const isFirstHighlighted = highlightedLineIndices[0] === i;

                return (
                  <div
                    key={i}
                    ref={isFirstHighlighted ? highlightedRef : null}
                    className={`h-6 leading-6 px-3 transition-colors flex items-center ${
                      isHighlighted
                        ? 'bg-cyan-500/15 border-l-2 border-cyan-400 text-cyan-200 font-medium'
                        : 'text-slate-300 hover:bg-slate-900/50'
                    }`}
                  >
                    <span className="whitespace-pre">{line || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2">
          {highlightedLineIndices.length > 0 ? (
            <span className="text-cyan-400 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>
                Source linked ({highlightedLineIndices.length} {highlightedLineIndices.length === 1 ? 'line' : 'lines'})
              </span>
            </span>
          ) : (
            <span className="text-slate-500">Ready for timeline synthesis</span>
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
