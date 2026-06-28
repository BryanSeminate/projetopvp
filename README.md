# Sistema Mateus — ERP/PDV multiempresa

Varejo com foco em crediário próprio e gestão de inadimplência/cobrança.

- **Backend:** Node + Fastify + TypeScript + Prisma + PostgreSQL (`apps/api`)
- **Frontend:** React + Vite + TypeScript + Tailwind (`apps/web`)

## Pré-requisitos
- Node 20+
- Docker (para o PostgreSQL)

## Primeira vez (setup)
```bash
npm install            # instala o concurrently da raiz
npm run setup          # instala apps, sobe o banco, migra e popula (seed)
```

## Rodar o sistema
```bash
npm run dev            # sobe banco + backend (:3333) + frontend (:5173)
```
Abra **http://localhost:5173**

Login padrão: **admin@demo.com** / **admin123**

> Se a tela der "Network Error" ao selecionar a empresa, o backend não está no ar — rode `npm run dev`.

## Outros comandos
```bash
npm test               # roda os testes do backend (50)
npm run db:up          # sobe só o banco
npm run db:down        # derruba o banco
```

## Deploy (produção, via Docker)
Empacota tudo (banco + API + frontend nginx) em containers:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
- Frontend: **http://localhost:8080**
- API: **http://localhost:3333**
- A API aplica migrations e roda o seed automaticamente no start.

Variáveis recomendadas em produção (passe no ambiente ou num `.env` ao lado do compose):
`DB_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `API_URL`, `WEB_ORIGIN`, `SEED_ON_START=false`.

## Notas
- O PostgreSQL (dev) sobe na porta **5434** (evita conflito com outros bancos locais).
- Variáveis de ambiente: `apps/api/.env` (copie de `.env.example`).
