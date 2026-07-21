export interface CockpitPerson {
  name: string;
  path: string;
}

export interface CockpitBlockedBy {
  kind: 'date' | 'task' | string;
  raw: string;
  gate_date?: string;
}

export interface CockpitItemProject {
  key: string;
  path: string;
}

export interface CockpitItem {
  id: string;
  status: string;
  importance: string;
  importance_rank: number;
  domain: string;
  title: string;
  title_md: string;
  due: string | null;
  due_raw: string | null;
  due_key: string;
  people: CockpitPerson[];
  effort: string;
  created: string;
  touched: string;
  context_md: string;
  project: CockpitItemProject | null;
  blocked_by: CockpitBlockedBy | null;
  tags: string[];
}

export interface CockpitProjectRollup {
  open: number;
  mine: number;
  gated: number;
  next_due: string | null;
  item_ids: string[];
}

export interface CockpitProject {
  key: string;
  name: string;
  domain: string;
  status: string;
  aka: string[];
  path: string;
  body_md: string;
  rollup: CockpitProjectRollup;
}

export interface CockpitNeglectEntry {
  id: string;
  days: number;
  stage: string;
}

export interface CockpitOverview {
  counts: Record<string, number>;
  priority: Record<string, number>;
  last_run: string;
  count_drift: boolean;
  presence: {
    mode: string;
    vacation_until: string | null;
  };
  neglect_top: CockpitNeglectEntry[];
}

export interface CockpitQuestion {
  id?: string;
  domain?: string;
  text: string;
  ref?: string;
  created?: string;
}

export interface CockpitData {
  schema_version: number;
  generated_at: string;
  sources: Record<string, string>;
  overview: CockpitOverview;
  items: CockpitItem[];
  questions: CockpitQuestion[];
  projects: CockpitProject[];
  _warnings: string[];
}

export interface CockpitStatusDef {
  emoji: string;
  label_de: string;
}

export interface CockpitImportanceDef {
  emoji: string;
  rank: number;
  label_de: string;
}

export interface CockpitDomainDef {
  label: string;
  emoji: string;
  color?: string;
  text_color?: string;
}

export interface CockpitConfig {
  schema_version: number;
  generated_at: string;
  status: Record<string, CockpitStatusDef>;
  importance: Record<string, CockpitImportanceDef>;
  domain: Record<string, CockpitDomainDef>;
  tags: string[];
}
