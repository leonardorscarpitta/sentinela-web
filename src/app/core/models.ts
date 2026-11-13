export type Severity = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';

export type PiiCategory = 'IDENTIFICACAO' | 'SAUDE' | 'CREDENCIAL' | 'CONTATO' | 'FINANCEIRO';

export type RuleTarget = 'VALOR' | 'IDENTIFICADOR';

export type Validator = 'NENHUM' | 'CPF_DV' | 'CNS_DV' | 'LUHN';

export interface PiiRule {
  id: string;
  nome: string;
  categoria: PiiCategory;
  alvo: RuleTarget;
  padrao: string;
  validador: Validator;
  severidade: Severity;
  ativa: boolean;
  personalizada: boolean;
}

export interface CodeLocation {
  arquivo: string;
  linha: number;
  trecho: string;
}

export interface PiiFinding {
  id: string;
  regraId: string;
  categoria: PiiCategory;
  severidade: Severity;
  local: CodeLocation;
  evidenciaMascarada: string;
  tipo: 'DADO_LITERAL' | 'CAMPO_SENSIVEL';
}

export type SinkKind = 'LOG' | 'RESPOSTA_HTTP' | 'API_EXTERNA' | 'ARQUIVO' | 'EXCECAO';

export type FlowStatus = 'BLOQUEADO' | 'SANITIZADO';

export interface TaintStep extends CodeLocation {
  descricao: string;
}

export interface TaintFlow {
  id: string;
  categoria: PiiCategory;
  severidade: Severity;
  dado: string;
  origem: TaintStep;
  passos: TaintStep[];
  destino: TaintStep & { tipo: SinkKind };
  status: FlowStatus;
  sanitizador?: string;
}

export interface AiAlert {
  id: string;
  fluxoId: string;
  severidade: Severity;
  titulo: string;
  oQueAcontece: string;
  quemEAfetado: string;
  orientacaoCidadao: string;
  correcaoTecnica: string;
  patch: string;
}

export type ScanStatus = 'CONCLUIDA' | 'EM_ANDAMENTO' | 'FALHOU';

export type GateVerdict = 'BLOQUEADO' | 'APROVADO';

export interface Scan {
  id: string;
  projeto: string;
  versao: string;
  origem: 'APP_EXEMPLO' | 'UPLOAD_ZIP';
  iniciadaEm: string;
  duracaoMs: number;
  status: ScanStatus;
  arquivosAnalisados: number;
  riscoCidadao: number;
  veredito: GateVerdict;
  modeloIa: string;
  achados: PiiFinding[];
  fluxos: TaintFlow[];
  alertas: AiAlert[];
}

export const CATEGORY_LABEL: Record<PiiCategory, string> = {
  IDENTIFICACAO: 'Identificação',
  SAUDE: 'Saúde',
  CREDENCIAL: 'Credenciais',
  CONTATO: 'Contato',
  FINANCEIRO: 'Financeiro',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Média',
  BAIXA: 'Baixa',
};

export const SINK_LABEL: Record<SinkKind, string> = {
  LOG: 'Log da aplicação',
  RESPOSTA_HTTP: 'Resposta HTTP',
  API_EXTERNA: 'API externa',
  ARQUIVO: 'Arquivo em disco',
  EXCECAO: 'Mensagem de erro',
};

export const VALIDATOR_LABEL: Record<Validator, string> = {
  NENHUM: 'Nenhum',
  CPF_DV: 'Dígitos verificadores do CPF',
  CNS_DV: 'Dígito do Cartão SUS (CNS)',
  LUHN: 'Algoritmo de Luhn (cartão)',
};
