import { Injectable, signal } from '@angular/core';
import { PiiCategory, Severity, SinkKind } from './models';

// Catálogo das regras de PII do motor (Semgrep CE, `sentinela-api/scanner/rules/pii/`). As regras rodam
// no scanner; aqui ficam a descrição delas e uma versão em expressão regular das regras de mapeamento,
// usada só no teste local da página "Regras PII" (nada é enviado à API).

export type RuleTarget = 'valor' | 'identificador';
export type Validator = 'none' | 'cpf' | 'cns' | 'luhn';

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

export interface FlowRule {
  id: string;
  nome: string;
  categoria: PiiCategory;
  destino: SinkKind;
  severidade: Severity;
}

export const VALIDATOR_LABEL: Record<Validator, string> = {
  none: 'Nenhum',
  cpf: 'Dígitos verificadores do CPF',
  cns: 'Dígito do Cartão SUS (CNS)',
  luhn: 'Algoritmo de Luhn (cartão)',
};

export const MAPPING_RULES: PiiRule[] = [
  { id: 'pii-cpf-literal', nome: 'CPF literal', categoria: 'identification', alvo: 'valor', padrao: '\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b', validador: 'cpf', severidade: 'high', ativa: true, personalizada: false },
  { id: 'pii-cpf-field', nome: 'Campo de CPF / documento', categoria: 'identification', alvo: 'identificador', padrao: '^(cpf|rg|documento|registroGeral)$', validador: 'none', severidade: 'medium', ativa: true, personalizada: false },
  { id: 'pii-cns-literal', nome: 'Cartão Nacional de Saúde (CNS)', categoria: 'health', alvo: 'valor', padrao: '\\b[12789]\\d{2}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\b', validador: 'cns', severidade: 'high', ativa: true, personalizada: false },
  { id: 'pii-cid-literal', nome: 'Código CID-10', categoria: 'health', alvo: 'valor', padrao: '\\b[A-TV-Z]\\d{2}\\.\\d\\b', validador: 'none', severidade: 'medium', ativa: true, personalizada: false },
  { id: 'pii-health-field', nome: 'Campo de saúde', categoria: 'health', alvo: 'identificador', padrao: '^(cid10?|cns|diagnostico|sintomas?|laudo|prontuario|alergias?)$', validador: 'none', severidade: 'medium', ativa: true, personalizada: false },
  { id: 'pii-password-field', nome: 'Campo de senha', categoria: 'credential', alvo: 'identificador', padrao: '^(senha|password|passwd|pwd)$', validador: 'none', severidade: 'high', ativa: true, personalizada: false },
  { id: 'pii-credential-config', nome: 'Segredo em configuração', categoria: 'credential', alvo: 'valor', padrao: '(?:password|senha|secret|api[-_.]?key|token)\\s*[=:]\\s*\\S{6,}', validador: 'none', severidade: 'critical', ativa: true, personalizada: false },
  { id: 'pii-email-literal', nome: 'E-mail', categoria: 'contact', alvo: 'valor', padrao: '[\\w.+-]+@[\\w-]+\\.[\\w.]+', validador: 'none', severidade: 'low', ativa: true, personalizada: false },
  { id: 'pii-phone-literal', nome: 'Telefone celular', categoria: 'contact', alvo: 'valor', padrao: '\\(?\\b\\d{2}\\)?\\s?9\\d{4}-?\\d{4}\\b', validador: 'none', severidade: 'low', ativa: true, personalizada: false },
  { id: 'pii-contact-field', nome: 'Campo de contato', categoria: 'contact', alvo: 'identificador', padrao: '^(email|telefone|celular)$', validador: 'none', severidade: 'low', ativa: true, personalizada: false },
  { id: 'pii-card-literal', nome: 'Cartão de pagamento', categoria: 'financial', alvo: 'valor', padrao: '\\b(?:\\d[ -]?){13,19}\\b', validador: 'luhn', severidade: 'high', ativa: true, personalizada: false },
  { id: 'pii-card-field', nome: 'Campo de cartão', categoria: 'financial', alvo: 'identificador', padrao: '^(cartao|cardNumber|numeroCartao)$', validador: 'none', severidade: 'medium', ativa: true, personalizada: false },
];

export const FLOW_RULES: FlowRule[] = [
  { id: 'pii-flow-log', nome: 'PII escrita em log', categoria: 'identification', destino: 'log', severidade: 'high' },
  { id: 'pii-flow-http-response', nome: 'PII devolvida na resposta HTTP', categoria: 'credential', destino: 'httpResponse', severidade: 'high' },
  { id: 'pii-flow-health-external-api', nome: 'Dado de saúde enviado a API externa', categoria: 'health', destino: 'externalApi', severidade: 'critical' },
  { id: 'pii-flow-file', nome: 'PII gravada em arquivo', categoria: 'health', destino: 'file', severidade: 'high' },
  { id: 'pii-flow-exception', nome: 'PII em mensagem de exceção', categoria: 'contact', destino: 'exception', severidade: 'high' },
];

export const SANITIZERS = ['PiiMasker.*(…)', 'mask*(…)', 'hash*(…)', 'anonymize*(…) / anonymise*(…)'];

export const RULE_TESTER_SAMPLE = `# application.properties
spring.datasource.password=Bairr0Viv0@2026
analytics.api-key=ak_live_9f3c2e71d0

-- data.sql
INSERT INTO cidadao (nome, cpf, cns, email, telefone)
VALUES ('Maria Teste', '529.982.247-25', '700 0012 3456 7894',
        'maria.teste@example.com', '(11) 98765-4321');
INSERT INTO triagem (cidadao_id, cid10) VALUES (1, 'J45.0');

// CidadaoDto.java
private String cpf;
private String senha;
private String cartao = "4111 1111 1111 1111";`;

/** Regras do teste local (as personalizadas vivem só nesta aba). */
@Injectable({ providedIn: 'root' })
export class RulesCatalog {
  private readonly _rules = signal<PiiRule[]>(structuredClone(MAPPING_RULES));
  readonly rules = this._rules.asReadonly();

  add(rule: PiiRule): void {
    this._rules.update((list) => [...list.filter((r) => r.id !== rule.id), rule]);
  }

  toggle(id: string): void {
    this._rules.update((list) => list.map((r) => (r.id === id ? { ...r, ativa: !r.ativa } : r)));
  }

  remove(id: string): void {
    this._rules.update((list) => list.filter((r) => r.id !== id || !r.personalizada));
  }
}
