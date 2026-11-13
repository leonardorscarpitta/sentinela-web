// Dados simulados. Nenhum dado pessoal real: CPF 529.982.247-25 e CNS
// 700 0012 3456 7894 são números de teste com dígito verificador válido.
import { AiAlert, PiiFinding, PiiRule, Scan, TaintFlow } from './models';
import { citizenRisk } from './risk';

export const SAMPLE_PROJECT = 'bairro-vivo';

const PKG = 'src/main/java/br/org/bairrovivo';

export const DEFAULT_RULES: PiiRule[] = [
  { id: 'cpf-valor', nome: 'CPF literal', categoria: 'IDENTIFICACAO', alvo: 'VALOR', padrao: '\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b', validador: 'CPF_DV', severidade: 'ALTA', ativa: true, personalizada: false },
  { id: 'cpf-campo', nome: 'Campo de CPF / documento', categoria: 'IDENTIFICACAO', alvo: 'IDENTIFICADOR', padrao: 'cpf|documento|rg$|registroGeral', validador: 'NENHUM', severidade: 'MEDIA', ativa: true, personalizada: false },
  { id: 'cns-valor', nome: 'Cartão Nacional de Saúde (CNS)', categoria: 'SAUDE', alvo: 'VALOR', padrao: '\\b[12789]\\d{2}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\b', validador: 'CNS_DV', severidade: 'ALTA', ativa: true, personalizada: false },
  { id: 'cid-valor', nome: 'Código CID-10', categoria: 'SAUDE', alvo: 'VALOR', padrao: '\\b[A-TV-Z]\\d{2}\\.\\d\\b', validador: 'NENHUM', severidade: 'MEDIA', ativa: true, personalizada: false },
  { id: 'saude-campo', nome: 'Campo de saúde', categoria: 'SAUDE', alvo: 'IDENTIFICADOR', padrao: 'cid10?|diagnostico|sintoma|laudo|prontuario|alergia|cns', validador: 'NENHUM', severidade: 'MEDIA', ativa: true, personalizada: false },
  { id: 'senha-campo', nome: 'Campo de senha', categoria: 'CREDENCIAL', alvo: 'IDENTIFICADOR', padrao: 'senha|password|passwd|pwd', validador: 'NENHUM', severidade: 'ALTA', ativa: true, personalizada: false },
  { id: 'segredo-valor', nome: 'Segredo em configuração', categoria: 'CREDENCIAL', alvo: 'VALOR', padrao: '(?:password|senha|secret|api[-_.]?key|token)\\s*[=:]\\s*\\S{6,}', validador: 'NENHUM', severidade: 'CRITICA', ativa: true, personalizada: false },
  { id: 'email-valor', nome: 'E-mail', categoria: 'CONTATO', alvo: 'VALOR', padrao: '[\\w.+-]+@[\\w-]+\\.[\\w.]+', validador: 'NENHUM', severidade: 'BAIXA', ativa: true, personalizada: false },
  { id: 'telefone-valor', nome: 'Telefone celular', categoria: 'CONTATO', alvo: 'VALOR', padrao: '\\(?\\b\\d{2}\\)?\\s?9\\d{4}-?\\d{4}\\b', validador: 'NENHUM', severidade: 'BAIXA', ativa: true, personalizada: false },
  { id: 'cartao-valor', nome: 'Cartão de pagamento', categoria: 'FINANCEIRO', alvo: 'VALOR', padrao: '\\b(?:\\d[ -]?){13,19}\\b', validador: 'LUHN', severidade: 'ALTA', ativa: true, personalizada: false },
];

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

interface VersionedFlow extends TaintFlow {
  desde: number;
  ate?: number;
}

const FLOWS: VersionedFlow[] = [
  {
    id: 'TF-01', desde: 0, ate: 4, categoria: 'IDENTIFICACAO', severidade: 'ALTA', dado: 'CPF', status: 'BLOQUEADO',
    origem: { arquivo: `${PKG}/cidadao/CidadaoController.java`, linha: 31, trecho: 'public ResponseEntity<Void> cadastrar(@RequestBody CidadaoDto dto)', descricao: 'Corpo da requisição de cadastro' },
    passos: [{ arquivo: `${PKG}/cidadao/CidadaoController.java`, linha: 33, trecho: 'String cpf = dto.getCpf();', descricao: 'Atribuição propaga a marca' }],
    destino: { tipo: 'LOG', arquivo: `${PKG}/cidadao/CidadaoController.java`, linha: 34, trecho: 'log.info("Novo cadastro CPF={}", cpf);', descricao: 'Escrito em texto puro no log' },
  },
  {
    id: 'TF-02', desde: 0, categoria: 'SAUDE', severidade: 'CRITICA', dado: 'CID-10 e sintomas', status: 'BLOQUEADO',
    origem: { arquivo: `${PKG}/saude/TriagemController.java`, linha: 24, trecho: 'public TriagemResposta registrar(@RequestBody TriagemDto triagem)', descricao: 'Formulário de triagem da UBS' },
    passos: [
      { arquivo: `${PKG}/saude/TriagemService.java`, linha: 47, trecho: 'evento.put("cid", triagem.getCid10());', descricao: 'Copiado para o mapa do evento' },
      { arquivo: `${PKG}/saude/TriagemService.java`, linha: 48, trecho: 'evento.put("sintomas", triagem.getSintomas());', descricao: 'Copiado para o mapa do evento' },
      { arquivo: `${PKG}/integracao/AnalyticsClient.java`, linha: 19, trecho: 'public void enviar(Map<String, Object> evento)', descricao: 'Chamada interprocedural' },
    ],
    destino: { tipo: 'API_EXTERNA', arquivo: `${PKG}/integracao/AnalyticsClient.java`, linha: 21, trecho: 'rest.postForObject("http://analytics.parceiro.example/eventos", evento, Void.class);', descricao: 'Enviado sem TLS para terceiro' },
  },
  {
    id: 'TF-03', desde: 0, ate: 4, categoria: 'CREDENCIAL', severidade: 'ALTA', dado: 'Hash de senha', status: 'BLOQUEADO',
    origem: { arquivo: `${PKG}/cidadao/CidadaoRepository.java`, linha: 12, trecho: 'Optional<Cidadao> findById(Long id);', descricao: 'Entidade completa vinda do banco' },
    passos: [{ arquivo: `${PKG}/cidadao/CidadaoService.java`, linha: 58, trecho: 'return repo.findById(id).orElseThrow();', descricao: 'Entidade retornada sem DTO' }],
    destino: { tipo: 'RESPOSTA_HTTP', arquivo: `${PKG}/cidadao/CidadaoController.java`, linha: 45, trecho: 'return ResponseEntity.ok(service.buscar(id));', descricao: 'Campo "senha" serializado no JSON' },
  },
  {
    id: 'TF-04', desde: 1, categoria: 'CONTATO', severidade: 'MEDIA', dado: 'Telefone', status: 'BLOQUEADO',
    origem: { arquivo: `${PKG}/chamado/ChamadoController.java`, linha: 28, trecho: 'public Chamado abrir(@RequestBody ChamadoDto dto)', descricao: 'Abertura de chamado de zeladoria' },
    passos: [{ arquivo: `${PKG}/chamado/ChamadoService.java`, linha: 36, trecho: 'String telefone = dto.getTelefone();', descricao: 'Atribuição propaga a marca' }],
    destino: { tipo: 'EXCECAO', arquivo: `${PKG}/chamado/ChamadoService.java`, linha: 39, trecho: 'throw new IllegalArgumentException("Telefone inválido: " + telefone);', descricao: 'Mensagem devolvida ao cliente pelo handler' },
  },
  {
    id: 'TF-05', desde: 1, categoria: 'IDENTIFICACAO', severidade: 'ALTA', dado: 'CPF', status: 'SANITIZADO', sanitizador: 'PiiMasker.cpf()',
    origem: { arquivo: `${PKG}/chamado/ChamadoController.java`, linha: 28, trecho: 'public Chamado abrir(@RequestBody ChamadoDto dto)', descricao: 'Abertura de chamado de zeladoria' },
    passos: [{ arquivo: `${PKG}/chamado/ChamadoService.java`, linha: 41, trecho: 'String cpfSeguro = PiiMasker.cpf(dto.getCpf());', descricao: 'Sanitizador remove a marca' }],
    destino: { tipo: 'LOG', arquivo: `${PKG}/chamado/ChamadoService.java`, linha: 42, trecho: 'log.info("Chamado aberto por {}", cpfSeguro);', descricao: 'Valor mascarado: ***.***.*47-25' },
  },
  {
    id: 'TF-06', desde: 2, categoria: 'SAUDE', severidade: 'ALTA', dado: 'Cartão SUS (CNS)', status: 'BLOQUEADO',
    origem: { arquivo: `${PKG}/saude/TriagemRepository.java`, linha: 15, trecho: 'List<Triagem> findByUnidade(String ubs);', descricao: 'Triagens da unidade' },
    passos: [{ arquivo: `${PKG}/saude/TriagemService.java`, linha: 72, trecho: 'linha.append(t.getCns()).append(";").append(t.getCid10());', descricao: 'Concatenação propaga a marca' }],
    destino: { tipo: 'ARQUIVO', arquivo: `${PKG}/saude/TriagemService.java`, linha: 75, trecho: 'Files.writeString(Path.of("/tmp/export-ubs.csv"), linha);', descricao: 'Arquivo em diretório compartilhado' },
  },
  {
    id: 'TF-07', desde: 0, ate: 1, categoria: 'CREDENCIAL', severidade: 'CRITICA', dado: 'Senha em texto puro', status: 'BLOQUEADO',
    origem: { arquivo: `${PKG}/auth/LoginController.java`, linha: 22, trecho: 'public Token login(@RequestBody LoginDto login)', descricao: 'Formulário de login' },
    passos: [],
    destino: { tipo: 'LOG', arquivo: `${PKG}/auth/LoginController.java`, linha: 24, trecho: 'log.debug("login {} / {}", login.getEmail(), login.getSenha());', descricao: 'Senha registrada no log' },
  },
  {
    id: 'TF-08', desde: 0, ate: 2, categoria: 'IDENTIFICACAO', severidade: 'ALTA', dado: 'CPF', status: 'BLOQUEADO',
    origem: { arquivo: `${PKG}/chamado/ChamadoController.java`, linha: 28, trecho: 'public Chamado abrir(@RequestBody ChamadoDto dto)', descricao: 'Abertura de chamado de zeladoria' },
    passos: [{ arquivo: `${PKG}/integracao/GeoClient.java`, linha: 17, trecho: 'String url = BASE + "?ref=" + dto.getCpf();', descricao: 'CPF usado como parâmetro de URL' }],
    destino: { tipo: 'API_EXTERNA', arquivo: `${PKG}/integracao/GeoClient.java`, linha: 18, trecho: 'rest.getForObject(url, Endereco.class);', descricao: 'Exposto na URL de serviço de mapas' },
  },
  {
    id: 'TF-09', desde: 0, ate: 3, categoria: 'SAUDE', severidade: 'ALTA', dado: 'Diagnóstico', status: 'BLOQUEADO',
    origem: { arquivo: `${PKG}/saude/TriagemController.java`, linha: 24, trecho: 'public TriagemResposta registrar(@RequestBody TriagemDto triagem)', descricao: 'Formulário de triagem da UBS' },
    passos: [],
    destino: { tipo: 'EXCECAO', arquivo: `${PKG}/saude/TriagemService.java`, linha: 30, trecho: 'throw new TriagemException("CID não suportado: " + triagem.getCid10());', descricao: 'Diagnóstico ecoado na mensagem de erro' },
  },
];

const FINDINGS: (PiiFinding & { desde: number; ate?: number })[] = [
  { id: 'PII-01', desde: 0, regraId: 'segredo-valor', categoria: 'CREDENCIAL', severidade: 'CRITICA', tipo: 'DADO_LITERAL', evidenciaMascarada: 'spring.datasource.password=*************26', local: { arquivo: 'src/main/resources/application.properties', linha: 7, trecho: 'spring.datasource.password=…' } },
  { id: 'PII-02', desde: 1, regraId: 'segredo-valor', categoria: 'CREDENCIAL', severidade: 'CRITICA', tipo: 'DADO_LITERAL', evidenciaMascarada: 'analytics.api-key=*********d0', local: { arquivo: 'src/main/resources/application.properties', linha: 12, trecho: 'analytics.api-key=…' } },
  { id: 'PII-03', desde: 0, regraId: 'cpf-valor', categoria: 'IDENTIFICACAO', severidade: 'ALTA', tipo: 'DADO_LITERAL', evidenciaMascarada: '***.***.***-25', local: { arquivo: 'src/main/resources/data.sql', linha: 4, trecho: "VALUES ('Maria Teste', '…'" } },
  { id: 'PII-04', desde: 0, regraId: 'cns-valor', categoria: 'SAUDE', severidade: 'ALTA', tipo: 'DADO_LITERAL', evidenciaMascarada: '*** **** **** **94', local: { arquivo: 'src/main/resources/data.sql', linha: 4, trecho: "'…', '700 …'" } },
  { id: 'PII-05', desde: 0, regraId: 'email-valor', categoria: 'CONTATO', severidade: 'BAIXA', tipo: 'DADO_LITERAL', evidenciaMascarada: '***********@*********om', local: { arquivo: 'src/main/resources/data.sql', linha: 5, trecho: "'…@example.com'" } },
  { id: 'PII-06', desde: 0, regraId: 'cpf-campo', categoria: 'IDENTIFICACAO', severidade: 'MEDIA', tipo: 'CAMPO_SENSIVEL', evidenciaMascarada: 'cpf', local: { arquivo: `${PKG}/cidadao/CidadaoDto.java`, linha: 14, trecho: 'private String cpf;' } },
  { id: 'PII-07', desde: 0, regraId: 'senha-campo', categoria: 'CREDENCIAL', severidade: 'ALTA', tipo: 'CAMPO_SENSIVEL', evidenciaMascarada: 'senha', local: { arquivo: `${PKG}/cidadao/Cidadao.java`, linha: 29, trecho: 'private String senha;' } },
  { id: 'PII-08', desde: 0, regraId: 'saude-campo', categoria: 'SAUDE', severidade: 'MEDIA', tipo: 'CAMPO_SENSIVEL', evidenciaMascarada: 'cid10', local: { arquivo: `${PKG}/saude/TriagemDto.java`, linha: 11, trecho: 'private String cid10;' } },
  { id: 'PII-09', desde: 0, regraId: 'saude-campo', categoria: 'SAUDE', severidade: 'MEDIA', tipo: 'CAMPO_SENSIVEL', evidenciaMascarada: 'sintomas', local: { arquivo: `${PKG}/saude/TriagemDto.java`, linha: 12, trecho: 'private String sintomas;' } },
  { id: 'PII-10', desde: 1, regraId: 'telefone-valor', categoria: 'CONTATO', severidade: 'BAIXA', tipo: 'DADO_LITERAL', evidenciaMascarada: '(**) *****-**21', local: { arquivo: 'src/main/resources/data.sql', linha: 5, trecho: "'(11) …'" } },
  { id: 'PII-11', desde: 2, regraId: 'saude-campo', categoria: 'SAUDE', severidade: 'MEDIA', tipo: 'CAMPO_SENSIVEL', evidenciaMascarada: 'cns', local: { arquivo: `${PKG}/saude/Triagem.java`, linha: 18, trecho: 'private String cns;' } },
  { id: 'PII-12', desde: 0, ate: 2, regraId: 'cid-valor', categoria: 'SAUDE', severidade: 'MEDIA', tipo: 'DADO_LITERAL', evidenciaMascarada: '***.0', local: { arquivo: 'src/main/resources/data.sql', linha: 9, trecho: "VALUES (1, '…')" } },
];

const ALERTS: AiAlert[] = [
  {
    id: 'IA-01', fluxoId: 'TF-01', severidade: 'ALTA',
    titulo: 'Seu CPF fica guardado nos registros internos do sistema',
    oQueAcontece: 'Quando um morador faz o cadastro, o número do CPF é gravado por inteiro nos arquivos de log. Qualquer pessoa da equipe técnica ou ferramenta de monitoramento com acesso a esses arquivos consegue ler o CPF.',
    quemEAfetado: 'Todos os moradores que se cadastram no aplicativo.',
    orientacaoCidadao: 'Não há ação necessária do morador. A equipe responsável foi avisada e a publicação desta versão está bloqueada até a correção.',
    correcaoTecnica: 'Não registre o CPF no log. Se o registro for necessário para auditoria, use o valor mascarado.',
    patch: '- log.info("Novo cadastro CPF={}", cpf);\n+ log.info("Novo cadastro CPF={}", PiiMasker.cpf(cpf));',
  },
  {
    id: 'IA-02', fluxoId: 'TF-02', severidade: 'CRITICA',
    titulo: 'Informações de saúde são enviadas a uma empresa parceira sem proteção',
    oQueAcontece: 'O diagnóstico (CID) e os sintomas informados na triagem da UBS são enviados para um serviço de estatísticas de outra empresa, por uma conexão sem criptografia. No caminho, esses dados podem ser lidos por terceiros.',
    quemEAfetado: 'Moradores que passaram pela triagem de saúde comunitária.',
    orientacaoCidadao: 'Dados de saúde são dados sensíveis pela LGPD (art. 11). A unidade deve informar o encarregado de dados e interromper o envio imediatamente.',
    correcaoTecnica: 'Envie apenas dados agregados e anonimizados, e use HTTPS. Remova CID e sintomas do evento.',
    patch: '- evento.put("cid", triagem.getCid10());\n- evento.put("sintomas", triagem.getSintomas());\n+ evento.put("faixaEtaria", triagem.faixaEtaria());\n+ evento.put("ubs", triagem.getUbs());\n- rest.postForObject("http://analytics.parceiro.example/eventos", …)\n+ rest.postForObject("https://analytics.parceiro.example/eventos", …)',
  },
  {
    id: 'IA-03', fluxoId: 'TF-03', severidade: 'ALTA',
    titulo: 'A senha (mesmo criptografada) aparece na consulta de perfil',
    oQueAcontece: 'Ao abrir o próprio perfil, o sistema devolve todos os campos do cadastro, incluindo a senha protegida por hash. Com ela, um atacante pode tentar descobrir a senha original por tentativa e erro.',
    quemEAfetado: 'Todos os moradores com conta no aplicativo.',
    orientacaoCidadao: 'Por precaução, troque sua senha após a correção e não reutilize a mesma senha em outros serviços.',
    correcaoTecnica: 'Retorne um DTO de resposta sem o campo senha, em vez da entidade JPA.',
    patch: '- return ResponseEntity.ok(service.buscar(id));\n+ return ResponseEntity.ok(CidadaoResposta.de(service.buscar(id)));',
  },
  {
    id: 'IA-04', fluxoId: 'TF-04', severidade: 'MEDIA',
    titulo: 'O telefone aparece na mensagem de erro do aplicativo',
    oQueAcontece: 'Se o telefone for digitado em formato inesperado, a mensagem de erro mostra o número completo. Essa mensagem pode ficar salva em histórico do navegador, em capturas de tela ou em ferramentas de suporte.',
    quemEAfetado: 'Moradores que abrem chamados de zeladoria.',
    orientacaoCidadao: 'Nenhuma ação necessária. O risco é baixo, mas a correção já foi indicada.',
    correcaoTecnica: 'Use mensagens de erro genéricas, sem ecoar o valor recebido.',
    patch: '- throw new IllegalArgumentException("Telefone inválido: " + telefone);\n+ throw new IllegalArgumentException("Telefone inválido. Use o formato (11) 91234-5678.");',
  },
  {
    id: 'IA-05', fluxoId: 'TF-06', severidade: 'ALTA',
    titulo: 'Lista com Cartão SUS e diagnósticos é salva em pasta compartilhada',
    oQueAcontece: 'A exportação de triagens grava o número do Cartão SUS junto com o diagnóstico em um arquivo numa pasta temporária do servidor, que outros programas e usuários do servidor podem ler.',
    quemEAfetado: 'Moradores atendidos pela UBS cujas triagens foram exportadas.',
    orientacaoCidadao: 'A unidade deve apagar os arquivos já gerados e revisar quem teve acesso ao servidor.',
    correcaoTecnica: 'Gere a exportação sob demanda, sem o CNS, em diretório com permissão restrita, e apague após o download.',
    patch: '- linha.append(t.getCns()).append(";").append(t.getCid10());\n+ linha.append(t.getId()).append(";").append(t.getCid10());\n- Files.writeString(Path.of("/tmp/export-ubs.csv"), linha);\n+ Files.writeString(exportDir.resolve(nomeSeguro()), linha, CREATE_NEW);',
  },
  {
    id: 'IA-07', fluxoId: 'TF-07', severidade: 'CRITICA',
    titulo: 'Senhas digitadas no login ficam gravadas por escrito',
    oQueAcontece: 'Toda vez que alguém entra no aplicativo, o e-mail e a senha digitados são gravados como texto nos registros do sistema.',
    quemEAfetado: 'Todos os moradores que fizeram login.',
    orientacaoCidadao: 'Troque a sua senha assim que a correção for publicada.',
    correcaoTecnica: 'Remova a senha do log e invalide os logs antigos.',
    patch: '- log.debug("login {} / {}", login.getEmail(), login.getSenha());\n+ log.debug("tentativa de login para {}", PiiMasker.email(login.getEmail()));',
  },
  {
    id: 'IA-08', fluxoId: 'TF-08', severidade: 'ALTA',
    titulo: 'O CPF é enviado ao serviço de mapas dentro do endereço da página',
    oQueAcontece: 'Para localizar o endereço do chamado, o sistema coloca o CPF no link enviado ao serviço de mapas. Links ficam registrados em servidores e proxies pelo caminho.',
    quemEAfetado: 'Moradores que abriram chamados com localização.',
    orientacaoCidadao: 'Nenhuma ação necessária do morador.',
    correcaoTecnica: 'Use um identificador interno aleatório no lugar do CPF.',
    patch: '- String url = BASE + "?ref=" + dto.getCpf();\n+ String url = BASE + "?ref=" + chamado.getProtocolo();',
  },
  {
    id: 'IA-09', fluxoId: 'TF-09', severidade: 'ALTA',
    titulo: 'O diagnóstico aparece em mensagens de erro',
    oQueAcontece: 'Quando o código de diagnóstico não é reconhecido, ele é repetido na mensagem de erro exibida e registrada.',
    quemEAfetado: 'Moradores atendidos na triagem.',
    orientacaoCidadao: 'Nenhuma ação necessária do morador.',
    correcaoTecnica: 'Não ecoe dados de saúde em exceções.',
    patch: '- throw new TriagemException("CID não suportado: " + triagem.getCid10());\n+ throw new TriagemException("Código de diagnóstico não suportado.");',
  },
];

const VERSIONS = [
  { versao: '1.0.0', data: '2026-10-19T14:12:00-03:00', arquivos: 38, duracaoMs: 6120 },
  { versao: '1.1.0', data: '2026-10-26T10:40:00-03:00', arquivos: 44, duracaoMs: 6870 },
  { versao: '1.2.0', data: '2026-11-02T16:05:00-03:00', arquivos: 47, duracaoMs: 7210 },
  { versao: '1.3.0', data: '2026-11-08T09:31:00-03:00', arquivos: 51, duracaoMs: 7480 },
  { versao: '1.4.0', data: '2026-11-12T18:22:00-03:00', arquivos: 53, duracaoMs: 7655 },
];

const active = <T extends { desde: number; ate?: number }>(items: T[], v: number) =>
  items.filter((i) => i.desde <= v && (i.ate === undefined || v < i.ate));

const strip = <T extends { desde: number; ate?: number }>({ desde, ate, ...rest }: T) => rest;

export function buildScan(v: number, id: string, iniciadaEm: string, origem: Scan['origem']): Scan {
  const meta = VERSIONS[v];
  const fluxos = active(FLOWS, v).map(strip) as TaintFlow[];
  const achados = active(FINDINGS, v).map(strip) as PiiFinding[];
  const ids = new Set(fluxos.filter((f) => f.status === 'BLOQUEADO').map((f) => f.id));
  const riscoCidadao = citizenRisk(achados, fluxos);
  return {
    id,
    projeto: SAMPLE_PROJECT,
    versao: meta.versao,
    origem,
    iniciadaEm,
    duracaoMs: meta.duracaoMs,
    status: 'CONCLUIDA',
    arquivosAnalisados: meta.arquivos,
    riscoCidadao,
    veredito: ids.size > 0 ? 'BLOQUEADO' : 'APROVADO',
    modeloIa: 'claude-opus-5-5',
    achados,
    fluxos,
    alertas: ALERTS.filter((a) => ids.has(a.fluxoId)),
  };
}

export const LATEST_VERSION = VERSIONS.length - 1;

export const MOCK_SCANS: Scan[] = VERSIONS.map((m, i) =>
  buildScan(i, `SCN-${String(i + 1).padStart(4, '0')}`, m.data, 'APP_EXEMPLO'),
).reverse();
