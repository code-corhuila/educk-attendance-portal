# educk-attendance-portal

Attendance domain web remote for EduTrack. HU-005 provides a teacher-facing daily roll call with an ISO date, official attendance statuses, live summary cards and an API-shaped session payload.

## Local development

Requires Node 22 LTS or 24.

```bash
npm install
npm test
npm run dev
```

The portal runs on `http://localhost:3003`. The roster still uses simulated data.
Saving sends `POST /api/v1/attendance/sessions` through the shared HTTP client;
successful backend persistence requires the corresponding gateway deployment.

## Branching

Changes enter `develop` through `feat/`, `fix/` or `chore/` Pull Requests. Promotion to `qa` and `main` uses the documented re-application flow; permanent branches are never merged directly.

## Shared client build prerequisite

Check out `code-corhuila/educk-front` beside this repository before running
`npm install`. The local `educk-front` dependency exports the shared HTTP client;
Vite bundles it into the portal instead of leaving an unresolved browser import.
Run `npm test`, `npm run build`, and `npm run preview` to verify the production UI.
