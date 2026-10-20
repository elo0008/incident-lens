import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, CheckSquare, Copy, Download, FileText } from 'lucide-react';
import { SynthesizedIncident } from '../types/incident';
import { VerificationSummary } from '../services/synthesisService';

interface PostmortemViewProps {
  incident: SynthesizedIncident;
  verification?: VerificationSummary;
}

export const PostmortemView: React.FC<PostmortemViewProps> = ({ incident }) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJira, setCopiedJira] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Normalize literal \n strings to real newlines
  const formattedMarkdown = (incident.markdownReport || '').replace(/\\n/g, '\n');

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleCopyMd = async () => {
    try {
      await navigator.clipboard.writeText(formattedMarkdown);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown', err);
    }
  };

  const handleCopyJira = async () => {
    try {
      const title = incident.executiveSummary.title;
      let md = `### Incident Action Items: ${title}\n\n`;
      incident.actionItems.forEach((item, idx) => {
        const mark = checkedItems[idx] ? 'x' : ' ';
        md += `- [${mark}] **[${item.priority}]** ${item.action} (Owner: ${item.owner})\n`;
      });
      await navigator.clipboard.writeText(md);
      setCopiedJira(true);
      setTimeout(() => setCopiedJira(false), 2000);
    } catch (err) {
      console.error('Failed to copy tasks', err);
    }
  };

  const handleDownloadMd = () => {
    const blob = new Blob([formattedMarkdown], { type: 'text/markdown;charset=utf-8;' });
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
      {/* Pinned Top Toolbar Row */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-6 py-3">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: File icon + filename */}
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-mono text-sm text-slate-200 whitespace-nowrap truncate min-w-0">
              incident-postmortem.md
            </span>
          </div>

          {/* Right: Button Group */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyJira}
              className="h-8 px-3 text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-md font-medium min-w-[138px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-95 shadow-sm"
            >
              {copiedJira ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copied Tasks!</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Copy Jira Tasks</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadMd}
              className="h-8 px-3 text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-md font-medium min-w-[104px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-95 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Export .md</span>
            </button>
            <button
              onClick={handleCopyMd}
              className="h-8 px-3 text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-md font-medium min-w-[130px] bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500/40 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-95 shadow-sm shadow-cyan-950/40"
            >
              {copiedMd ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Remediation Action Items Section Card */}
          {incident.actionItems && incident.actionItems.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 pb-3 mb-6">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 font-mono">
                    Remediation Action Items ({incident.actionItems.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Interactive checklist with owners and priority badges
                  </p>
                </div>
              </div>

              {/* Rendered Checklist Preview with custom theme-compliant SVG toggle */}
              <div className="space-y-2">
                {incident.actionItems.map((item, idx) => {
                  const isChecked = !!checkedItems[idx];

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleCheck(idx)}
                      className={`flex items-center space-x-3 px-4 py-3.5 rounded-lg border text-xs font-mono transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-cyan-950/20 border-cyan-500/40'
                          : 'bg-slate-950/60 border-slate-850 hover:border-slate-700/80 hover:bg-slate-950/90'
                      }`}
                    >
                      {/* Custom Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCheck(idx);
                        }}
                        className={`group flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${
                          isChecked
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400'
                            : 'bg-slate-950/80 border-slate-700 text-transparent hover:border-slate-500 hover:bg-slate-900'
                        }`}
                      >
                        <svg
                          className={`h-3 w-3 transition-transform duration-150 ${
                            isChecked ? 'scale-100' : 'scale-0'
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.priority === 'P0'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : item.priority === 'P1'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {item.priority}
                          </span>
                          <span className="text-[11px] text-slate-400">{item.owner}</span>
                        </div>
                        <p
                          className={`text-xs font-sans leading-relaxed transition-colors ${
                            isChecked ? 'text-slate-400 line-through' : 'text-slate-200'
                          }`}
                        >
                          {item.action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Markdown Postmortem Document */}
          <div className="prose prose-invert prose-cyan max-w-none text-slate-300 font-sans leading-relaxed prose-headings:font-sans prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-slate-800 prose-h2:pb-2 prose-h2:mt-6 prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-code:font-mono prose-code:text-[11px] prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-cyan-300 prose-table:text-xs prose-th:bg-slate-900 prose-th:px-3 prose-th:py-2 prose-th:text-slate-300 prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-slate-850">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {formattedMarkdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
