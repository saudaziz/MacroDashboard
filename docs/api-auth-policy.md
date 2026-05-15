# API Auth Policy

## Scope
This policy defines authentication behavior for MacroDashboard API endpoints.

## Protected Endpoints (require `X-API-Key` matching backend `MACRO_API_KEY`)
- `POST /api/stream-dashboard`
- `POST /api/generate-dashboard`
- `POST /api/cancel-dashboard`
- `POST /api/resume-workflow`

## Public Read Endpoints
- `GET /api/status`
- `GET /api/providers`
- `GET /api/latest-dashboard`

## Expected Status Codes
- Missing/invalid API key on protected endpoint: `401`
- Auth not configured on backend (`MACRO_API_KEY` missing/empty): `503`
- Public endpoints: no API key required

## Frontend Contract
- Frontend does not bundle any API secret via `VITE_*`.
- If runtime key is needed for local testing, it may be set at runtime in browser session storage key `macro_api_key`.
- Production deployments should use a server-side auth/session model or trusted reverse proxy injection.
