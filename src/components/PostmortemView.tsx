import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, CheckSquare, Copy, Download, FileText } from 'lucide-react';
import { SynthesizedIncident } from '../types/incident';

interface PostmortemViewProps {
  incident: SynthesizedIncident;
}

export const PostmortemView: React.FC<PostmortemViewProps> = ({ incident }) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJira, setCopiedJira] = useState(false);

  const handleCopyMd = async () => {
    try {
      await navigator.clipboard.writeText(incident.markdownReport);
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
      incident.actionItems.forEach((item) => {
        md += `- [ ] **[${item.priority}]** ${item.action} (Owner: ${item.owner})\n`;
      });
      await navigator.clipboard.writeText(md);
      setCopiedJira(true);
      setTimeout(() => setCopiedJira(false), 2000);
    } catch (err) {
      console.error('Failed to copy tasks', err);
    }
  };

  const handleDownloadMd = () => {
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
    <div className="h-full overflow-y-auto pt-4 px-6 pb-8 bg-slate-950">
      <div className="max-w-3xl mx-auto">
        {/* Top Toolbar Row */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-sm text-slate-200">incident-postmortem.md</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Audit Ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJira}
              className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              {copiedJira ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Tasks!</span>
                </>
              ) : (
                <span>Copy Jira Tasks</span>
              )}
            </button>
            <button
              onClick={handleDownloadMd}
              className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export .md</span>
            </button>
            <button
              onClick={handleCopyMd}
              className="px-3 py-1 text-xs rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedMd ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
          </div>
        </div>

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
                  Pre-formatted checklist with owners and priority badges
                </p>
              </div>
            </div>

            {/* Rendered Checklist Preview with styled dark checkboxes */}
            <div className="space-y-2">
              {incident.actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-850 text-xs font-mono"
                >
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-0.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
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
                    <p className="text-slate-300 text-xs font-sans leading-relaxed">
                      {item.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Markdown Postmortem Document */}
        <div className="prose prose-invert prose-slate prose-headings:font-sans prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-slate-800 prose-h2:pb-2 prose-h2:mt-6 prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-code:font-mono prose-code:text-[11px] prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-cyan-300 prose-table:text-xs prose-th:bg-slate-900 prose-th:px-3 prose-th:py-2 prose-th:text-slate-300 prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-slate-850">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {incident.markdownReport}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
