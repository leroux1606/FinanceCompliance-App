# Comprehensive Code Review — South African Financial Compliance App

**Reviewed:** 2026-03-22
**Commit:** `c2def89` (Initial commit)
**Reviewer:** Claude Opus 4.6

---

## 1. Project Overview

A Next.js 14 / TypeScript web application for South African companies to assess financial compliance and audit readiness. Covers IFRS, Companies Act, and SARS tax checks against uploaded trial balance data. Uses Prisma + SQLite, Tailwind CSS, and React PDF.

**File count (excluding node_modules/.git):** ~38 source files
**Lines of code (approx):** ~2,200

---

## 2. Security Issues

### 2.1 CRITICAL — `.env` file committed to git
- **File:** `.env`
- **Issue:** The `.env` file is tracked in the repository despite `.env` being listed in `.gitignore`. Once a file is committed, `.gitignore` no longer excludes it. The file currently contains only `DATABASE_URL` and `NEXT_PUBLIC_APP_URL` (low-sensitivity), but this sets a dangerous precedent — any secrets added later will be exposed in git history.
- **Remedial action:** Run `git rm --cached .env` to untrack the file. If any secrets were ever committed, rotate them and use `git filter-branch` or `BFG Repo Cleaner` to purge from history.

### 2.2 HIGH — Mass assignment in PATCH `/api/companies/[id]`
- **File:** `app/api/companies/[id]/route.ts:35-38`
- **Issue:** The PATCH handler passes `body` directly to `prisma.company.update({ data: body })`. An attacker could modify `id`, `createdAt`, or any field by sending arbitrary JSON.
- **Remedial action:** Whitelist allowed fields explicitly:
  ```ts
  const { name, industry, financialYearEnd } = body;
  data: { name, industry, financialYearEnd }
  ```

### 2.3 HIGH — No authentication or authorization
- **Issue:** All API endpoints are publicly accessible. Any user can create, read, update, and delete companies, upload trial balances, and download reports. For a financial compliance application, this is a significant risk.
- **Remedial action:** Implement authentication (e.g., NextAuth.js, Clerk, or custom JWT) and role-based access control. At minimum, protect write operations and restrict report access to authorized users.

### 2.4 MEDIUM — No rate limiting
- **Issue:** No rate limiting on any API endpoint. The upload endpoint is particularly vulnerable as it processes files and runs compliance checks.
- **Remedial action:** Add rate limiting middleware (e.g., `next-rate-limit` or edge middleware with token bucket).

### 2.5 MEDIUM — No CSRF protection on mutating endpoints
- **Issue:** POST/PATCH/DELETE endpoints have no explicit CSRF protection beyond the same-origin policy.
- **Remedial action:** Consider adding CSRF tokens for form submissions if the app will be used in browsers that may have relaxed SameSite cookie policies.

### 2.6 LOW — No input length validation
- **Issue:** Company name, industry, and other text fields have no maximum length constraints at the API level.
- **Remedial action:** Validate input lengths in API handlers to prevent excessively large payloads from being stored.

---

## 3. Data Integrity & Logic Issues

### 3.1 HIGH — Float type for financial amounts
- **File:** `prisma/schema.prisma:42-43`
- **Issue:** `debit` and `credit` fields use `Float`, which is IEEE 754 floating-point. This causes rounding errors with financial calculations (e.g., `0.1 + 0.2 !== 0.3`). The tolerance check at `0.01` in the compliance engine may mask these errors.
- **Remedial action:** Use `Decimal` type in Prisma schema. Update the compliance engine and parsers to work with `Decimal` or integer cents.

### 3.2 HIGH — Trial balance balance check is dead code
- **File:** `app/api/trial-balance/upload/route.ts:64-74` vs `src/lib/compliance-engine/checks.ts:40-68`
- **Issue:** The upload API rejects any trial balance where debits ≠ credits (with 0.01 tolerance) *before* running compliance checks. This means `runTrialBalanceBalances()` will *never* return `HIGH_RISK` because unbalanced data is rejected at upload. The check exists in the engine but can never trigger in the actual workflow.
- **Remedial action:** Either (a) remove the balance pre-check from the upload route and let the compliance engine handle it, or (b) document that this check is only used for offline/seed scenarios, or (c) change the upload to warn rather than reject.

### 3.3 MEDIUM — Rule fallback to `rules[0]`
- **Files:** `app/api/trial-balance/upload/route.ts:103`, `prisma/seed.ts:93`
- **Issue:** When a compliance check result doesn't match a rule code, it falls back to `rules[0]`. This silently associates the result with the wrong rule, corrupting report data.
- **Remedial action:** Throw an error or skip the result if no matching rule is found. Ensure all rule codes in the compliance engine have corresponding database entries.

### 3.4 MEDIUM — Seed industry doesn't match UI options
- **File:** `prisma/seed.ts:59` vs `app/companies/new/page.tsx:8-19`
- **Issue:** The seed creates a company with industry `"Wholesale and Retail"`, but the `NewCompanyPage` industry dropdown does not include this option. It lists `"Retail"` separately.
- **Remedial action:** Either add "Wholesale and Retail" to the industry list or update the seed to use one of the existing options.

### 3.5 MEDIUM — Upload page default date not submitted
- **File:** `app/companies/[id]/upload/page.tsx:56-58, 84`
- **Issue:** The `periodEnd` state initializes as `''`. The input displays `defaultPeriod` via `value={periodEnd || defaultPeriod}`, but if the user doesn't interact with the date picker, `periodEnd` remains `''` and the form validation at line 18 (`if (!file || !periodEnd)`) will fail. The visual default is misleading.
- **Remedial action:** Initialize `periodEnd` state with `defaultPeriod` value, or set it in a `useEffect`.

### 3.6 LOW — CSV parser doesn't handle escaped quotes
- **File:** `src/lib/compliance-engine/parser.ts:64-81`
- **Issue:** The custom CSV parser toggles `inQuotes` on any `"` or `'` character. It doesn't handle RFC 4180 escaped quotes (`""` inside quoted fields), which is standard in CSV exports from accounting software.
- **Remedial action:** Use the already-installed `csv-parse` dependency (listed in `package.json` but never imported) instead of the custom parser, or fix the quote-escaping logic.

### 3.7 LOW — `csv-parse` dependency is unused
- **File:** `package.json:24`
- **Issue:** `csv-parse` is listed as a dependency but is never imported anywhere. A custom CSV parser is used instead.
- **Remedial action:** Either use `csv-parse` for robust CSV parsing or remove it from dependencies.

---

## 4. Code Quality Issues

### 4.1 MEDIUM — Duplicate `cn` utility function
- **Files:** `src/lib/utils.ts:4-6` and `components/ui/button.tsx:5-7`
- **Issue:** The `cn` (classnames merge) utility is defined in two places. `Card` and `Badge` import `cn` from `./button` rather than from the canonical `@/src/lib/utils`. This creates a tight coupling between UI components.
- **Remedial action:** Remove `cn` from `button.tsx`, have all components import from `@/src/lib/utils`.

### 4.2 MEDIUM — Font configuration mismatch
- **Files:** `app/layout.tsx:6` vs `tailwind.config.ts:31-32`
- **Issue:** The layout imports and uses `Inter` font, but `tailwind.config.ts` references `var(--font-geist-sans)` and `var(--font-geist-mono)` CSS variables which are never defined. The font family configuration in Tailwind is effectively non-functional.
- **Remedial action:** Either switch to Geist fonts and set CSS variables, or update the Tailwind config to reference `Inter`.

### 4.3 MEDIUM — Inconsistent project structure
- **Issue:** Source code is split across three top-level directories:
  - `app/components/` — layout components (Nav)
  - `components/ui/` — UI primitives (Button, Card, Badge)
  - `src/lib/` — business logic and utilities
- This is confusing. Next.js App Router conventions typically co-locate components under `app/` or use a single `components/` directory.
- **Remedial action:** Consolidate to a consistent structure. Move all shared components to `components/` and all library code to `lib/` (or keep `src/lib/`).

### 4.4 MEDIUM — N+1 API calls on dashboard
- **File:** `app/page.tsx:18-61`
- **Issue:** The dashboard fetches `/api/companies`, then makes a separate `fetch(/api/companies/${id})` for *each* company. With many companies, this creates a cascade of API calls.
- **Remedial action:** Create a dedicated dashboard API endpoint (e.g., `/api/dashboard/stats`) that returns aggregated data in a single query.

### 4.5 MEDIUM — Sequential database inserts in upload
- **File:** `app/api/trial-balance/upload/route.ts:102-114`
- **Issue:** Compliance check results are inserted one-by-one in a `for` loop with individual `prisma.complianceCheckResult.create()` calls. With 10 checks, this means 10 sequential database round-trips.
- **Remedial action:** Use `prisma.complianceCheckResult.createMany()` to batch insert all results.

### 4.6 LOW — `let` where `const` suffices
- **File:** `app/api/trial-balance/upload/route.ts:93`
- **Issue:** `let rules = await prisma.complianceRule.findMany(...)` — `rules` is never reassigned, should be `const`.
- **Remedial action:** Change `let` to `const`.

### 4.7 LOW — Unused `err` catch parameter
- **File:** `app/companies/[id]/upload/page.tsx:49`
- **Issue:** `catch (err)` where `err` is never used.
- **Remedial action:** Change to `catch` (no parameter) or `catch (_err)`.

### 4.8 LOW — Unnecessary `requirements.txt`
- **File:** `requirements.txt`
- **Issue:** This is a Node.js/TypeScript project. The `requirements.txt` is a Python convention and contains only comments. It adds confusion.
- **Remedial action:** Remove the file.

### 4.9 LOW — Import style in compliance engine index
- **File:** `src/lib/compliance-engine/index.ts:2-11`
- **Issue:** Ten separate imports from `./checks`, one per line. Could be consolidated.
- **Remedial action:** Use a single import statement with destructuring.

---

## 5. Next.js / React Concerns

### 5.1 MEDIUM — Route handler `params` access pattern
- **Files:** All `[id]/route.ts` files, all `[id]/page.tsx` files
- **Issue:** In Next.js 14, `params` in route handlers and page components is synchronous. In Next.js 15, `params` becomes a Promise and must be `await`ed. The current code will break on upgrade.
- **Remedial action:** When upgrading to Next.js 15, update all `params.id` accesses to `(await params).id`. Consider adding a comment noting this.

### 5.2 MEDIUM — No error boundaries
- **Issue:** No `error.tsx` files anywhere in the app. Unhandled errors in server components or data fetching will show the default Next.js error page.
- **Remedial action:** Add `error.tsx` files at the root and in key route segments.

### 5.3 MEDIUM — No loading states
- **Issue:** No `loading.tsx` files. Client components manage their own loading state, but server-rendered transitions have no skeleton/spinner.
- **Remedial action:** Add `loading.tsx` files for key routes.

### 5.4 LOW — No `not-found.tsx`
- **Issue:** No custom 404 page.
- **Remedial action:** Add a root `not-found.tsx` for better UX.

### 5.5 LOW — `'use client'` on all pages
- **Issue:** All page components use `'use client'` with `useEffect` + `fetch` for data loading. None take advantage of React Server Components for initial data fetching.
- **Remedial action:** Consider converting pages to Server Components with server-side data fetching via Prisma directly, using client components only for interactive parts.

---

## 6. Testing

### 6.1 CRITICAL — No tests at all
- **Issue:** There are zero test files. No testing framework is configured. No unit tests, integration tests, or end-to-end tests.
- **Remedial action:**
  1. Install a test framework (e.g., Vitest or Jest + React Testing Library).
  2. Add unit tests for the compliance engine (`checks.ts`, `parser.ts`).
  3. Add API route integration tests.
  4. Add component tests for key UI flows.
  5. Consider Playwright or Cypress for E2E tests (file upload, report generation).

---

## 7. Performance

### 7.1 MEDIUM — No pagination
- **Issue:** Company listing, trial balance listing, and report listing fetch all records without pagination. Will degrade with data growth.
- **Remedial action:** Add `skip`/`take` parameters to API endpoints and pagination UI.

### 7.2 MEDIUM — No database indexes
- **File:** `prisma/schema.prisma`
- **Issue:** No explicit indexes beyond the `@id` and `@unique` decorators. Queries filtering by `companyId`, `trialBalanceId`, `category`, etc. will do full table scans.
- **Remedial action:** Add `@@index` annotations for frequently queried foreign keys.

### 7.3 LOW — No caching strategy
- **Issue:** No use of Next.js caching, `revalidate`, or any client-side cache. Every page load triggers fresh API calls.
- **Remedial action:** Consider `unstable_cache` or SWR/React Query for client-side caching.

---

## 8. DevOps & Deployment

### 8.1 HIGH — SQLite is not suitable for production
- **Issue:** SQLite doesn't support concurrent writes well and stores data in a single file. Not appropriate for a multi-user production deployment.
- **Remedial action:** Migrate to PostgreSQL or MySQL for production. Keep SQLite for local development.

### 8.2 MEDIUM — No CI/CD configuration
- **Issue:** No GitHub Actions, GitLab CI, or any CI/CD pipeline. No automated linting, type checking, or testing on commits.
- **Remedial action:** Add a CI workflow that runs `tsc --noEmit`, `eslint`, and tests.

### 8.3 LOW — No Docker/containerization
- **Issue:** No `Dockerfile` or `docker-compose.yml`. Deployment requires manual Node.js setup.
- **Remedial action:** Add a multi-stage Dockerfile for production builds.

### 8.4 LOW — No ESLint configuration file
- **Issue:** ESLint is in devDependencies with `eslint-config-next`, but there's no `.eslintrc.*` file in the project root. The `next lint` command may work with defaults, but custom rules aren't configured.
- **Remedial action:** Add an `.eslintrc.json` with the project's preferred rules.

---

## 9. Dependency Concerns

### 9.1 MEDIUM — Outdated Next.js version
- **File:** `package.json:20`
- **Issue:** Using `next@14.0.4`. Multiple security patches and features have been released since.
- **Remedial action:** Update to the latest Next.js 14.x patch release.

### 9.2 LOW — `xlsx` (SheetJS) licensing
- **File:** `package.json:23`
- **Issue:** The `xlsx` community edition has restrictive licensing terms for commercial use. The package recently changed its license from Apache-2.0.
- **Remedial action:** Review the SheetJS license for compliance with your use case. Consider `exceljs` as an alternative.

---

## 10. UX / Accessibility

### 10.1 MEDIUM — No delete confirmation
- **Issue:** The DELETE endpoint for companies exists but the UI doesn't expose it. If it were exposed, there's no confirmation dialog to prevent accidental deletion (cascade deletes all trial balances and reports).
- **Remedial action:** Add a confirmation modal before destructive actions.

### 10.2 MEDIUM — Admin page is read-only
- **File:** `app/admin/page.tsx`
- **Issue:** The page is titled "Admin Configuration" and mentions "Enable/disable as needed" but provides no way to toggle rules or modify settings.
- **Remedial action:** Either add actual admin functionality (PATCH endpoint for rules, toggle UI) or rename to "Compliance Rules Reference."

### 10.3 LOW — No responsive mobile navigation
- **File:** `app/components/layout/Nav.tsx`
- **Issue:** The nav bar uses a simple flex layout with no hamburger menu or mobile-responsive behavior.
- **Remedial action:** Add a mobile-friendly collapsible menu.

### 10.4 LOW — Missing ARIA labels
- **Issue:** Interactive elements (file upload, navigation links) lack descriptive ARIA labels for screen readers.
- **Remedial action:** Add `aria-label` attributes to key interactive elements.

---

## 11. Summary of Remedial Actions (Prioritized)

### Must Fix (Before any production use)
| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Remove `.env` from git tracking | Critical | Low |
| 2 | Add authentication/authorization | High | High |
| 3 | Fix mass assignment in PATCH endpoint | High | Low |
| 4 | Switch from Float to Decimal for financial amounts | High | Medium |
| 5 | Add basic test suite (at least compliance engine) | Critical | Medium |
| 6 | Plan migration from SQLite to PostgreSQL for production | High | Medium |

### Should Fix (Before beta/staging)
| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 7 | Fix dead TB_BALANCE check logic | Medium | Low |
| 8 | Fix rule fallback to `rules[0]` | Medium | Low |
| 9 | Fix upload page default date bug | Medium | Low |
| 10 | Use `csv-parse` or fix custom CSV parser | Medium | Low |
| 11 | Consolidate duplicate `cn` utility | Medium | Low |
| 12 | Fix font configuration mismatch | Medium | Low |
| 13 | Add error boundaries and loading states | Medium | Low |
| 14 | Fix N+1 dashboard API calls | Medium | Medium |
| 15 | Batch compliance result inserts | Medium | Low |
| 16 | Add database indexes | Medium | Low |
| 17 | Add rate limiting | Medium | Medium |
| 18 | Add CI/CD pipeline | Medium | Medium |
| 19 | Add pagination | Medium | Medium |

### Nice to Have (Polish)
| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 20 | Convert pages to Server Components | Low | Medium |
| 21 | Add admin rule toggle functionality | Low | Medium |
| 22 | Remove `requirements.txt` | Low | Low |
| 23 | Consolidate project structure | Low | Medium |
| 24 | Add Docker support | Low | Medium |
| 25 | Add mobile-responsive navigation | Low | Low |
| 26 | Improve accessibility (ARIA labels) | Low | Low |
| 27 | Remove unused `csv-parse` or use it | Low | Low |
| 28 | Add custom 404 page | Low | Low |
| 29 | Update Next.js to latest 14.x | Low | Low |

---

## 12. Positive Observations

- **Well-structured compliance engine** — Clean separation of types, checks, parser, and orchestration. Each check is a pure function, making them easy to test and extend.
- **Good use of TypeScript** — Strict mode enabled, types are well-defined for the compliance domain.
- **South African domain expertise** — SARS, PAYE, UIF, VAT 201, EMP201, IRP6 references are accurate and domain-appropriate.
- **Seed data is realistic** — The sample trial balance with ZAR accounts is a good starting point.
- **PDF report generation** — Functional PDF export with professional formatting.
- **Prisma schema design** — Cascade deletes and relations are properly configured.
- **UI component library** — Button, Card, Badge components are clean and reusable with consistent styling.
- **Good error handling in API routes** — Try/catch with proper HTTP status codes and error messages.
