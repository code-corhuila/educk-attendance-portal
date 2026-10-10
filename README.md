# educk-attendance-portal

Attendance domain web remote for EduTrack. HU-005 provides a teacher-facing daily roll call with an ISO date, official attendance statuses, live summary cards and an API-shaped session payload.

## Local development

Requires Node 22 LTS or 24.

```bash
npm ci
npm test
npm run dev
```

The portal runs on `http://localhost:3003`. It uses the shared HTTP client from `educk-front` to interact with the backend at `POST /api/v1/attendance`.

## Branching

Changes enter `develop` through `feat/`, `fix/` or `chore/` Pull Requests. Promotion to `qa` and `main` uses the documented re-application flow; permanent branches are never merged directly. Pull requests targeting `main` require approval from the repository code owner (@ariel5253). For full governance rules, see the shared `educk-docs` repository.
