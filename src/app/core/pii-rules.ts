import { Injectable, signal } from '@angular/core';
import { PiiCategory, Severity, SinkKind } from './models';

// Catálogo das regras do estágio pii (Semgrep CE, `sentinela-api/scanner/rules/pii/`): mesmos ids, categorias,
// severidades e padrões. As regras rodam no scanner; aqui o mapeamento vira expressão regular só para o teste
// local da página "Regras PII" (nada é enviado à API). As regras de campo do Semgrep também conferem o tipo
// declarado (String, Long…) e algumas excluem nomes técnicos (passwordEncoder, emailTemplate…); o teste não.

export type RuleTarget = 'valor' | 'identificador';
export type Validator = 'none' | 'cpf' | 'cns' | 'luhn';

export interface PiiRule {
  id: string;
  nome: string;
  categoria: PiiCategory;
  alvo: RuleTarget;
  padrao: string;
  /** Flags extras da regex ('i' quando a regra do Semgrep usa (?i)). */
  flags: '' | 'i';
  validador: Validator;
  severidade: Severity;
  ativa: boolean;
  personalizada: boolean;
}

export interface FlowRule {
  categoria: PiiCategory;
  destino: SinkKind;
  severidade: Severity;
  linguagens: string;
}

export const VALIDATOR_LABEL: Record<Validator, string> = {
  none: 'Nenhum',
  cpf: 'Dígitos verificadores do CPF',
  cns: 'Dígito do Cartão SUS (CNS)',
  luhn: 'Algoritmo de Luhn (cartão)',
};

const rule = (r: Omit<PiiRule, 'ativa' | 'personalizada' | 'flags'> & { flags?: '' | 'i' }): PiiRule => ({
  flags: '',
  ...r,
  ativa: true,
  personalizada: false,
});

const ID_NAMES = 'cpf|rg|cns|cnh|nis|pis|passaporte|cartaoSus|cartao_sus|tituloEleitor|titulo_eleitor|dataNascimento|data_nascimento|nomeMae|nome_mae|CPF|RG|CNS|CNH|NIS|PIS';
const ID_CAMEL = 'Cpf|Rg|Cns|Cnh|Nis|Pis|Passaporte|CartaoSus|TituloEleitor|DataNascimento|NomeMae|CPF|RG|CNS|CNH|NIS|PIS';
const HEALTH_NAMES = 'cid|cid10|diagnostico|diagnosticos|diagnosis|sintoma|sintomas|symptom|symptoms|laudo|laudos|prontuario|alergia|alergias|comorbidade|comorbidades|medicamento|medicamentos|doenca|doencas|exame|exames|deficiencia|gestacao|hiv|CID|CID10|HIV';
const HEALTH_CAMEL = 'Cid|Diagnostico|Diagnosticos|Diagnosis|Sintoma|Sintomas|Symptom|Symptoms|Laudo|Laudos|Prontuario|Alergia|Alergias|Comorbidade|Comorbidades|Medicamento|Medicamentos|Doenca|Doencas|Exame|Exames|Deficiencia|Gestacao|Hiv|CID|HIV';
const field = (names: string, camel: string) => `(^|_)(${names})($|_|[A-Z0-9])|[a-z0-9](${camel})($|_|[A-Z0-9])`;

export const MAPPING_RULES: PiiRule[] = [
  // mapping-literals.yml — o valor em si (o scanner descarta CPF/CNS/cartão com dígito inválido)
  rule({ id: 'pii-literal-cpf', nome: 'CPF literal', categoria: 'identification', alvo: 'valor', padrao: '(?<![\\w.-])\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}(?![\\w-])', validador: 'cpf', severidade: 'medium' }),
  rule({ id: 'pii-literal-cns', nome: 'Cartão Nacional de Saúde (CNS)', categoria: 'health', alvo: 'valor', padrao: '(?<![\\w.-])[1-2789]\\d{2} \\d{4} \\d{4} \\d{4}(?![\\w-])', validador: 'cns', severidade: 'medium' }),
  rule({ id: 'pii-literal-payment-card', nome: 'Cartão de pagamento', categoria: 'financial', alvo: 'valor', padrao: '(?<![\\w.-])(?:4\\d{3}|5[1-5]\\d{2}|2[2-7]\\d{2}|6011)(?:[ -]?\\d{4}){3}(?![\\w-])', validador: 'luhn', severidade: 'medium' }),
  rule({ id: 'pii-literal-cid10', nome: 'Código CID-10 atribuído', categoria: 'health', alvo: 'valor', padrao: '\\bcid(?:[-_ ]?10)?\\b["\']?\\s*[:=]\\s*["\']?[A-TV-Z]\\d{2}(?:\\.\\d{1,2})?\\b', flags: 'i', validador: 'none', severidade: 'medium' }),
  rule({ id: 'pii-literal-email', nome: 'E-mail (exceto domínios de teste)', categoria: 'contact', alvo: 'valor', padrao: '(?<![\\w.%+-])[A-Za-z0-9._%+-]{1,64}@(?!(?:[\\w-]+\\.)*(?:example\\.(?:com|org|net)|localhost)\\b)[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,24}\\b', validador: 'none', severidade: 'low' }),
  rule({ id: 'pii-literal-phone-br', nome: 'Celular brasileiro', categoria: 'contact', alvo: 'valor', padrao: '(?<![\\w+])(?:\\+55\\s?)?\\(\\d{2}\\)\\s?9\\d{4}-\\d{4}(?!\\d)', validador: 'none', severidade: 'low' }),
  rule({ id: 'pii-config-credential', nome: 'Senha/segredo em configuração', categoria: 'credential', alvo: 'valor', padrao: '^[ \\t]*[\\w.-]*(?:password|passwd|pwd|senha|secret)[\\w.-]*[ \\t]*[:=][ \\t]*(?!\\$\\{|\\{\\{|<)["\']?[^\\s#"\']{4,}', flags: 'i', validador: 'none', severidade: 'high' }),
  // mapping-java.yml — campos e variáveis que carregam o dado (viram origem no taint analysis)
  rule({ id: 'pii-map-identification-field', nome: 'Campo de documento (CPF, RG, CNS…)', categoria: 'identification', alvo: 'identificador', padrao: field(ID_NAMES, ID_CAMEL), validador: 'none', severidade: 'low' }),
  rule({ id: 'pii-map-health-field', nome: 'Campo de saúde (CID, diagnóstico…)', categoria: 'health', alvo: 'identificador', padrao: field(HEALTH_NAMES, HEALTH_CAMEL), validador: 'none', severidade: 'medium' }),
  rule({ id: 'pii-map-credential-field', nome: 'Campo de senha', categoria: 'credential', alvo: 'identificador', padrao: field('senha|password|passwd|pwd|pin|SENHA|PASSWORD|PASSWD|PWD|PIN', 'Senha|Password|Passwd|Pwd|Pin|SENHA|PASSWORD|PIN'), validador: 'none', severidade: 'low' }),
  rule({ id: 'pii-map-contact-field', nome: 'Campo de contato', categoria: 'contact', alvo: 'identificador', padrao: field('telefone|celular|phone|email|e_mail|endereco|cep|whatsapp|logradouro|TELEFONE|PHONE|EMAIL|CEP', 'Telefone|Celular|Phone|Email|EMail|Endereco|Cep|Whatsapp|Logradouro|EMAIL|CEP'), validador: 'none', severidade: 'low' }),
  rule({ id: 'pii-map-financial-field', nome: 'Campo financeiro (cartão, conta, Pix…)', categoria: 'financial', alvo: 'identificador', padrao: field('cartao|cardNumber|card_number|creditCard|credit_card|cvv|cvc|iban|contaBancaria|conta_bancaria|chavePix|chave_pix|renda|salario|CVV|CVC|IBAN|PAN', 'Cartao|CardNumber|CreditCard|Cvv|Cvc|Iban|ContaBancaria|ChavePix|Renda|Salario|CVV|IBAN'), validador: 'none', severidade: 'low' }),
];

const ALL = 'Java, JS/TS, Python';
// flow-*.yml: uma regra por (tipo de dado, destino) — id pii-flow-<categoria>-<destino>[-js|-py].
export const FLOW_RULES: FlowRule[] = [
  { categoria: 'identification', destino: 'log', severidade: 'high', linguagens: ALL },
  { categoria: 'identification', destino: 'httpResponse', severidade: 'high', linguagens: ALL },
  { categoria: 'identification', destino: 'externalApi', severidade: 'high', linguagens: ALL },
  { categoria: 'identification', destino: 'file', severidade: 'high', linguagens: 'Java' },
  { categoria: 'identification', destino: 'exception', severidade: 'high', linguagens: 'Java' },
  { categoria: 'health', destino: 'log', severidade: 'high', linguagens: ALL },
  { categoria: 'health', destino: 'httpResponse', severidade: 'critical', linguagens: ALL },
  { categoria: 'health', destino: 'externalApi', severidade: 'critical', linguagens: ALL },
  { categoria: 'health', destino: 'file', severidade: 'high', linguagens: 'Java' },
  { categoria: 'health', destino: 'exception', severidade: 'high', linguagens: 'Java' },
  { categoria: 'credential', destino: 'log', severidade: 'critical', linguagens: ALL },
  { categoria: 'credential', destino: 'httpResponse', severidade: 'critical', linguagens: `${ALL} (+ entidade inteira na resposta, Java)` },
  { categoria: 'credential', destino: 'externalApi', severidade: 'critical', linguagens: ALL },
  { categoria: 'credential', destino: 'file', severidade: 'high', linguagens: 'Java' },
  { categoria: 'credential', destino: 'exception', severidade: 'high', linguagens: 'Java' },
  { categoria: 'contact', destino: 'log', severidade: 'high', linguagens: ALL },
  { categoria: 'contact', destino: 'httpResponse', severidade: 'high', linguagens: ALL },
  { categoria: 'contact', destino: 'externalApi', severidade: 'high', linguagens: ALL },
  { categoria: 'contact', destino: 'file', severidade: 'high', linguagens: 'Java' },
  { categoria: 'contact', destino: 'exception', severidade: 'high', linguagens: 'Java' },
  { categoria: 'financial', destino: 'log', severidade: 'high', linguagens: ALL },
  { categoria: 'financial', destino: 'httpResponse', severidade: 'critical', linguagens: ALL },
  { categoria: 'financial', destino: 'externalApi', severidade: 'critical', linguagens: ALL },
  { categoria: 'financial', destino: 'file', severidade: 'high', linguagens: 'Java' },
  { categoria: 'financial', destino: 'exception', severidade: 'high', linguagens: 'Java' },
];

export const SANITIZERS = ['PiiMasker.*(…)', 'mask*/mascarar*(…)', 'hash*(…)', 'anonymize*/anonimizar*(…)', 'pseudonymize*(…)', 'redact*(…)', 'encrypt*/criptografar*(…)'];

export const RULE_TESTER_SAMPLE = `# application.properties
spring.datasource.password=Bairr0Viv0@2026
analytics.client-secret=ak_live_9f3c2e71d0

-- data.sql
INSERT INTO cidadao (nome, cpf, cns, email, telefone)
VALUES ('Maria Teste', '529.982.247-25', '700 0012 3456 7894',
        'maria.teste@bairrovivo.org.br', '(11) 98765-4321');

// triagem.json
{ "cid10": "J45.0", "sintomas": "tosse" }

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
