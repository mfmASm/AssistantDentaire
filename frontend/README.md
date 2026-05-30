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
