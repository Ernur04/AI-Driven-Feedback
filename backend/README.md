# Backend: accounts service

Minimal Node.js + Express backend for accounts: registration, login, JWT + refresh tokens.

Quick start:

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Create Postgres DB and run server (server will create tables on startup):

```bash
npm run dev
```
4. Run with Docker Compose (recommended):

```bash
cd backend
docker compose up -d --build
```

This starts Postgres and the backend. The backend uses `DATABASE_URL=postgres://user:password@db:5432/ai_feedback` inside the compose network.

Or run locally after installing Postgres and setting `DATABASE_URL` in `.env` then:

```bash
npm run dev
```
