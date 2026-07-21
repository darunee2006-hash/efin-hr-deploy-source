# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EFIN HR — a bilingual (Thai/English) HR management system for eFinance Thai. React 19 + Vite SPA backed by Supabase (Postgres + Auth), deployed to Vercel, with an optional Electron portable-Windows-app packaging path. See [efin-hr-system-overview.md](efin-hr-system-overview.md) (Thai) for the full page/feature/role inventory.

## Commands

```
npm run dev              # start Vite dev server
npm run build             # production build (vite build)
npm run lint               # eslint .
npm run preview            # preview a production build
npm run electron:dev       # run current build inside Electron
npm run electron:build     # build + package a portable Windows exe via electron-builder
```

There is no test suite configured (no test script, no test files/framework in the repo).

Note: `package.json` `main` points at `electron/main.cjs` and `electron-builder.json` references `electron/icon.png`, but there is currently no `electron/` directory in the repo — the `electron:*` scripts will not run until that is added.

Deployment is via Vercel, and the Vercel project is **not** connected to this Git repo — pushing to Git does nothing to the live site. Deploys happen by running `deploy-to-production.bat` (or `vercel deploy --prod` directly), which uploads the current local build. Treat any deploy as a real production push and confirm with the user before running it.

## Architecture

### Role-based page routing (no router)

There is no route-based navigation — `page` is plain React state in [App.jsx](src/App.jsx). Each role has an explicit allow-list of pages in `ROLE_PAGES` (`admin` / `manager` / `employee`); `superuser` reuses the `admin` list. If the current `page` isn't in the active role's list, it silently falls back to `dashboard`. When adding a new page:
1. Add the component import + entry to the relevant role list(s) in `ROLE_PAGES` in [App.jsx](src/App.jsx).
2. Add a nav entry with a `minRole` to `NAV` (or `ADMIN_NAV` for admin-only) in [Layout.jsx](src/components/Layout.jsx) — visibility there is enforced separately via `ROLE_LEVEL` (`employee` < `manager` < `admin` < `superuser`).
3. Add a label — either a `translations.js` key or an entry in `extraLabels` in [Layout.jsx](src/components/Layout.jsx).

These two allow-lists ([App.jsx](src/App.jsx) `ROLE_PAGES` and [Layout.jsx](src/components/Layout.jsx) `NAV`/`ADMIN_NAV`) are maintained independently and must be kept in sync manually — nothing enforces that a page reachable in one is visible in the other.

### Auth & permissions

[lib/AuthContext.jsx](src/lib/AuthContext.jsx) wraps Supabase Auth. `role` comes from the `hr_user_profiles` table (joined with `hr_employees` for an English display name, with a fallback query if the join is blocked by RLS), not from Supabase Auth metadata. Permission booleans (`isAdmin`, `isManager`, `canViewSalary`, etc.) are derived as a strict hierarchy where each level implies the ones below (`isManager = role === 'manager' || isAdmin`) — `superuser` is the only role that can see Payroll/Cost Analysis (`canViewSalary`).

### Multi-company filtering

[lib/CompanyFilterContext.jsx](src/lib/CompanyFilterContext.jsx) loads `hr_companies` and exposes a company selector ("all" or one company code) used across pages to scope data. Use `applyCompanyFilter(query, column)` to scope a Supabase query server-side, or `filterByCompany(items, field)` / `filterByEmployeeCompany(items, employees, field)` to filter already-fetched arrays client-side. `filterVersion` is provided as a stable memo dependency for pages that need to re-run filtering when the selected company or company list changes.

### Data access

[lib/supabase.js](src/lib/supabase.js) exports a single `supabase` client (anon key, RLS-protected). All app tables are prefixed `hr_` (e.g. `hr_employees`, `hr_user_profiles`, `hr_companies`). [lib/hooks.js](src/lib/hooks.js) provides the standard data-access pattern used across pages:
- `useSupabase(table, { select, orderBy, ascending, filters, limit })` — generic list-fetch hook returning `{ data, loading, error, refetch, setData }`.
- `insertRow` / `updateRow` / `deleteRow` / `bulkInsert` — thin wrappers around Supabase mutations that throw on error.
- `fmt(n, decimals)` / `fmtDate(d, lang)` — shared number/date formatting; Thai dates render in the Buddhist calendar (`+543` years).

### i18n

There is no i18n library — [lib/translations.js](src/lib/translations.js) exports a flat `T` dictionary of `{ key: { th, en } }` plus a `t(key, lang)` lookup helper (falls back to `en`, then the raw key). Page-specific/nav-specific labels not worth centralizing live in local `extraLabels`-style maps (see [Layout.jsx](src/components/Layout.jsx)). Every page component receives `lang` as a prop and switches strings manually — there is no context-based translation injection.

### Shared UI

[components/PageUI.jsx](src/components/PageUI.jsx) and [components/UI.jsx](src/components/UI.jsx) hold the shared design-system pieces (`PageHeader`, `KPICard`, `Section`, etc.) built around the brand green `#78c045`. [components/ImportExport.jsx](src/components/ImportExport.jsx) centralizes Excel import/export (SheetJS/`xlsx`) used by pages that support bulk data upload/download. Each page is wrapped in its own [ErrorBoundary](src/components/ErrorBoundary.jsx) instance in [App.jsx](src/App.jsx), keyed by `` `${currentPage}-${refreshKey}` `` so a crash on one page doesn't take down the whole app and a manual refresh remounts it cleanly.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` (see [vite.config.js](vite.config.js)) — no separate Tailwind config file; v4's CSS-based config lives in [src/index.css](src/index.css).
