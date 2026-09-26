# educk-attendance-portal

Attendance domain web remote for EduTrack. HU-005 provides a teacher-facing daily roll call with an ISO date, official attendance statuses, live summary cards and an API-shaped session payload.

## Local development

Requires Node 22 LTS or 24.

```bash
npm ci
npm test
npm run dev
```

The portal runs on `http://localhost:3003`. This slice uses simulated roster data and does not send HTTP requests. The future `POST /sessions` integration must use the shared HTTP client from `educk-front`.

## Branching

Changes enter `develop` through `feat/`, `fix/` or `chore/` Pull Requests. Promotion to `qa` and `main` uses the documented re-application flow; permanent branches are never merged directly.
