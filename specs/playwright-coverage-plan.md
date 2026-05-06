# Playwright Coverage Plan

## Scope

- App/API: daily-gym Next.js app, authenticated fitness tracker UI, AI routes, and Strava integration routes.
- Environment: local Playwright server on `http://127.0.0.1:3000`.
- Risk level: branch/PR gate for authenticated shell/navigation and API contracts.
- Gate target: PR-ready second pass with real login state from `.env.e2e`.

## Coverage Matrix

| Feature/API | Scenario | Type | Tags | Preconditions | Expected result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Auth boundary | Visiting `/` redirects through the default authenticated route and ends on login when no session exists | E2E | `@smoke @critical @e2e @auth` | Fresh browser context, Firebase dummy config | Login form is visible and URL is `/login` | Playwright trace/report |
| Login | Login form exposes email/password fields and submit CTA | E2E | `@smoke @e2e @auth @a11y` | Fresh browser context | Accessible labels and buttons are present | Role/label assertions |
| Registration | User can switch between login and account creation modes | E2E | `@regression @e2e @auth` | Login page loaded | Name field appears in create mode and disappears when returning | Role/label assertions |
| Protected route | Direct navigation to `/calendar` redirects unauthenticated users to login | E2E | `@critical @e2e @auth` | Fresh browser context | Login form is shown | URL and heading assertions |
| Protected routes matrix | Anonymous navigation to all authenticated entry routes redirects to `/login` | E2E | `@critical @e2e @auth @regression` | Fresh browser context | Every protected URL ends on login form | `test.step` evidence per route in report/trace |
| Auth setup | Login UI with `.env.e2e` test user before each authenticated scenario | E2E | `@auth @setup @critical` | `.env.e2e` with `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` | Session starts authenticated for logged-route tests | Login assertions + route assertions |
| Logged route matrix | Authenticated user can access `/calendar`, `/workouts`, `/meals`, `/reports`, `/water`, `/personal-ai` | E2E | `@smoke @critical @e2e @auth` | Auth setup project completed | Routes render and do not redirect to `/login` | URL + heading assertions |
| Logout flow | Authenticated user opens account menu and signs out | E2E | `@regression @e2e @auth` | Auth setup project completed | Account menu is visible and logout redirects to `/login` | Menu and URL assertions |
| Responsive auth UI | Login surface works in desktop and mobile Chromium projects | E2E | `@mobile @e2e @auth` | Playwright projects configured | Same critical assertions pass on mobile profile | Project matrix |
| Login/register form contracts | Auth form keeps required fields, autocomplete, and minimum password constraints across mode switch | E2E | `@smoke @e2e @a11y` | Login page loaded | `checkValidity()` reflects required fields in login and register modes | DOM attribute and validity assertions |
| Strava config | `GET /api/strava/config` returns current client id envelope | API | `@smoke @api @contract` | Server secrets cleared by Playwright config | `200`, JSON content type, `clientId` string | API response assertions |
| Strava webhook | Challenge validation rejects missing params and invalid token | API | `@api @negative @contract` | Verify token set to `playwright-token` | `400` and `403` envelopes | API response assertions |
| Strava webhook | Valid challenge returns `hub.challenge` | API | `@critical @api @contract` | Verify token set to `playwright-token` | `200`, challenge echoed | API response assertions |
| Strava OAuth/import | Missing code or credentials are rejected | API | `@api @negative @contract` | Server secrets cleared | `400` validation envelopes | API response assertions |
| Route methods | Unsupported methods return `405` for API routes with limited handlers | API | `@api @negative @contract` | Server running | `405` for GET/POST mismatches | Explicit status assertions |
| Strava infrastructure guardrails | Subscription list/create and OAuth/import refresh return `500` with JSON error when env is absent | API | `@api @negative @contract` | `STRAVA_CLIENT_ID/SECRET` cleared | `500`, JSON content type, error mentions missing env | API response assertions |
| Strava subscription | Invalid delete query is rejected | API | `@api @negative @contract` | No external Strava call needed | `400` validation envelope | API response assertions |
| Personal AI | Invalid payload is rejected and valid payload falls back to mock | API | `@critical @api @contract` | `OPENAI_API_KEY` cleared | `400` invalid, `200` valid with `source: mock` | API response assertions |
| GPT report | Invalid payload is rejected and valid payload returns mock analysis | API | `@api @contract` | `OPENAI_API_KEY` cleared | `400` invalid, `200` valid with required fields | API response assertions |
| Workout share analysis | Invalid payload is rejected and valid payload returns local analysis | API | `@api @contract` | `OPENAI_API_KEY` cleared | `400` invalid, `200` valid with share fields | API response assertions |

## Required Projects

- `chromium`
- `mobile-chromium`

## Data and Mocking

- Test data is synthetic and embedded in specs.
- Firebase public env comes from project env files; authenticated coverage uses `.env.e2e` credentials via login UI.
- OpenAI and Strava server secrets are cleared by the Playwright web server environment.
- External OpenAI/Strava calls are avoided; tested success paths use local mock/fallback code where available.

## Known Gaps

| Gap | Risk | Mitigation |
| --- | --- | --- |
| Authenticated coverage is focused on shell/navigation and logout; CRUD write flows are still out of gate | Medium/high for production release | Add read-write scenarios with isolated seed data and cleanup strategy |
| Third-party Strava happy paths are not exercised end to end | Medium | Add mocked Strava responses with `page.route`/API route dependency seams, or controlled sandbox credentials |
| Accessibility coverage is limited to locator-level labels/headings | Medium | Add axe or Playwright accessibility snapshots for critical authenticated pages |
| Visual regression is not enabled | Low/medium | Add stable screenshots after authenticated state is deterministic |
