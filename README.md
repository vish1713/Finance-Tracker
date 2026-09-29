# Personal Finance Tracker

A full-stack personal finance tracker: accounts, transactions, budgets, recurring
payments, bills, savings goals, investments, and analytics — with a backend-focused
architecture (JWT auth with refresh rotation, background job processing, Redis
caching, and a normalized Postgres schema behind Prisma).

## Tech stack

- **Backend**: NestJS, PostgreSQL + Prisma, Redis, BullMQ, JWT (argon2 password hashing), Swagger
- **Frontend**: Next.js (App Router), Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts
- **Infra**: Docker Compose (Postgres, Redis, Maildev, backend, frontend)

## Project structure

```
backend/    NestJS API (src/<feature>/ per module: accounts, transactions, budgets,
            recurring-transactions, bills, goals, investments, analytics, notifications,
            storage, auth, users, categories)
frontend/   Next.js app (src/app/(auth) for login/register, src/app/(app) for the
            authenticated shell + feature pages, src/lib for the API client and
            TanStack Query hooks)
docker-compose.yml   postgres, redis, maildev, backend, frontend
```

## Getting started

### Prerequisites

- Node.js 22+ and npm
- Docker Desktop (for Postgres, Redis, and Maildev)

### 1. Configure environment variables

```bash
cp .env.example .env
```

The defaults work for local development out of the box. Notably `MAIL_ENABLED=true`
points at the bundled Maildev container so bill-reminder emails can be viewed at
http://localhost:1080 without a real SMTP account.

### 2. Install dependencies

```bash
npm install
```

This is an npm workspaces monorepo — one install at the root covers both `backend`
and `frontend`.

### 3. Start infrastructure

```bash
docker compose up -d postgres redis maildev
```

### 4. Set up the database

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

The seed creates the shared default categories plus a demo user:

- **Email**: `demo@financetracker.dev`
- **Password**: `Password123!`

### 5. Run the apps

```bash
npm run dev:backend    # http://localhost:4000/api/v1, Swagger at /api/docs
npm run dev:frontend   # http://localhost:3000
```

Or run everything (including the backend/frontend containers) via Docker:

```bash
docker compose up -d --build
```

## Architecture notes

- **Auth**: short-lived access tokens (15m) + rotating refresh tokens (30d, hashed
  at rest, revoked on rotation/logout) — see `backend/src/auth`.
- **Ledger integrity**: every write that touches an account balance (transaction
  create/update/delete, transfers, recurring transactions, bill payments) runs
  inside a Prisma `$transaction`, so the transaction row and the balance update
  commit atomically. `Account.openingBalance` plus the transaction history is the
  source of truth; `Account.balance` is a denormalized cache with a
  `POST /accounts/:id/recompute-balance` reconciliation endpoint as a safety net.
- **Background jobs** (`backend/src/recurring-transactions`, `backend/src/bills`,
  `backend/src/notifications`): BullMQ workers backed by Redis, triggered by
  `@nestjs/schedule` cron jobs — recurring transactions hourly, bill reminders
  daily. Bill/notification emails go through a dedicated `email` queue so slow
  SMTP calls never block a request.
- **Caching**: analytics/dashboard endpoints are cached in Redis for 5 minutes and
  explicitly invalidated on any transaction or budget write (`backend/src/cache`).
- **File storage**: `backend/src/storage` abstracts S3 and Cloudinary behind one
  interface, selected via `STORAGE_PROVIDER`; the client requests a signed upload
  URL rather than proxying files through the API.

## API documentation

With the backend running, interactive Swagger docs are available at
http://localhost:4000/api/docs.
