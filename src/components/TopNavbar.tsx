import React from 'react';
import { Activity, Clock, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { SynthesisStatus } from '../types/incident';

interface TopNavbarProps {
  onLoadDemo: () => void;
  status: SynthesisStatus;
  isDemoLoaded: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onLoadDemo, status, isDemoLoaded }) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-20 sticky top-0">
      {/* Brand & Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950">
          <Activity className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-100 tracking-tight text-base">IncidentLens</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 uppercase tracking-wider">
              SRE Synthesizer
            </span>
          </div>
        </div>
      </div>

      {/* Middle Status / Metadata */}
      <div className="hidden md:flex items-center space-x-4 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero-Telemetry Leak</span>
        </div>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>UTC Time Normalizer</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2.5">
        <button
          id="navbar-load-demo-btn"
          onClick={onLoadDemo}
          disabled={status === 'loading'}
          className={`flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md border transition-all ${
            isDemoLoaded
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 shadow-sm shadow-cyan-950/40'
          }`}
          title="Load pre-built realistic 40+ line Payment Gateway 504 outage log"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Load Demo Incident</span>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center space-x-1.5 text-xs text-slate-400 px-2 py-1 bg-slate-800/40 rounded border border-slate-800">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono text-[11px] text-slate-300">v0.1.0-poc</span>
        </div>
      </div>
    </header>
  );
};
