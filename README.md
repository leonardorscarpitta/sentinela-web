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
  <img src="https://img.shields.io/badge/dados-simulados-5a6474" alt="Dados simulados">
  <img src="https://img.shields.io/badge/GS%202026.2-Cybersecurity-5a6474" alt="GS 2026.2 Cybersecurity">
</p>

## Ficha da CitizenTech

| | |
|---|---|
| **Nome** | Sentinela Cidadã |
| **Cidadão beneficiado** | Moradores que usam aplicativos públicos e comunitários (zeladoria, saúde, cadastro) e entregam CPF, Cartão SUS e dados de saúde a eles |
| **Problema, em uma frase** | CitizenTechs coletam dados sensíveis e, sem perceber, os deixam escapar em logs, respostas HTTP, arquivos e APIs de terceiros |
| **Como funciona** | O código do app é varrido por um motor de regras de PII; um taint analysis segue cada dado até a saída e bloqueia o deploy quando ele vaza; a IA traduz cada vazamento em um alerta claro para o cidadão; o painel resume tudo no índice **Risco Cidadão** |
| **O que cada parte faz** | `sentinela-api` (Java): parsing de PII, taint analysis, tradução via Claude e cálculo do índice · `sentinela-web` (este repositório): painel executivo, relatórios e editor de regras |
| **Repositórios** | [sentinela-web](https://github.com/leonardorscarpitta/sentinela-web) · [sentinela-api](https://github.com/leonardorscarpitta/sentinela-api) |
| **Indicador de impacto** | Risco Cidadão (0–100) por versão; vazamentos bloqueados antes da publicação |
| **ODS conectados** | 9 (infraestrutura resiliente), 10 (redução das desigualdades), 11 (cidades e comunidades sustentáveis), 16.10 (proteção de liberdades fundamentais / dados) |

## Entregas da disciplina (Cybersecurity)

| Missão | Onde está no painel |
|---|---|
| 01 · Mapeamento de PII | **Regras PII**: regras de CPF, CNS, CID-10, saúde, senhas, segredos, contato e cartão; criação de regras novas com validação e teste ao vivo |
| 02 · Taint Analysis | **Relatório › Taint analysis**: origem → propagação → destino, com status *Vazamento bloqueado* ou *Sanitizado* e o gate de publicação |
| 03 · Tradução via IA | **Relatório › Alertas ao cidadão**: o que acontece, quem é afetado, o que fazer e o patch para a equipe técnica |
| Dashboard Executivo | **Painel**: índice Risco Cidadão, veredito do gate, evolução por versão, exposição por tipo de dado e a fórmula do índice |
| Auditoria do protótipo | Botões **Relatório .md** e **Evidências .json** em cada varredura |

## Status

Esta é a **demonstração do frontend**: todos os dados vêm de `src/app/core/mock-data.ts` e as varreduras são simuladas em memória (`SentinelaApi`). Nenhum dado pessoal real é usado; o CPF `529.982.247-25` e o CNS `700 0012 3456 7894` são números de teste.

## Rodando

Requer apenas Docker.

```bash
docker compose up --build
```

Acesse <http://localhost:4200>. O servidor roda em modo de desenvolvimento (source maps e recarga automática ao editar `src/`).

Build de produção:

```bash
docker run --rm -v "$PWD":/app -w /app node:24-alpine sh -c "npm ci && npx ng build"
```

## Estrutura

```
src/app/
├── core/
│   ├── models.ts          # tipos do domínio (regras, achados, fluxos, alertas, varreduras)
│   ├── risk.ts            # pesos e fórmula do Risco Cidadão
│   ├── pii-engine.ts      # validadores (CPF, CNS, Luhn), máscara e prévia das regras
│   ├── mock-data.ts       # app de exemplo "Bairro Vivo" e histórico de varreduras
│   └── sentinela-api.ts   # fonte de dados (simulada); mesma interface da API real
├── shared/                # medidor, gráfico de tendência, barras, cartões de alerta e de fluxo
└── pages/                 # painel, varreduras, nova varredura, relatório, regras
```

## Risco Cidadão

```
vazamento  = severidade × tipo de dado × exposição
latente    = severidade × tipo de dado × 0,3      (dado mapeado que não vaza)
sanitizado = 0
índice     = 100 × (1 − e^(−Σ/60))
```

Os pesos estão em `src/app/core/risk.ts` e também aparecem no painel.

## Segurança no frontend

- Evidências sempre mascaradas (só os 2 últimos caracteres ficam visíveis).
- Upload aceita apenas `.zip` de até 10 MB e confere a assinatura `PK\x03\x04` antes de enviar.
- O teste de regras roda só no navegador; regex vazia ou inválida é rejeitada.
- Nenhum `innerHTML`: todo conteúdo passa pela interpolação do Angular.

## Uso de IA

Registro dos prompts em [prompts.md](prompts.md).
