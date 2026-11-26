# Assessment verification report

Verified locally on November 25, 2026 after applying the submission audit fixes. The assessment requires the four basic operations, tests for both layers, and a coverage report. The reviewed scope also includes the optional power, square root, and percentage operations. [Assessment](ASSESSMENT.md) · [Functional specification](SPEC.md) · [UI specification](UI_SPEC.md)

## Results

| Check | Result |
| --- | --- |
| React tests, Node 24.22.2 on Windows | A clean `npm ci` from the lockfile succeeded. All 57 tests passed. Calculator code measured 89.04% statements, 85.81% branches, 91.11% functions, and 91.71% lines. Running coverage generates `frontend/coverage/index.html`. |
| Frontend production build | TypeScript check and Vite build passed. |
| Native Go 1.27.4 on Windows AMD64 | Both test packages passed. Coverage was 90.8% statements overall, 90.9% in arithmetic and 96.1% in HTTP. Vet and API build passed. |
| Dependency and workflow checks | `govulncheck` found zero vulnerabilities on Go 1.27.4. The clean npm install reported zero advisories. `actionlint` passed. |
| Live Chromium smoke | All seven scenarios passed against React and Go. They verified full-precision division used in a chain, ordinary and contextual division-by-zero recovery, marker persistence across modes, percentage of a value, mobile history focus, keyboard and mouse tooltip behavior, and visible Equals focus with only one request during repeated keyboard activation. |

Earlier one-off Chromium checks verified that all digits of a 50-digit entry remain reachable by internal scrolling at 320 CSS px, that a touch hold shows help without setting an operator, and that an outside tap dismisses help. On the same emulated touch viewport with reduced motion enabled, a tap sent a real square-root request and displayed the result without animation. The result then fed a real power request using the `^` shortcut. Physical touch devices, screen-reader output, and macOS clipboard shortcuts remain outside this run.

## Docker verification

`docker compose config --quiet` passed. A full build and startup with `docker compose up --build -d --wait` reached healthy status for both services on Docker Desktop’s Linux engine. The host UI returned HTTP 200, `POST /api/calculate` through Nginx returned `{"result":40}` for 25 + 15, and inspection confirmed that Go had no host port mapping. All seven Chromium scenarios passed against `http://127.0.0.1:8088`. A direct Windows run also honored a custom `CALCULATOR_ADDR`. [Docker setup](../README.md#run-with-docker)

## What the suites establish

- **Go arithmetic** exercises all seven operation identifiers and all four contextual percentage forms. It includes signed and fractional operands, negative zero divisors, invalid real powers, negative roots, overflow, and rates small enough to underflow with naive intermediate arithmetic. Keep arithmetic edge cases here where failures can be isolated. [Arithmetic tests](../backend/internal/calculator/calculator_test.go)
- **HTTP integration** routes real requests through the mux and arithmetic service using `httptest`. Public assertions verify status, headers, a numeric JSON `result`, and independent error fields. It covers duplicate keys, unknown and mistyped fields, forbidden modifiers, trailing data, request size, and mathematical errors. [HTTP tests](../backend/internal/httpapi/handler_test.go)
- **React behavior** renders the calculator and mocks the fetch boundary. Tests verify what users see and what gets sent, including full numeric precision, operator replacement, repeated Equals, stale responses, delayed loading, retry after network/HTML/JSON errors, clipboard edits, and history recording. The failed-chain regression confirms `8 ÷ 0 ×` preserves the previous history entry and leaves division editable. Correcting the divisor and continuing records only `8 ÷ 2 = 4` and `4 × 3 = 12`. The mock makes race ordering deterministic. The separate Chromium smoke checks the real Vite proxy, Go responses, and browser focus. [React tests](../frontend/src/calculator/Calculator.test.tsx) · [Browser smoke](../frontend/scripts/browser-smoke.mjs)
- **Coverage scope** matters. Vitest instruments `src/calculator/**/*.{ts,tsx}` and excludes the test file. Its percentages cover calculator source and say little about CSS, browser focus, or touch. Go instruments all module packages, including the server entry point, which has 0% statement coverage. The live browser smoke exercises the running server, while startup contributes no statements to the Go unit-test profile. [Vitest configuration](../frontend/vite.config.ts) · [Server entry point](../backend/main.go)

## Remaining browser checks

The React suite stubs `matchMedia` to match every query. The Chromium smoke covers the mobile drawer with forward Tab and Escape. A separate Chromium check exercised the dock-to-drawer transition when selecting Large. A screen-reader pass for results and errors remains open. The arithmetic and HTTP suites already cover the assessment's core contracts.

## GitHub Actions

GitHub Actions runs separate Ubuntu jobs on pushes to `main` and on pull requests. The backend job reads Go 1.27.4 from `backend/go.mod`, runs uncached tests with module-wide coverage, vets all packages, and builds the API. The frontend job uses Node 24 and runs `npm ci`, `npm run coverage`, and `npm run build` from `frontend/`. Both jobs print coverage in their logs. The live browser smoke is a separate local check. [Workflow](../.github/workflows/backend.yml)

The earlier hosted backend baseline used Go 1.25.0. The results above are from the current local run on Go 1.27.4 and Node 24.22.2. The submission audit fixes have yet to run on GitHub-hosted Ubuntu. [Earlier hosted run](https://github.com/Ralet11/fullstack-calculator/actions/runs/45533516701)

## Reproduce

From `frontend/`, install the locked dependencies on a fresh checkout, then run coverage and the production build.

```sh
npm ci
npm run coverage
npm run build
```

From `backend/`, run the same backend checks as CI. The review used temporary paths for the Go profile and executable.

```sh
go test -count=1 -coverpkg=./... '-coverprofile=coverage.out' ./...
go tool cover '-func=coverage.out'
go vet ./...
go build -o calculator-api .
```

With Go and Vite running, install Chromium and run the smoke test from `frontend/`. [Local startup instructions](../README.md#run-locally)

```sh
npx playwright-core install --only-shell chromium
npm run test:smoke
```
