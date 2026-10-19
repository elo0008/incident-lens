import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  Database,
  Key,
  Network,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { SynthesisStatus } from '../types/incident';
import {
  AIModel,
  AISettings,
  ALLOWED_MODELS,
  getStoredAISettings,
  saveAISettings
} from '../services/synthesisService';
import { DEMO_PRESETS } from '../data/demoIncident';

interface TopNavbarProps {
  onSelectPreset: (presetId: string) => void;
  status: SynthesisStatus;
  activePresetId: string | null;
  activeMode: 'offline_verified' | 'live_ai';
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onSelectPreset,
  status,
  activePresetId,
  activeMode
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<AISettings>(getStoredAISettings);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const presetDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(event.target as Node)) {
        setIsPresetMenuOpen(false);
      }
    };
    if (isPresetMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPresetMenuOpen]);

  // Sync settings when drawer opens
  useEffect(() => {
    if (isSettingsOpen) {
      setSettings(getStoredAISettings());
      setSavedNotice(false);
    }
  }, [isSettingsOpen]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveAISettings(settings);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      setIsSettingsOpen(false);
    }, 1200);
  };

  const currentPreset = activePresetId ? DEMO_PRESETS.find(p => p.id === activePresetId) : null;
  const hasApiKey = Boolean(settings.apiKey && settings.apiKey.trim().length > 0);

  // Compute engine badge display and tooltip
  const getEngineBadge = () => {
    if (!hasApiKey) {
      return {
        label: `Sample mode · ${DEMO_PRESETS.length} built-in incidents`,
        tooltip: 'Running in offline sample mode analyzing built-in verified sample incidents without API key.',
        style: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        icon: ShieldCheck,
        iconColor: 'text-emerald-400'
      };
    }
    if (activeMode === 'live_ai') {
      return {
        label: `Live AI · ${settings.model}`,
        tooltip: `Synthesized using live Gemini ${settings.model}.`,
        style: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
        icon: Zap,
        iconColor: 'text-cyan-400'
      };
    }
    return {
      label: `Live AI ready · ${settings.model}`,
      tooltip: `Gemini API key configured for ${settings.model}. Ready to analyze custom logs.`,
      style: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
      icon: Zap,
      iconColor: 'text-cyan-400'
    };
  };

  const engineBadge = getEngineBadge();
  const EngineIcon = engineBadge.icon;

  return (
    <>
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
                Outage chat → timeline
              </span>
            </div>
          </div>
        </div>

        {/* Engine Mode Status Badge */}
        <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
          <div
            title={engineBadge.tooltip}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all cursor-help ${engineBadge.style}`}
          >
            <EngineIcon className={`w-3.5 h-3.5 ${engineBadge.iconColor}`} />
            <span>{engineBadge.label}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Multi-Scenario Preset Dropdown */}
          <div className="relative" ref={presetDropdownRef}>
            <button
              id="navbar-preset-dropdown-btn"
              onClick={() => setIsPresetMenuOpen(!isPresetMenuOpen)}
              disabled={status === 'loading'}
              className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-950/40 transition-all"
              title="Select realistic verified incident scenario preset"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-100">
                {currentPreset ? `Sample: ${currentPreset.name}` : 'Sample: Load sample incident'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform ${isPresetMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isPresetMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-1.5 animate-fadeIn">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Built-in samples</span>
                  <span className="text-cyan-400">Offline Verified</span>
                </div>

                <div className="p-1 space-y-1">
                  {DEMO_PRESETS.map((preset) => {
                    const isSelected = activePresetId === preset.id;
                    const Icon = preset.id === 'db_deadlock' ? Database : Network;

                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onSelectPreset(preset.id);
                          setIsPresetMenuOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start space-x-2.5 ${
                          isSelected
                            ? 'bg-cyan-500/15 border border-cyan-500/30 text-slate-100'
                            : 'hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 border border-transparent'
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-md ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-100">{preset.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{preset.subtitle}</p>
                          <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-cyan-300 border border-slate-700/60">
                            {preset.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Settings Trigger */}
          <button
            id="settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            title="Configure AI API settings (optional)"
          >
            <Settings className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>
        </div>
      </header>

      {/* Settings Modal Drawer */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">Analyze your own logs</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Gemini API key (free from Google AI Studio: aistudio.google.com/apikey)
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="AIzaSy... (Leave empty for Sample Mode)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Without an API key, IncidentLens analyzes all built-in sample incidents. To synthesize your own custom logs, add a Gemini API key. Your key is stored exclusively in this browser's localStorage and is sent directly to Google.
                </p>
              </div>

              {/* Privacy Warning */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Free-tier Gemini requests may be used by Google to improve its products. Don't paste confidential logs.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Model</label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value as AIModel })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {ALLOWED_MODELS.map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-mono">
                  {savedNotice ? '✓ Saved settings!' : ''}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-mono transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Settings</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
