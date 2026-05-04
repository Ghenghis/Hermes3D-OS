# Hermes3D-OS Playwright E2E

Per the [4-agent split plan](../../docs/handoffs/SPLIT_PLAN.md), every branch ships with a Playwright spec covering its feature end-to-end.

## Running locally

```bash
npm install
npx playwright install --with-deps chromium
npm run test:e2e
```

## Adding a spec for your branch

Name the file after the branch scope so it's easy to map to the PR:

| Branch type | Spec file |
|---|---|
| `app/<id>` | `tests/e2e/app-<id>.spec.ts` |
| `tab/<page-id>` | `tests/e2e/tab-<page-id>.spec.ts` |
| `btn/<page>-<button>` | `tests/e2e/btn-<page>-<button>.spec.ts` |
| `setting/<id>` | `tests/e2e/setting-<id>.spec.ts` |
| `foundation/<id>` | `tests/e2e/foundation-<id>.spec.ts` |

Each spec must:
1. Assert at least one user-visible outcome (rendered text, status pill, network call, etc.)
2. Run in under 30 seconds
3. Not depend on external services (mock or skip)

## Backend tests

If your branch touches `apps/api/`, add a second `webServer` config in `playwright.config.ts` for `npm run serve:api` and assert against the API responses too.
