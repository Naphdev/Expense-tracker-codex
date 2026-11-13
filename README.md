# Personal Finance Advisor

Mobile-first personal finance web app with Vue 3, Express, MongoDB, PWA offline sync, and an AI saving advisor.

## Project structure

```
frontend/   Vue 3 + Vite + Tailwind + Pinia + Vue I18n + PWA
backend/    Express REST API + MongoDB/Mongoose + JWT cookies + OpenAI
```

## Technology stack

- Frontend: Vue 3, Vite, TypeScript, Vue Router, Pinia, Tailwind CSS, Chart.js, Axios, Vue I18n, Workbox PWA
- Backend: Node.js, Express, JWT HTTP-only cookies, Helmet, Zod, Mongoose
- Database: MongoDB (integer minor units for THB)
- AI: OpenAI via the backend only
- Reports: PDF (PDFKit) and Excel (ExcelJS)

## Environment variables

Backend (`backend/.env`, see `backend/.env.example`):

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — long random secret
- `FRONTEND_ORIGIN` — comma-separated allowed origins, e.g. `http://localhost:5173`
- `OPENAI_API_KEY` — optional; the advisor still returns a totals-based fallback without it
- `OPENAI_MODEL` — default `gpt-4o-mini`
- `COOKIE_NAME`, `CSRF_COOKIE_NAME`, `JWT_EXPIRES_IN`
- `TRUST_PROXY=true` when hosted behind a reverse proxy

Frontend (`frontend/.env`, see `frontend/.env.example`):

- `VITE_API_URL` — optional API base override. Leave unset for local Vite and production so requests use the same-origin `/api` path.

Never put the OpenAI key in frontend env vars.

## How to run the backend

```bash
cd backend
npm install
copy .env.example .env   # PowerShell: Copy-Item .env.example .env
npm run dev
```

API: `http://localhost:4000`  
Health: `GET /health`

## How to run the frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

## MongoDB

Local: install MongoDB and use `mongodb://127.0.0.1:27017/personal_finance_advisor`.

Atlas:

1. Create a cluster and database user.
2. Allow the backend host IP.
3. Set `MONGODB_URI` to the Atlas SRV URI.
4. Replica sets (Atlas default) enable multi-document transactions for transfers. Standalone MongoDB falls back to sequential updates.

## OpenAI

1. Create an API key at OpenAI.
2. Set `OPENAI_API_KEY` on the backend only.
3. Restart the API.
4. Open **AI Advisor**. Responses are labeled as AI-generated educational guidance, not professional advice.
5. Without a key, the endpoint still returns structured guidance from server-calculated totals.

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Offline synchronization

1. Sign in while online, open **Profile**, and save offline data with a passphrase of at least 10 characters.
2. The app encrypts the current-month summary, accounts, budgets, goals, and 50 most recent transactions on this device.
3. If the API is unavailable, reopen the app and unlock the saved data with that passphrase. Offline mode is read-only.
4. Refresh the offline copy from Profile while online. Logout removes the local encrypted copy.

The offline passphrase protects this local copy; it is not your account password or a replacement for server authentication. Authenticated API responses are never put in a shared public cache. The service worker uses `NetworkOnly` for `/api`.

## Deploy

Before inviting multiple users, follow the [multi-user release checklist](docs/MULTI_USER_RELEASE_CHECKLIST.md). It covers user-data isolation, Atlas network access, health/readiness checks, and backup restore drills.

### Frontend (Vercel)

1. Root directory: `frontend`
2. Build: `npm run build`
3. Output: `dist`
4. Set the server-only Vercel environment variable `API_ORIGIN` to the backend origin, for example `https://your-api-host.example` (origin only; no `/api` suffix).
5. Leave `VITE_API_URL` unset so the browser calls the same-origin `/api` function. This keeps auth cookies first-party on Safari and iOS Home Screen apps.
6. `vercel.json` rewrites application routes to `index.html`; `/api/*` is handled by the server function.

The API function streams responses such as PDF and Excel exports. Vercel limits each function request body to 4.5 MB; transaction imports are parsed in the browser and only the mapped rows are sent, so unusually large row payloads may need to be split into smaller imports.

### Backend (Node host: Render, Railway, Fly.io, VM)

1. Build: `cd backend && npm run build`
2. Start: `npm start`
3. Set production env vars, including `NODE_ENV=production`, `TRUST_PROXY=true`, `FRONTEND_ORIGIN=https://YOUR-VERCEL-APP.vercel.app`
4. Use HTTPS. The Vercel function proxies API requests and forwards auth and CSRF cookies to the backend.

A `backend/Dockerfile` is included.

### Production CORS and cookies

The browser talks to the Vercel app origin for both the SPA and `/api`. The proxy calls the API host server-to-server. The API must:

- Allow the Vercel origin with credentials
- Set auth cookies with `Secure` in production. They are returned through the same-origin proxy.
- Serve only over HTTPS
