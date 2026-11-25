# Assessment verification report

Reviewed November 25, 2026. Scope covers the active FullstackCalculator working tree based on `41c6112`, including local frontend changes. The assessment requires the four basic operations, tests for both layers, and a coverage report. The reviewed scope also includes the optional power, square root, and percentage operations. [Assessment](ASSESSMENT.md) · [Functional specification](SPEC.md) · [UI specification](UI_SPEC.md)

## Results

| Check | Result |
| --- | --- |
| React tests, Node 24.22.2 on Windows | A clean `npm ci` from the lockfile succeeded. All 56 tests passed. Calculator code measured 89.07% statements, 85.54% branches, 90.90% functions, and 91.78% lines. The HTML report was generated at `frontend/coverage/index.html`. |
| Frontend production build | TypeScript check and Vite build passed. |
| Native Go 1.27.4 on Windows AMD64 | Both test packages passed. Coverage was 92.8% statements overall, 90.9% in arithmetic and 96.1% in HTTP. Vet and API build passed. |
| Earlier native Go 1.25.0 run on Windows AMD64 | Arithmetic tests, vet, and API build passed. Windows Application Control blocked execution of the generated HTTP test executable, so this run produced no complete coverage result. |
| Live Chromium smoke | All six scenarios passed against React and Go. They verified full-precision division used in a chain, ordinary and contextual division-by-zero recovery, marker persistence across modes, percentage of a value, mobile history focus, and keyboard/mouse tooltip behavior. |

Earlier one-off Chromium checks verified that all digits of a 50-digit entry remain reachable by internal scrolling at 320 CSS px, that a touch hold shows help without setting an operator, and that an outside tap dismisses help. On the same emulated touch viewport with reduced motion enabled, a tap sent a real square-root request and displayed the result without animation. The result then fed a real power request using the `^` shortcut. Physical touch devices, screen-reader output, and macOS clipboard shortcuts remain outside this run.

## What the suites establish

- **Go arithmetic** exercises all seven operation identifiers and all four contextual percentage forms. It includes signed and fractional operands, negative zero divisors, invalid real powers, negative roots, overflow, and rates small enough to underflow with naive intermediate arithmetic. Keep arithmetic edge cases here where failures can be isolated. [Arithmetic tests](../backend/internal/calculator/calculator_test.go)
- **HTTP integration** routes real requests through the mux and arithmetic service using `httptest`. Public assertions verify status, headers, a numeric JSON `result`, and independent error fields. It covers duplicate keys, unknown and mistyped fields, forbidden modifiers, trailing data, request size, and mathematical errors. [HTTP tests](../backend/internal/httpapi/handler_test.go)
- **React behavior** renders the calculator and mocks the fetch boundary. Tests verify what users see and what gets sent, including full numeric precision, operator replacement, repeated Equals, stale responses, delayed loading, retry after network/HTML/JSON errors, clipboard edits, and history recording. The failed-chain regression confirms `8 ÷ 0 ×` preserves the previous history entry and leaves division editable. Correcting the divisor and continuing records only `8 ÷ 2 = 4` and `4 × 3 = 12`. The mock makes race ordering deterministic. The separate Chromium smoke checks the real Vite proxy, Go responses, and browser focus. [React tests](../frontend/src/calculator/Calculator.test.tsx) · [Browser smoke](../frontend/scripts/browser-smoke.mjs)
- **Coverage scope** matters. Vitest instruments `src/calculator/**/*.{ts,tsx}` and excludes the test file. Its percentages cover calculator source and say little about CSS, browser focus, or touch. Go instruments all module packages, including the server entry point, which has 0% statement coverage. The live browser smoke exercises the running server, while startup contributes no statements to the Go unit-test profile. [Vitest configuration](../frontend/vite.config.ts) · [Server entry point](../backend/main.go)

## Remaining browser checks

The React suite stubs `matchMedia` to match every query. The Chromium smoke covers the mobile drawer with forward Tab and Escape. A docked-to-modal history check and a screen-reader pass for results and errors remain useful manual checks. The arithmetic and HTTP suites already cover the assessment's core contracts.

## GitHub Actions

GitHub Actions runs separate Ubuntu jobs on pushes to `main` and on pull requests. The backend job reads Go 1.25.0 from `backend/go.mod`, runs uncached tests with module-wide coverage, vets all packages, and builds the API. The frontend job uses Node 24 and runs `npm ci`, `npm run coverage`, and `npm run build` from `frontend/`. Both jobs print coverage in their logs. The live browser smoke is a separate local check. [Workflow](../.github/workflows/backend.yml)

The earlier hosted baseline was independently confirmed in the GitHub job logs. Linux Go 1.25.0 reported 93.0% statements, and the test, vet, and build steps succeeded. That run predates the working tree covered by this report. The fresh backend figures in this report are from the native Windows Go 1.27.4 run. The updated workflow passed a local `actionlint` check, and the frontend commands passed from a clean Windows directory. The new frontend job has yet to run on GitHub-hosted Ubuntu. [Hosted baseline run](https://github.com/Ralet11/fullstack-calculator/actions/runs/45533516701)

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
