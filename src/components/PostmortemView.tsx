import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, CheckSquare, Copy, Download, FileText, ListTodo, ShieldAlert } from 'lucide-react';
import { SynthesizedIncident } from '../types/incident';

interface PostmortemViewProps {
  incident: SynthesizedIncident;
}

export const PostmortemView: React.FC<PostmortemViewProps> = ({ incident }) => {
  const [copiedDoc, setCopiedDoc] = useState<boolean>(false);
  const [copiedTasks, setCopiedTasks] = useState<boolean>(false);

  const generateTasksMarkdown = (): string => {
    const title = incident.executiveSummary.title;
    let md = `### Incident Action Items: ${title}\n\n`;
    incident.actionItems.forEach((item) => {
      md += `- [ ] **[${item.priority}]** ${item.action} (Owner: ${item.owner})\n`;
    });
    return md;
  };

  const handleCopyDoc = async () => {
    try {
      await navigator.clipboard.writeText(incident.markdownReport);
      setCopiedDoc(true);
      setTimeout(() => setCopiedDoc(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleCopyTasks = async () => {
    try {
      const tasksMarkdown = generateTasksMarkdown();
      await navigator.clipboard.writeText(tasksMarkdown);
      setCopiedTasks(true);
      setTimeout(() => setCopiedTasks(false), 2500);
    } catch (err) {
      console.error('Failed to copy tasks to clipboard', err);
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
      <div className="h-12 px-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 flex-wrap gap-2">
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
          {/* Quick Jira/GitHub Tasks Export in Header */}
          <button
            id="copy-tasks-header-btn"
            onClick={handleCopyTasks}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-medium border transition-all ${
              copiedTasks
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950'
                : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-300 hover:text-cyan-300 shadow-sm'
            }`}
            title="Export clean markdown checklist for Jira / GitHub Issues"
          >
            {copiedTasks ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied Tasks!</span>
              </>
            ) : (
              <>
                <ListTodo className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Copy Jira/GitHub Tasks</span>
                <span className="sm:hidden">Tasks</span>
              </>
            )}
          </button>

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
            onClick={handleCopyDoc}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium border transition-all ${
              copiedDoc
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-200 shadow-sm shadow-cyan-950/40'
            }`}
          >
            {copiedDoc ? (
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
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 space-y-6">
        {/* Dedicated Action Items Export Card */}
        {incident.actionItems && incident.actionItems.length > 0 && (
          <div className="max-w-3xl mx-auto p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 font-mono">
                    Remediation Action Items ({incident.actionItems.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    One-click export formatted as ready-to-paste markdown checklist for Jira / GitHub / Linear
                  </p>
                </div>
              </div>

              <button
                id="copy-tasks-section-btn"
                onClick={handleCopyTasks}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                  copiedTasks
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-950'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-950/40'
                }`}
              >
                {copiedTasks ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Checklist!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copy Action Items as GitHub/Jira Tasks</span>
                  </>
                )}
              </button>
            </div>

            {/* Rendered Checklist Preview */}
            <div className="space-y-2">
              {incident.actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-850 text-xs font-mono"
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={false}
                    className="mt-1 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-default"
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
        <div className="max-w-3xl mx-auto prose prose-invert prose-slate prose-headings:font-sans prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-slate-800 prose-h2:pb-2 prose-h2:mt-6 prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-code:font-mono prose-code:text-[11px] prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-cyan-300 prose-table:text-xs prose-th:bg-slate-900 prose-th:px-3 prose-th:py-2 prose-th:text-slate-300 prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-slate-850">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {incident.markdownReport}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
