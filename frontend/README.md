# MacroDashboard Frontend

React + TypeScript + Vite frontend for the MacroDashboard stream-driven analytics UI.

## Configuration

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Available environment variables:

- `VITE_API_BASE_URL`: Backend URL (default: `http://localhost:8000`)

## Scripts

- `npm run dev`: Start local development server
- `npm run lint`: Run ESLint
- `npm run test`: Run Vitest unit tests
- `npm run test:e2e`: Run Playwright end-to-end tests
- `npm run build`: Type-check and build production bundle
- `npm run preview`: Preview production build

## Testing Notes

- Unit tests run with Vitest (`src/**/*.test.ts[x]`).
- E2E tests run with Playwright (`tests/e2e`).
- First-time Playwright setup requires browser installation:

```bash
npx playwright install
```
