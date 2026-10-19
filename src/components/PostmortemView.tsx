import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Download, FileText, Sparkles } from 'lucide-react';
import { SynthesizedIncident } from '../types/incident';

interface PostmortemViewProps {
  incident: SynthesizedIncident;
}

export const PostmortemView: React.FC<PostmortemViewProps> = ({ incident }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(incident.markdownReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([incident.markdownReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'incident-postmortem.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Document Header */}
      <div className="h-12 px-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">
            incident-postmortem.md
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Audit Ready
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-mono text-slate-300 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 transition-colors"
            title="Download markdown document file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export .md</span>
          </button>

          <button
            id="copy-markdown-btn"
            onClick={handleCopy}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium border transition-all ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-200 shadow-sm shadow-cyan-950/40'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rendered Document Viewport */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
        <div className="max-w-3xl mx-auto prose prose-invert prose-slate prose-headings:font-sans prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-slate-800 prose-h2:pb-2 prose-h2:mt-6 prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-code:font-mono prose-code:text-[11px] prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-cyan-300 prose-table:text-xs prose-th:bg-slate-900 prose-th:px-3 prose-th:py-2 prose-th:text-slate-300 prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-slate-850">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {incident.markdownReport}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
