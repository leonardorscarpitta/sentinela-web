// Tipos do contrato da sentinela-api (JSON camelCase, enums em minúsculas).

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type PiiCategory = 'identification' | 'health' | 'credential' | 'contact' | 'financial';
export type SinkKind = 'log' | 'httpResponse' | 'externalApi' | 'file' | 'exception';
export type PrivacyType = 'mapping' | 'flow';
export type TraceRole = 'source' | 'propagation' | 'sink';
export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';
export type Verdict = 'blocked' | 'approved';

export type FindingKind = 'vulnerability' | 'secret' | 'code' | 'config' | 'license' | 'privacy';
export type FindingStatus = 'open' | 'triaged' | 'falsePositive' | 'accepted' | 'fixed';

export type RunStatus = 'success' | 'failed' | 'running' | 'queued' | 'cancelled';
export type StageStatus = 'passed' | 'failed' | 'warning' | 'running' | 'pending' | 'skipped';
export type RunTrigger = 'push' | 'schedule' | 'manual' | 'mergeRequest';

export type Permission = 'viewFindings' | 'triage' | 'pipelines' | 'integrations' | 'team' | 'billing';

/* ---------- conta e organização ---------- */

export interface CurrentUser {
  username: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  platformAdmin: boolean;
}

export interface Membership {
  slug: string;
  name: string;
  role: string;
  permissions: Permission[];
  features: string[];
}

/* ---------- achados ---------- */

export interface TraceStep {
  role: TraceRole;
  path: string;
  line: number;
}

export interface PrivacyInfo {
  category: PiiCategory;
  type: PrivacyType;
  sink: SinkKind | null;
  trace: TraceStep[];
}

export interface FindingSummary {
  id: string;
  reference: string;
  kind: FindingKind;
  ruleId: string;
  cve: string | null;
  repository: string;
  repositoryRemoved: boolean;
  packageName: string | null;
  installedVersion: string | null;
  fixedVersion: string | null;
  title: string;
  cvss: number | null;
  severity: Severity;
  status: FindingStatus;
  stage: string | null;
  tool: string | null;
  location: { path: string; line: number | null } | null;
  detectedAt: string;
  statusChangedAt: string | null;
  dueAt: string | null;
  overdue: boolean;
  cwe: string | null;
  privacy?: PrivacyInfo | null;
}

export interface FindingEvent {
  type: string;
  status: FindingStatus | null;
  note: string | null;
  occurredAt: string;
}

export interface FindingDetails {
  finding: FindingSummary;
  description: string | null;
  vector: string | null;
  cwe: string | null;
  timeline: FindingEvent[];
  related: FindingSummary[];
}

export interface FindingFilter {
  q?: string;
  kind?: FindingKind;
  severity?: Severity;
  status?: FindingStatus;
  repository?: string;
}

export interface ChangeStatus {
  status: FindingStatus;
  note?: string;
  expiresAt?: string;
}

export interface CitizenAlert {
  title: string;
  whatHappens: string;
  whoIsAffected: string;
  citizenGuidance: string;
  technicalFix: string;
  severity: Severity;
  language: string;
  model: string;
  createdAt: string;
}

/* ---------- painel ---------- */

export interface RiskWeights {
  severity: Record<Severity, number>;
  category: Record<PiiCategory, number>;
  sink: Record<SinkKind, number>;
  latentFactor: number;
  saturation: number;
}

export interface CitizenRisk {
  score: number;
  level: RiskLevel;
  verdict: Verdict;
  openFlows: number;
  mappedData: number;
  citizenAlerts: number;
  repositories: number;
  byCategory: { category: PiiCategory; weight: number; flows: number; mapped: number }[];
  trend: { runNumber: number; repository: string; date: string; score: number }[];
  weights: RiskWeights;
}

export interface DashboardSummary {
  openFindings: number;
  criticalFindings: number;
  averageCvss: number;
  lastScanAt: string | null;
  repositories: number;
  bySeverity: { severity: Severity; count: number }[];
  recent: FindingSummary[];
  overdueFindings: number;
  byKind: { kind: FindingKind; count: number }[];
}

/* ---------- repositórios ---------- */

export type AccessStatus = 'pending' | 'verified' | 'failed';

export interface RepositorySummary {
  id: string;
  name: string;
  url: string;
  branch: string;
  stack: string | null;
  access: 'public' | 'ssh';
  accessStatus: AccessStatus | null;
  lastScanAt: string | null;
  openFindings: number | null;
}

export interface PipelineStage {
  id: string;
  phase: string;
  tools: string[];
  tool: string;
  enabled: boolean;
  failOn: string | null;
  available: boolean;
}

export interface RepositoryDetails {
  project: RepositorySummary;
  pipeline: PipelineStage[];
}

export interface AccessCheck {
  id: string;
  status: 'queued' | 'running' | 'ok' | 'failed';
  message: string | null;
  requestedAt: string;
  finishedAt: string | null;
}

export interface RepositoryAccess {
  type: 'public' | 'ssh';
  deployKey: { id: string; publicKey: string; fingerprint: string; createdAt: string; lastUsedAt: string | null } | null;
  host: string | null;
  hostKeyFingerprint: string | null;
  hostKeyPinned: boolean;
  lastCheck: AccessCheck | null;
}

/* ---------- varreduras ---------- */

export interface RunView {
  number: number;
  repository: string;
  repositoryRemoved: boolean;
  branch: string;
  commit: string | null;
  message: string | null;
  trigger: RunTrigger;
  actor: string | null;
  status: RunStatus;
  startedAt: string;
  durationSeconds: number;
  newFindings: number;
  totalFindings: number;
  failedByPolicy: boolean;
  quotaRefunded: boolean;
}

export interface StageRun {
  id: string;
  phase: string;
  tool: string;
  status: StageStatus;
  durationSeconds: number;
  findings: number;
  failedBy: Severity | null;
  log: string[];
}

export interface RunDetails {
  run: RunView;
  stages: StageRun[];
}

/* ---------- rótulos (pt-BR) ---------- */

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export const CATEGORY_LABEL: Record<PiiCategory, string> = {
  identification: 'Identificação',
  health: 'Saúde',
  credential: 'Credenciais',
  contact: 'Contato',
  financial: 'Financeiro',
};

export const SINK_LABEL: Record<SinkKind, string> = {
  externalApi: 'API externa',
  httpResponse: 'Resposta HTTP',
  log: 'Log da aplicação',
  exception: 'Mensagem de erro',
  file: 'Arquivo em disco',
};

export const KIND_LABEL: Record<FindingKind, string> = {
  privacy: 'Privacidade (PII)',
  vulnerability: 'Dependência vulnerável',
  secret: 'Segredo',
  code: 'Código (SAST)',
  config: 'Configuração',
  license: 'Licença',
};

export const STATUS_LABEL: Record<FindingStatus, string> = {
  open: 'Aberto',
  triaged: 'Em análise',
  falsePositive: 'Falso positivo',
  accepted: 'Risco aceito',
  fixed: 'Corrigido',
};

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  success: 'Aprovada',
  failed: 'Falhou',
  running: 'Em execução',
  queued: 'Na fila',
  cancelled: 'Cancelada',
};

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  passed: 'Passou',
  failed: 'Falhou',
  warning: 'Com alertas',
  running: 'Em execução',
  pending: 'Pendente',
  skipped: 'Ignorada',
};

export const STAGE_LABEL: Record<string, string> = {
  pii: 'Dados pessoais (PII)',
  secrets: 'Segredos',
  sast: 'SAST',
  sca: 'Dependências',
  license: 'Licenças',
  dockerfile: 'Dockerfile',
  image: 'Imagem',
  sbom: 'SBOM',
  iac: 'IaC',
  dast: 'DAST',
};

export const TRIGGER_LABEL: Record<RunTrigger, string> = {
  manual: 'Manual',
  push: 'Push',
  schedule: 'Agendada',
  mergeRequest: 'Merge request',
};

export const ACCESS_LABEL: Record<AccessStatus, string> = {
  pending: 'Aguardando chave',
  verified: 'Acesso verificado',
  failed: 'Acesso falhou',
};

export const ROLE_LABEL: Record<TraceRole, string> = {
  source: 'Origem',
  propagation: 'Propagação',
  sink: 'Destino',
};

/** Cor (token CSS) de cada estado, usada nos badges com ponto. */
export const TONE = {
  bad: 'var(--critical)',
  warn: 'var(--warning)',
  good: 'var(--good)',
  info: 'var(--accent)',
  neutral: 'var(--neutral)',
} as const;
