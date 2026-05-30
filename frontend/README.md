# AssistantDentaire Frontend

Existing React/Vite/Tailwind app. The visual design, page content, layout, cards, tables, and sidebar are kept unchanged.

## Local Dev

```bash
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The API service layer lives in `src/services`. It sends `Authorization: Bearer <access_token>` on API requests and keeps mock fallback available during development when the backend is unavailable.

## Hostinger Node.js Deployment

Use the Node.js Web App deployment, not a Cloudflare/Worker preset.

- Framework preset: `Other`
- Root directory: `frontend`
- Node version: `22.x`
- Build command: `npm run build:hostinger`
- Output directory: `.output`
- Entry file: `.output/server/index.mjs`
- Start command: `npm run start:hostinger`

Required environment variables:

```env
VITE_API_URL=https://your-render-backend-url
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The Hostinger build writes static assets to `.output/public` and a normal Node server entry to `.output/server/index.mjs`.

## Cloudflare Build

Cloudflare output remains available, but it is no longer the default production build:

```bash
npm run build:cloudflare
```
