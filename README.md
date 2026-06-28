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

## Notas
- O PostgreSQL sobe na porta **5434** (evita conflito com outros bancos locais).
- Variáveis de ambiente: `apps/api/.env` (copie de `.env.example`).
