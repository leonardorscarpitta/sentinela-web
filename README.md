<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.svg">
    <img src=".github/assets/logo-light.svg" alt="Sentinela Cidadã" width="290" height="64">
  </picture>
</p>

<p align="center">
  Detecta dados pessoais no código de CitizenTechs, rastreia vazamentos e traduz o risco para o cidadão — frontend Angular
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-22-0b4f8a" alt="Angular 22">
  <img src="https://img.shields.io/badge/i18n-pt--BR-0b4f8a" alt="Idioma: pt-BR">
  <img src="https://img.shields.io/badge/auth-OIDC%20%2B%20PKCE-0b4f8a" alt="OIDC + PKCE">
  <img src="https://img.shields.io/badge/GS%202026.2-Cybersecurity-5a6474" alt="GS 2026.2 Cybersecurity">
</p>

## Ficha da CitizenTech

| | |
|---|---|
| **Nome** | Sentinela Cidadã |
| **Cidadão beneficiado** | Moradores que usam aplicativos públicos e comunitários (zeladoria, saúde, cadastro) e entregam CPF, Cartão SUS e dados de saúde a eles |
| **Problema, em uma frase** | CitizenTechs coletam dados sensíveis e, sem perceber, os deixam escapar em logs, respostas HTTP, arquivos e APIs de terceiros |
| **Como funciona** | Cada varredura do código roda o estágio **pii**: regras próprias de Semgrep mapeiam onde o dado pessoal está e um taint analysis segue esse dado até a saída; quando ele vaza, o estágio falha e a publicação é bloqueada. A IA traduz cada vazamento em um alerta claro para o cidadão, e o painel resume tudo no índice **Risco Cidadão** |
| **O que cada parte faz** | `sentinela-api` (Java/Spring, Keycloak, PostgreSQL, scanner isolado): varredura, taint analysis, gate, tradução via Claude e cálculo do índice · `sentinela-web` (este repositório): painel executivo, repositórios, varreduras, achados com o rastro do vazamento, alertas e catálogo de regras |
| **Repositórios** | [sentinela-web](https://github.com/leonardorscarpitta/sentinela-web) · [sentinela-api](https://github.com/leonardorscarpitta/sentinela-api) |
| **Indicador de impacto** | Risco Cidadão (0–100) por varredura; vazamentos bloqueados antes da publicação |
| **ODS conectados** | 9 (infraestrutura resiliente), 10 (redução das desigualdades), 11 (cidades e comunidades sustentáveis), 16.10 (proteção de liberdades fundamentais / dados) |

## Entregas da disciplina (Cybersecurity)

| Missão | Onde está no app |
|---|---|
| 01 · Mapeamento de PII | **Regras PII**: catálogo das regras do estágio `pii` (CPF, CNS, CID-10, saúde, senhas, contato, cartão), com teste ao vivo no navegador · **Achados › Privacidade**: cada dado mapeado com arquivo e linha |
| 02 · Taint Analysis | **Achados › detalhe**: rastro *origem → propagação → destino* (arquivo:linha) e o tipo de saída · **Varreduras › detalhe**: estágio `pii` que falha e bloqueia o pipeline |
| 03 · Tradução via IA | **Achados › detalhe › Gerar alerta para o cidadão**: o que acontece, quem é afetado, o que fazer e a correção técnica (Claude, sem enviar código nem dados) |
| Dashboard Executivo | **Painel**: índice Risco Cidadão, veredito do gate, evolução por varredura, exposição por tipo de dado, a fórmula com os pesos vindos da API e KPIs gerais de segurança |
| Segurança do próprio protótipo | Login OIDC com PKCE, token só na aba, isolamento por organização, evidências sem valores, entradas validadas (ver abaixo) |

## Arquitetura

```
navegador ──/api/v1──> ng serve (proxy) ──> sentinela-api :8080 ──> PostgreSQL
    │                                              │
    └──OIDC (Code + PKCE)──> Keycloak :9443        └──> scanner (Semgrep, Gitleaks, Trivy…) — clona com chave de deploy
```

- Angular 22 standalone, signals e zoneless; leituras com `httpResource`, escritas com `HttpClient`.
- O navegador fala com a API pelo mesmo endereço do app (`/api/v1`): em desenvolvimento o `ng serve` encaminha para a API (`proxy.conf.mjs`), em produção o gateway faz o mesmo. Não há CORS nem token enviado a outra origem.
- `public/config.json` é lido na inicialização (troca de ambiente sem rebuild): URL da API, Keycloak e modo de autenticação.

```
src/app/
├── core/
│   ├── config.ts          # config.json (API, Keycloak, modo de autenticação)
│   ├── auth.ts            # OIDC Authorization Code + PKCE, sessão na aba, login silencioso
│   ├── org.ts             # organização ativa, guards de sessão e de organização
│   ├── http.ts            # interceptor (token, X-Artemis-Organization, 401/404) e mensagens dos ProblemDetails
│   ├── sentinela-api.ts   # todas as chamadas à API
│   ├── models.ts          # tipos do contrato e rótulos em pt-BR
│   ├── risk.ts            # textos dos níveis e apresentação dos pesos que a API devolve
│   ├── pii-rules.ts       # catálogo das regras do estágio pii + regex do teste local
│   └── pii-engine.ts      # teste local: validadores (CPF, CNS, Luhn) e máscara
├── shared/                # medidor, tendência, barras, fluxo, alerta, badges, erro
└── pages/                 # painel, repositórios, varreduras, achados, regras, entrar, organizações
```

## Páginas

| Página | API |
|---|---|
| **Painel** | `GET /dashboard/citizen-risk?repository=` (medidor, veredito, KPIs, tendência, exposição por categoria, fórmula com `weights`) · `GET /dashboard/summary` · `GET /findings?kind=privacy&status=open` (vazamentos que bloqueiam) |
| **Repositórios** | `GET/POST /repositories` (só URL SSH) · `GET /repositories/{name}` · `GET /repositories/{name}/access` (chave pública de deploy) · `POST …/access/checks` (testar acesso, com atualização automática) · `POST …/access/key` (nova chave) · `POST …/scans` |
| **Varreduras** | `GET /pipeline-runs?repository=` (atualiza enquanto há execução) · `GET /pipeline-runs/{n}` (estágios, incluindo `pii`, status, quem bloqueou, logs) · `POST …/rerun` · `POST …/cancel` |
| **Achados** | `GET /findings?q&kind&severity&status&repository` (filtros na URL) · `GET /findings/{id}` (rastro do vazamento, histórico) · `POST /findings/{id}/status` (aceitar risco exige justificativa e validade) · `GET/POST /findings/{id}/citizen-alert` |
| **Regras PII** | Sem API: catálogo das regras de `sentinela-api/scanner/rules/pii/` e teste local (funciona sem login) |

Erros da API (RFC 7807) viram mensagens em pt-BR, com o código técnico ao lado. Na geração do alerta ao cidadão: `403 feature-not-enabled`, `503 ai-unavailable`, `503 ai-busy`, `429 ai-limit`, `502 ai-failed`, `400 not-privacy-finding`.

## Autenticação

- **Keycloak** (realm `artemisappsec`, cliente público `artemisappsec-web`): Authorization Code + **PKCE S256**, `state` e `nonce` conferidos, retorno em `/auth/callback`. Implementado com WebCrypto, sem biblioteca.
- **Token só na aba**: access token (15 min) e id token em `sessionStorage`; nada em `localStorage` nem em cookie. O realm não emite refresh token.
- **Token vencido ou 401**: o app volta ao Keycloak com `prompt=none`; com a sessão SSO ativa o retorno é imediato e sem interação, senão aparece a tela *Entrar*. Sair apaga os tokens locais antes de encerrar a sessão no Keycloak.
- **Organizações**: `GET /me/organizations`; a escolhida vai no cabeçalho `X-Artemis-Organization` de toda chamada da organização. `404 organization-not-found` leva de volta à escolha. Botões aparecem conforme as permissões do papel (`triage`, `pipelines`, `integrations`), e a API confere de novo.
- **Modo de desenvolvimento** (`AUTH_ENABLED=false` na API): com `"mode": "auto"` o app detecta (o `GET /me` sem token só responde 200 nesse modo), não envia token e usa a organização `devOrganization` do `config.json` (padrão `acme`). `"mode"` também aceita `"oidc"` ou `"none"` fixos.

## Rodando

Requer apenas Docker e a sentinela-api rodando: o app entra na rede `sentinela-web-gateway`, criada pelo `docker compose` do backend, e fala só com o `api-gateway` dela (banco, Keycloak e a porta de debug da API ficam fora de alcance).

1. Suba o backend conforme o README dele (`cp .env.example .env`, preencha os segredos e `docker compose up -d`). O Keycloak do backend já espera este app em `http://localhost:4200` (`ARTEMISAPPSEC_WEB_ORIGIN`, redirect `/auth/callback`).
2. Suba o app:

   ```bash
   docker compose up -d --build     # ng serve em modo debug (source maps, recarga ao editar src/)
   ```

   O proxy do `ng serve` encaminha `/api` para `API_PROXY_TARGET` (padrão `http://api-gateway:8080`).

   Abra o app em **<http://localhost:4200>** (não em `127.0.0.1`): é a origem liberada no `CORS_ALLOWED_ORIGINS` e no Keycloak do backend; com outra origem a API recusa os `POST` (`403 Invalid CORS request`).

3. Login: na primeira vez, abra <https://auth.artemisappsec.localhost:9443> e aceite o certificado local (ou confie na CA do Caddy, como explica o README do backend). Usuários de teste: `./keycloak/create-dev-users.sh` no backend. Para testar sem login, use `AUTH_ENABLED=false` no `.env` do backend.

Build de produção:

```bash
docker run --rm -v "$PWD":/app -w /app node:24-alpine sh -c "npm ci && npx ng build"
```

## Risco Cidadão

Calculado pela API; o painel mostra a fórmula com os pesos que ela devolve.

```
vazamento = severidade × tipo de dado × exposição
latente   = severidade × tipo de dado × fator latente   (dado mapeado que não vaza)
índice    = round(100 × (1 − e^(−Σ/saturação)))         crítico ≥ 75 · alto ≥ 50 · moderado ≥ 25
```

Só achados abertos ou em análise contam. Publicação **bloqueada** quando há qualquer vazamento aberto.

## Segurança no frontend

- Nenhum `innerHTML`: todo conteúdo passa pela interpolação do Angular; tipagem estrita (`strict` + templates estritos).
- Token apenas em memória/`sessionStorage`, enviado só para a própria API (origem e prefixo conferidos antes de anexar o cabeçalho); `returnUrl` aceita só caminhos internos (sem redirecionamento aberto).
- Evidência sem valor: achados de privacidade mostram só tipo de dado, regra e arquivo:linha; o teste local de regras mascara o que encontra (só os 2 últimos caracteres ficam visíveis) e não envia nada.
- Entradas validadas antes de chegar à API: URL só SSH e branch com o mesmo padrão do backend, filtros da URL só com valores conhecidos, regex vazia/inválida rejeitada, observação ≤ 1000 caracteres, aceitação de risco com justificativa e validade de até 1 ano.
- Nenhum segredo no repositório: `config.json` tem só endereços públicos e o id do cliente público.

## Uso de IA

Registro dos prompts em [prompts.md](prompts.md).
