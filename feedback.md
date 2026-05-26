# DentalPilot / DentaFlow Feedback

Last updated: 2026-05-26

This document summarizes the corrections made so far, what currently works, what still needs attention, and how to run/test the app locally.

## 1. What We Fixed So Far

### Real authentication and onboarding

Files involved:

- `frontend/src/lib/supabase.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/services/api.ts`
- `frontend/src/services/authApi.ts`
- `frontend/src/routes/login.tsx`
- `frontend/src/routes/__root.tsx`
- `backend/app/api/routes/auth.py`
- `backend/app/core/security.py`
- `backend/app/core/config.py`
- `backend/app/main.py`

Corrections made:

- Replaced fake/local login behavior with real Supabase Auth calls.
- Added frontend session persistence through local storage.
- Added Supabase access token handling.
- Added automatic `Authorization: Bearer <access_token>` headers for FastAPI requests.
- Added onboarding after login/signup.
- Fixed `/auth/onboard` so it does not require an existing profile.
- First authenticated user gets a cabinet and profile created automatically.
- New owner profile is created with backend role `admin`.
- `/auth/me` returns the current user, role, cabinet id, and cabinet info.
- Protected app routes now check the Supabase session and backend profile.
- Logged-out users are redirected to `/login`.
- Logged-in users are redirected into the app.

Important backend auth correction:

- `backend/app/core/security.py` no longer depends on manually decoding Supabase JWTs with `SUPABASE_JWT_SECRET`.
- Token verification now calls Supabase Auth directly:
  - `GET {SUPABASE_URL}/auth/v1/user`
  - Header: `Authorization: Bearer <access_token>`
  - Header: `apikey: SUPABASE_ANON_KEY`
- This fixed the previous `401 Invalid token` issue when calling `/auth/onboard`.

### CORS for local development

File involved:

- `backend/app/main.py`

Corrections made:

- Local frontend origins allowed:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
  - `http://localhost:8080`
  - `http://127.0.0.1:8080`
  - `http://localhost:3000`
  - `FRONTEND_URL` from backend env
- `allow_credentials=True`
- `allow_methods=["*"]`
- `allow_headers=["*"]`

This fixed the local CORS block from `http://localhost:8080` to `http://localhost:8000/auth/onboard`.

### Login form UX

File involved:

- `frontend/src/routes/login.tsx`

Corrections made:

- Removed demo default credentials from the form.
- Email and password now open empty.
- Added password show/hide toggle.
- Added frontend validation:
  - Missing email
  - Missing password
  - Weak signup password
- Improved Supabase auth error messages:
  - Existing account: `Un compte existe déjà avec cet email. Veuillez vous connecter.`
  - Weak password: `Le mot de passe doit contenir au moins 6 caractères.`
  - Invalid email: `Veuillez saisir une adresse email valide.`
  - Email confirmation required: `Compte créé. Veuillez confirmer votre email avant de vous connecter.`
  - Missing Supabase env: `Configuration Supabase manquante.`
- Kept console logging for development without exposing raw Supabase JSON to users.

### Logout and profile dropdown UX

Files involved:

- `frontend/src/routes/__root.tsx`
- `frontend/src/lib/roles.ts`

Corrections made:

- Replaced hidden direct logout on the profile pill with a real dropdown menu.
- Dropdown shows:
  - User initials/avatar
  - User name
  - Email
  - Cabinet name
  - Role badge
  - `Paramètres du cabinet`
  - `Déconnexion`
- Removed unfinished `Mon profil` action.
- `Déconnexion` now:
  - Calls Supabase logout
  - Clears local session
  - Redirects to `/login`
  - Shows `Déconnexion réussie.`
- `Paramètres du cabinet` navigates to `/settings`.

Role display cleanup:

- Backend role `admin` is displayed as `Docteur propriétaire`.
- Backend role `doctor` is displayed as `Docteur`.
- Backend role `secretary` is displayed as `Secrétaire médicale`.
- The UI should not show raw `Admin` to normal users.

### Role and team management foundation

Files involved:

- `frontend/src/lib/roles.ts`
- `frontend/src/services/teamApi.ts`
- `frontend/src/routes/settings.tsx`
- `backend/app/api/routes/team.py`
- `backend/app/main.py`

Corrections made:

- Added reusable role helper functions:
  - `getRoleLabel(role)`
  - `canManageTeam(role)`
  - `canManageCabinetSettings(role)`
  - `canFinalizeMedicalDocuments(role)`
  - `canAccessMedicalDocuments(role)`
  - `canManageOperations(role)`
- Added `/team` backend router.
- Added `GET /team`:
  - Admin only.
  - Lists profiles in the current user's cabinet.
  - Uses `current_user.cabinet_id`.
- Added `POST /team/invite`:
  - Admin only.
  - Accepts `doctor` or `secretary`.
  - Currently returns a clear placeholder response: `Invitation backend à finaliser`.
- Added `Équipe du cabinet` section in settings.
- Admin can see team members and open invite modal.
- Non-admin users see/receive limited access behavior.

Current limitation:

- Real email invitation is not implemented yet.
- There is no finalized invitation table/flow yet.
- The invite endpoint is intentionally a placeholder instead of pretending the invitation was fully sent.

### Patients page backend connection

Files involved:

- `frontend/src/routes/patients.tsx`
- `frontend/src/services/patientsApi.ts`
- `backend/app/api/routes/patients.py`
- `backend/app/api/routes/crud.py`
- `backend/app/schemas/patients.py`

Corrections made:

- Patients page now calls the backend instead of using only local/mock state.
- `GET /patients` loads real patients for the current cabinet.
- Loading state added.
- Empty state added.
- Error toast added if loading fails.
- Add patient now calls `POST /patients`.
- Edit patient now calls `PUT /patients/{id}`.
- Delete patient now calls `DELETE /patients/{id}` with confirmation.
- Search and filters still work on fetched backend data.
- Frontend does not send `cabinet_id`.
- Backend CRUD helper scopes records with `current_user.cabinet_id`.
- Update/delete only affect rows inside the authenticated user's cabinet.

Patients actions now work:

- `Voir`
- `Modifier`
- `WhatsApp`
- `Nouveau rendez-vous`
- `Supprimer`

Current intentional placeholders:

- `Nouveau rendez-vous` shows: `Création de rendez-vous bientôt connectée.`
- Payments/documents from patient are not connected in this phase.
- Other modules are still not connected to backend.

### Patient view modal cleanup

File involved:

- `frontend/src/routes/patients.tsx`

Corrections made:

- Improved the `Voir patient` popup design only.
- Modal is centered and responsive.
- Modal uses max height and scrolls only inside the body.
- Added clean patient header:
  - Initials avatar
  - Full name
  - Status badge
  - Phone
- Organized patient details into sections:
  - `Informations personnelles`
  - `Informations cabinet`
  - `Notes`
- Added clean fallbacks:
  - Missing fields: `Non renseigné`
  - Missing notes: `Aucune note pour ce patient.`
- Added footer quick actions:
  - `Modifier`
  - `WhatsApp`
  - `Nouveau rendez-vous`
  - `Fermer`

No backend, auth, table layout, dashboard, or other module logic was changed for this modal cleanup.

## 2. What Works Well Now

- Supabase login works from the frontend.
- Supabase signup works, including improved duplicate-user error handling.
- Frontend stores and reuses the Supabase session after refresh.
- Frontend sends Bearer tokens to FastAPI.
- FastAPI verifies tokens through Supabase Auth, not manual JWT decoding.
- `/auth/onboard` can create cabinet/profile for new users.
- `/auth/me` returns authenticated profile and cabinet data.
- Protected routes redirect correctly based on session/profile state.
- Logout is clear and user-friendly.
- CORS works for local frontend ports `5173` and `8080`.
- Role labels are user-friendly.
- Settings has the first team-management foundation.
- Patients page is backend-connected for list/add/edit/delete.
- Patient actions are no longer just decorative.
- Patient detail modal now looks cleaner and more production-ready.

## 3. What You Did / Current Setup Assumptions

You already have:

- Supabase project created.
- Supabase SQL schema run successfully.
- `dental-documents` storage bucket created.
- FastAPI backend running locally at `http://localhost:8000`.
- FastAPI docs available at `http://localhost:8000/docs`.
- Frontend running locally, sometimes at:
  - `http://localhost:5173`
  - or `http://localhost:8080`
- Auth/login/onboarding now working.
- Patients page moved from local/mock state toward real backend data.

Important current local env variables:

Frontend needs:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

Backend needs:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:5173
```

Note:

- `SUPABASE_JWT_SECRET` is no longer required for local token verification.
- Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only. Never expose it in frontend env.

## 4. How To Make Everything Work Locally

### Backend

From `backend`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check:

- Open `http://localhost:8000/health`
- Open `http://localhost:8000/docs`

### Frontend

From `frontend`:

```bash
npm install
npm run dev
```

Check:

- Open `http://localhost:5173`
- If your environment uses `8080`, open `http://localhost:8080`

### Login/signup test

1. Open `/login`.
2. Enter a real email and password.
3. Signup with a password of at least 6 characters.
4. If email confirmation is enabled in Supabase, confirm the email first.
5. Login again.
6. Confirm the app redirects to dashboard.
7. Refresh the page.
8. Confirm the session persists.
9. Open the profile dropdown.
10. Confirm role shows `Docteur propriétaire`.
11. Click `Déconnexion`.
12. Confirm redirect to `/login`.

### Auth API test

After logging in from the browser:

- `/auth/onboard` should create or return profile/cabinet.
- `/auth/me` should return user/cabinet data.

From browser DevTools Network tab:

- Requests to FastAPI should include:

```http
Authorization: Bearer <access_token>
```

### Patients test

1. Login.
2. Go to `/patients`.
3. Confirm real patients load from backend.
4. Add a patient.
5. Click `Voir`.
6. Confirm the new details modal layout is readable.
7. Click `Modifier`.
8. Save changes.
9. Click `WhatsApp`.
10. If phone exists, WhatsApp Web should open.
11. If phone is missing, toast should show `Numéro WhatsApp du patient manquant.`
12. Delete the patient and confirm it disappears.

## 5. Current Limitations / Missing Pieces

### Critical before production

- Recreate or restore env example files if needed:
  - `backend/.env.example` currently shows as deleted in git status.
  - `frontend/.env.example` currently shows as deleted in git status.
- Confirm all Supabase RLS policies are correct in the live project.
- Confirm every backend route uses authenticated `current_user.cabinet_id`.
- Add proper production deployment env handling.
- Add stronger validation for patient inputs.
- Add real error boundaries for failed backend/API states.

### Important

- Team invitation is only a foundation:
  - No real invite email yet.
  - No pending invitation table flow yet.
  - No accept-invite flow yet.
- Other modules are still mostly mock/local UI:
  - Appointments
  - Payments
  - Recalls
  - Google reviews
  - Ordonnances
  - Certificats médicaux
  - Dashboard analytics
- Dashboard still reads mostly demo/mock data unless connected separately.
- WhatsApp currently uses WhatsApp Web behavior, not Cloud API delivery tracking.
- PDF services exist on backend, but full frontend/backend production flow still needs deeper testing.

### Nice to have

- Add loading skeletons in more pages.
- Add success/error states for all modules.
- Add team member edit/disable flows.
- Add audit logs for auth-sensitive actions.
- Add automated tests for auth, onboarding, and tenant scoping.
- Add end-to-end tests for login -> onboard -> patients CRUD.

## 6. Biggest Risks

- Env examples are deleted in the current worktree, which can make setup harder for another machine.
- Some modules still use `frontend/src/lib/demo-data.ts`.
- If Supabase email confirmation is enabled, signup may not return a session immediately. The UI handles this message, but the user must confirm email before login.
- Team invites are not real yet; the backend intentionally returns a TODO-style response.
- WhatsApp Web cannot provide reliable sent/delivered/read logs.
- PDF generation can depend on native dependencies depending on the renderer path.
- Deployment will fail if frontend/backend env variables are not set correctly.
- Large frontend chunks are shown as Vite warnings during build. This is not currently blocking, but it is worth optimizing later.

## 7. Recommended Next Steps

1. Restore/create clean `.env.example` files for frontend and backend.
2. Run a full manual smoke test:
   - Signup
   - Login
   - Refresh session
   - Logout
   - Patients CRUD
3. Commit the completed Phase 1 and Patients work.
4. Finish real team invitation design:
   - Add invitation table/migration.
   - Add invite token.
   - Add accept-invite page.
   - Link invited user to cabinet after signup.
5. Connect Appointments next.
6. Connect Payments after Appointments.
7. Connect Recalls and Reviews after patient/payment data is reliable.
8. Connect Ordonnances and Certificats with role restrictions.
9. Test PDF generation end to end.
10. Decide between WhatsApp Web-only MVP and WhatsApp Cloud API production flow.
11. Add automated backend tests for tenant scoping.
12. Prepare deployment checklist.

## 8. Verification Done

Frontend production build was run successfully:

```bash
npm.cmd run build
```

Observed non-blocking warnings:

- Some Vite chunks are larger than 500 kB.
- Node showed a `punycode` deprecation warning.

These warnings do not block the current local build.

## 9. Short Copy/Paste Summary

DentalPilot/DentaFlow now has real Supabase Auth wired into the frontend, Bearer-token API calls to FastAPI, backend token verification through Supabase `/auth/v1/user`, onboarding that creates cabinet/profile for new users, protected routes, logout dropdown UX, role labels, team-management foundation, and Patients CRUD connected to backend. Patients actions now work, and the `Voir patient` modal has been cleaned up. Remaining work: restore env examples, finish real team invitations, connect the remaining modules, test PDFs/WhatsApp production behavior, and add tenant-scope tests.
