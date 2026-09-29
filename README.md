# Personal Finance Tracker

A full-stack personal finance tracker: accounts, transactions, budgets, recurring
payments, bills, savings goals, investments, and analytics — with a backend-focused
architecture (JWT auth with refresh rotation, background job processing, Redis
caching, and a normalized Postgres schema behind Prisma).

## Tech stack

- **Backend**: NestJS, PostgreSQL + Prisma, Redis, BullMQ, JWT (argon2 password hashing), Swagger
- **Frontend**: Next.js (App Router), Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts
- **Infra**: Docker Compose (Postgres, Redis, Maildev, backend, frontend)


```

## Getting started

### Prerequisites

- Node.js 22+ and npm
- Docker Desktop (for Postgres, Redis, and Maildev)

### 1. Configure environment variables

```bash
cp .env.example .env
```

The defaults work for local development out of the box. 

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

