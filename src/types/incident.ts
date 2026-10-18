export type EventType =
  | 'CRITICAL_ALERT'
  | 'TRIAGE'
  | 'FALSE_LEAD'
  | 'ROOT_CAUSE'
  | 'MITIGATION'
  | 'RESOLUTION';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  author: string;
  type: EventType;
  summary: string;
  rawSnippet: string;
  timeLostMinutes?: number;
  details?: string;
  sourceLineIndices?: number[]; // 0-indexed line numbers in raw log
}

export interface ExecutiveSummary {
  title: string;
  impact: string;
  ttdMinutes: number;
  ttrMinutes: number;
  triageTimeRatio: number; // e.g. 0.43 = 43% of total time spent on triage/false leads
}

export interface RootCause {
  summary: string;
  discoveredAt: string;
  discoveredBy: string;
}

export interface ActionItem {
  priority: 'P0' | 'P1' | 'P2';
  action: string;
  owner: string;
}

export interface SynthesizedIncident {
  executiveSummary: ExecutiveSummary;
  rootCause: RootCause;
  events: TimelineEvent[];
  actionItems: ActionItem[];
  markdownReport: string;
}

export type ViewMode = 'timeline' | 'postmortem';

export type SynthesisStatus = 'idle' | 'loading' | 'success' | 'error';
