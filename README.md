<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.svg">
    <img src=".github/assets/logo-light.svg" alt="Sentinela Cidadã" width="290" height="64">
  </picture>
</p>

<p align="center">
  Finds personal data in the code of citizen-facing apps, traces leaks and translates the risk for citizens — Angular frontend
</p>

<p align="center"><strong>English</strong> · <a href="README.pt-BR.md">Português</a></p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-22-0b4f8a" alt="Angular 22">
  <img src="https://img.shields.io/badge/UI-pt--BR-0b4f8a" alt="UI language: pt-BR">
  <img src="https://img.shields.io/badge/auth-OIDC%20%2B%20PKCE-0b4f8a" alt="OIDC + PKCE">
  <img src="https://img.shields.io/badge/GS%202026.2-Cybersecurity-5a6474" alt="GS 2026.2 Cybersecurity">
</p>

## CitizenTech summary

| | |
|---|---|
| **Name** | Sentinela Cidadã |
| **Who benefits** | Residents who use public and community apps (neighbourhood maintenance, health, registration) and hand them their CPF, Cartão SUS (national health card) and health data |
| **Problem, in one sentence** | CitizenTechs collect sensitive data and, without noticing, let it escape through logs, HTTP responses, files and third-party APIs |
| **How it works** | Every code scan runs the **pii** stage: Semgrep rules map where personal data lives and a taint analysis follows it to its outputs; when it leaks, the stage fails and the release is blocked. AI turns each leak into a plain-language alert for citizens, and the dashboard sums it all up in the **Risco Cidadão** (citizen risk) index |
| **What each part does** | `sentinela-api` (Java/Spring, Keycloak, PostgreSQL, isolated scanner): scanning, taint analysis, gate, Claude translation and the index · `sentinela-web` (this repository): executive dashboard, repositories, scans, findings with the leak trace, alerts and the rules catalog |
| **Repositories** | [sentinela-web](https://github.com/leonardorscarpitta/sentinela-web) · [sentinela-api](https://github.com/leonardorscarpitta/sentinela-api) · [sentinela-infra](https://github.com/leonardorscarpitta/sentinela-infra) |
| **Impact indicator** | Risco Cidadão (0–100) per scan; leaks blocked before release |
| **UN SDGs** | 9 (resilient infrastructure), 10 (reduced inequalities), 11 (sustainable cities and communities), 16.10 (protection of fundamental freedoms / data) |

The UI is in Brazilian Portuguese, the language of its users.

## Course deliverables (Cybersecurity)

| Mission | Where it is in the app |
|---|---|
| 01 · PII mapping | **Regras PII**: catalog of the `pii` stage rules (CPF, CNS, CID-10, health, passwords, contact, card) with a live in-browser tester · **Achados › Privacidade**: each mapped data point with file and line |
| 02 · Taint analysis | **Achados › detail**: *source → propagation → sink* trace (file:line) and the kind of output · **Varreduras › detail**: the `pii` stage failing and blocking the pipeline |
| 03 · AI translation | **Achados › detail › Gerar alerta para o cidadão**: what happens, who is affected, what to do and the technical fix (Claude, no code or data sent) |
| Executive dashboard | **Painel**: Risco Cidadão index, gate verdict, trend per scan, exposure by data type, the formula with the weights returned by the API, and general security KPIs |
| Security of the prototype itself | OIDC login with PKCE, token kept in the tab, organization isolation, evidence without values, validated input (see below) |

## Architecture

```
browser ──/api/v1──> ng serve (proxy) ──> api-gateway ──> sentinela-api ──> PostgreSQL
   │                                                         │
   └──OIDC (Code + PKCE)──> Keycloak :9443                   └──> scanner (Semgrep, Gitleaks, Trivy…) — clones with a deploy key
```

- Angular 22, standalone, signals and zoneless; reads with `httpResource`, writes with `HttpClient`.
- The browser calls the API on the app's own origin (`/api/v1`): in development `ng serve` proxies it (`proxy.conf.mjs`); in production a gateway does the same. No CORS and no token sent to another origin.
- `public/config.json` is loaded at startup (change environments without rebuilding): API URL, Keycloak and auth mode.

```
src/app/
├── core/
│   ├── config.ts          # config.json (API, Keycloak, auth mode)
│   ├── auth.ts            # OIDC Authorization Code + PKCE, per-tab session, silent sign-in
│   ├── org.ts             # active organization, session and organization guards
│   ├── http.ts            # interceptor (token, X-Sentinela-Organization, 401/404) and ProblemDetail messages
│   ├── sentinela-api.ts   # every API call
│   ├── models.ts          # contract types and pt-BR labels
│   ├── risk.ts            # level texts and display of the weights returned by the API
│   ├── pii-rules.ts       # catalog of the pii stage rules + regexes for the local tester
│   └── pii-engine.ts      # local tester: validators (CPF, CNS, Luhn) and masking
├── shared/                # gauge, trend, bars, flow card, alert card, badges, error
└── pages/                 # dashboard, repositories, scans, findings, rules, sign-in, organizations
```

## Pages

| Page | API |
|---|---|
| **Painel** (dashboard) | `GET /dashboard/citizen-risk?repository=` (gauge, verdict, KPIs, trend, exposure by category, formula with `weights`) · `GET /dashboard/summary` · `GET /findings?kind=privacy&status=open` (blocking leaks) |
| **Repositórios** | `GET/POST /repositories` (SSH URLs only) · `GET /repositories/{name}` · `GET /repositories/{name}/access` (deploy public key) · `POST …/access/checks` (test access, auto-refresh) · `POST …/access/key` (new key) · `POST …/scans` |
| **Varreduras** (scans) | `GET /pipeline-runs?repository=` (refreshes while runs are active) · `GET /pipeline-runs/{n}` (stages incl. `pii`, status, which stage blocked, logs) · `POST …/rerun` · `POST …/cancel` |
| **Achados** (findings) | `GET /findings?q&kind&severity&status&repository` (filters in the URL) · `GET /findings/{id}` (leak trace, history) · `POST /findings/{id}/status` (accepting a risk needs a justification and an expiry) · `GET/POST /findings/{id}/citizen-alert` |
| **Regras PII** | No API: catalog of the rules in `sentinela-api/scanner/rules/pii/` and a local tester (works without signing in) |

API errors (RFC 7807) become pt-BR messages with the technical code beside them. For citizen alerts: `403 feature-not-enabled`, `503 ai-unavailable`, `503 ai-busy`, `429 ai-limit`, `502 ai-failed`, `400 not-privacy-finding`.

## Authentication

- **Keycloak** (realm `sentinela`, public client `sentinela-web`): Authorization Code + **PKCE S256**, `state` and `nonce` checked, return to `/auth/callback`. Written with WebCrypto, no library.
- **Token kept in the tab**: access token (15 min) and id token in `sessionStorage`; nothing in `localStorage` or cookies. The realm issues no refresh token.
- **Expired token or 401**: the app goes back to Keycloak with `prompt=none`; with an active SSO session it returns at once without interaction, otherwise the *Entrar* (sign-in) page appears. Signing out clears local tokens before ending the Keycloak session.
- **Organizations**: `GET /me/organizations`; the chosen one goes in the `X-Sentinela-Organization` header of every organization call. `404 organization-not-found` sends you back to the choice. Buttons follow the role's permissions (`triage`, `pipelines`, `integrations`), and the API checks again.
- **Development mode** (`AUTH_ENABLED=false` in the API): with `"mode": "auto"` the app detects it (`GET /me` without a token only answers 200 in that mode), sends no token and uses `devOrganization` from `config.json` (default `acme`). `"mode"` also accepts fixed `"oidc"` or `"none"`.

## Running

Everything runs locally in Docker; every port is bound to `127.0.0.1`, so nothing is reachable from the network. The app joins the `sentinela-web-gateway` network created by the backend's `docker compose` and talks only to its `api-gateway` (the database, Keycloak and the API debug port are out of reach).

1. Start the backend as its README explains (`cp .env.example .env`, fill in the secrets, `docker compose up -d`). Its Keycloak already expects this app at `http://localhost:4200` (`SENTINELA_WEB_ORIGIN`, redirect `/auth/callback`).
2. Start the app:

   ```bash
   docker compose up -d --build     # ng serve in debug mode (source maps, reload on src/ changes)
   ```

   The `ng serve` proxy forwards `/api` to `API_PROXY_TARGET` (default `http://api-gateway:8080`).

   Open the app at **<http://localhost:4200>** (not `127.0.0.1`): that is the origin allowed by `CORS_ALLOWED_ORIGINS` and by the backend's Keycloak; from another origin the API refuses `POST`s (`403 Invalid CORS request`).

3. Sign-in: the first time, open <https://auth.sentinela.localhost:9443> and accept the local certificate (or trust Caddy's CA, as the backend README explains). Test users: `./keycloak/create-dev-users.sh` in the backend. To test without signing in, set `AUTH_ENABLED=false` in the backend's `.env`.

Production build:

```bash
docker run --rm -v "$PWD":/app -w /app node:24-alpine sh -c "npm ci && npx ng build"
```

## Risco Cidadão

Computed by the API; the dashboard shows the formula with the weights it returns.

```
leak    = severity × data type × exposure
latent  = severity × data type × latent factor     (mapped data that doesn't leak)
index   = round(100 × (1 − e^(−Σ/saturation)))     critical ≥ 75 · high ≥ 50 · moderate ≥ 25
```

Only open or triaged findings count. The release is **blocked** while any leak is open.

## Frontend security

- No `innerHTML`: all content goes through Angular interpolation; strict typing (`strict` + strict templates).
- Token only in memory/`sessionStorage`, sent only to the app's own API (origin and prefix checked before adding the header); `returnUrl` accepts internal paths only (no open redirect).
- Evidence without values: privacy findings show only the data type, rule and file:line; the local rule tester masks what it finds (only the last 2 characters stay visible) and sends nothing.
- Input validated before it reaches the API: SSH-only URLs and branch names with the backend's pattern, URL filters limited to known values, empty/invalid regexes rejected, notes ≤ 1000 characters, risk acceptance with a justification and an expiry of at most 1 year.
- No secrets in the repository: `config.json` holds only public addresses and the public client id.

## AI usage

Prompts are recorded in [prompts.md](prompts.md).
