import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  Database,
  Key,
  Layers,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap
} from 'lucide-react';
import { SynthesisStatus } from '../types/incident';
import { AISettings, getStoredAISettings, saveAISettings } from '../services/synthesisService';
import { DEMO_PRESETS } from '../data/demoIncident';

interface TopNavbarProps {
  onLoadDemo: () => void;
  onSelectPreset: (presetId: 'flash_sale' | 'db_deadlock') => void;
  selectedPresetId: 'flash_sale' | 'db_deadlock';
  status: SynthesisStatus;
  isDemoLoaded: boolean;
  activeMode: 'offline_verified' | 'live_ai';
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onLoadDemo,
  onSelectPreset,
  selectedPresetId,
  status,
  isDemoLoaded,
  activeMode
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<AISettings>(getStoredAISettings);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPresetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveAISettings(settings);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      setIsSettingsOpen(false);
    }, 1200);
  };

  const currentPreset = DEMO_PRESETS.find(p => p.id === selectedPresetId) || DEMO_PRESETS[0];

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
                SRE Synthesizer
              </span>
            </div>
          </div>
        </div>

        {/* Engine Mode Status Badge */}
        <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all ${
              activeMode === 'live_ai'
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {activeMode === 'live_ai' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Engine: Live AI ({settings.model || 'gpt-4o-mini'})</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Engine: Demo Mode (Offline Verified)</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Multi-Scenario Preset Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="navbar-preset-dropdown-btn"
              onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
              disabled={status === 'loading'}
              className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md border bg-slate-800/90 border-slate-700 hover:border-cyan-500/50 text-slate-200 transition-all shadow-sm"
              title="Select incident scenario preset"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline font-mono text-[11px] text-cyan-300">Preset:</span>
              <span className="font-semibold text-slate-100">{currentPreset.title}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isPresetDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isPresetDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-30 animate-fadeIn space-y-1.5">
                <div className="px-2.5 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <span>Verified SRE Scenarios</span>
                  <span className="text-cyan-400">Deterministic</span>
                </div>
                {DEMO_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  const Icon = preset.id === 'flash_sale' ? Layers : Database;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPreset(preset.id);
                        setIsPresetDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start space-x-2.5 ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-100">{preset.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {preset.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Re-load Demo Button */}
          <button
            id="navbar-load-demo-btn"
            onClick={onLoadDemo}
            disabled={status === 'loading'}
            className={`hidden sm:flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-all ${
              isDemoLoaded
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 shadow-sm shadow-cyan-950/40'
            }`}
            title="Populate current scenario logs into editor"
          >
            <span>Load Logs</span>
          </button>

          {/* Settings Trigger */}
          <button
            id="settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            title="Configure AI API settings (optional)"
          >
            <Settings className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center space-x-1.5 text-xs text-slate-400 px-2 py-1 bg-slate-800/40 rounded border border-slate-800">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px] text-slate-300">v0.1.0-poc</span>
          </div>
        </div>
      </header>

      {/* Settings Modal Drawer */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">AI Extraction Engine Settings</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  LLM Provider
                </label>
                <select
                  value={settings.provider}
                  onChange={(e) =>
                    setSettings({ ...settings, provider: e.target.value as 'openai' | 'gemini' })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="openai">OpenAI (ChatCompletions API)</option>
                  <option value="gemini">Google Gemini (JSON Mode)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="sk-... or AIzaSy... (Leave empty for Offline Demo)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Stored securely in your browser's localStorage. Zero server tracking.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Model Identifier
                </label>
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  placeholder="gpt-4o-mini or gemini-1.5-pro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <span className="text-[11px] font-mono text-cyan-400">
                  {savedNotice && 'Settings saved!'}
                </span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors shadow-sm"
                  >
                    Save Configuration
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
