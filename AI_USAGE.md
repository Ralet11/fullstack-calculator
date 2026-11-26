# AI usage log

Append a dated entry for each substantive AI-assisted task. Capture the prompt and follow-ups that change the work, the outcome, decisions Ramiro explicitly made, pending recommendations, and checks actually run. Preserve prompt wording when possible and redact sensitive information. When a pending item is resolved, link the new decision to the original entry.

## 2026-11-24 — Initial assessment and specification review

### Prompt

> I'm starting a full-stack calculator project for a technical assessment.  
> I've prepared ASSESSMENT.md with the original requirements and SPEC.md with my proposed features and behavior.  
> I want to follow a lightweight spec-driven development approach, focusing on clean code, testability, maintainability, and future extensibility without overengineering.  
> First, review both documents and identify any missing requirements, inconsistencies, or unclear decisions. Suggest improvements where needed.  
> Also, create AI_USAGE.md to track the prompts we use, their outcomes, and the decisions made during development. Add basic project guidelines to AGENTS.md, including instructions to keep that log updated accurately.  
> For now, don't write application code or modify the existing specifications. Only create or update AI_USAGE.md and AGENTS.md.  
> Show me your findings and recommendations before we proceed.

### Outcome

Compared the assessment and proposed spec, initialized this log, and updated the project guidelines. The review identified open decisions around optional scope, percentage semantics, input and recovery behavior, numeric edge cases, the REST contract, and submission criteria.

### Decisions from Ramiro

- Use a lightweight spec-driven approach that favors clean, testable, maintainable code and leaves room for future extensions.
- Limit this pass to reviewing both documents and updating `AI_USAGE.md` and `AGENTS.md`. Keep application code and the existing specifications untouched and present the findings before proceeding.

### Pending recommendations

- Prioritize the four required operations and decide which optional features fit the assessment time box.
- Resolve percentage behavior with concrete examples and clarify how contextual percentages map to the seven named operations.
- Agree on numeric behavior, keypad and keyboard interactions, and the REST request, success, and error shapes before implementation.
- Capture testable mobile and recovery criteria and the submission requirements for documentation, coverage, repository sharing, and prompt disclosure.

### Checks run

- Read both documents and checked the guidelines against the actual filenames and assessment deliverables.
- Inspected the workspace for version control. `git status --short` reported that no Git repository was initialized.
- Verified that both source documents and `README.md` retained their original SHA-256 hashes, and confirmed the workspace file list. No application tests were run during this documentation review.

## 2026-11-24 — Calculator behavior and API specification

This entry follows up on the [initial assessment and specification review](#2026-11-24--initial-assessment-and-specification-review).

### Prompt

> Let's keep all seven operations in scope, but implement and test the four basic ones first.
>
> For the calculator, use sequential operations evaluated from left to right. Repeated equals should keep the result, changing a pending operator should replace it, and switching between Standard and Advanced modes should preserve the current state.
>
> I want both direct and contextual percentages. For contextual percentages, addition and subtraction should calculate the percentage of the first operand, while multiplication and division should treat it as a fraction.
>
> Use a single stateless POST /api/calculate endpoint. A boolean percentage modifier can distinguish contextual calculations.
>
> Also define input validation, consistent JSON errors, decimal formatting, keyboard behavior, and recovery from failed or outdated requests.
>
> Please update SPEC.md with these decisions, concrete API examples, and testable acceptance criteria. Keep it concise and avoid unnecessary complexity.
>
> Update AI_USAGE.md with this interaction and summarize the changes. Don't implement application code yet.

### Decisions from Ramiro

- Keep all seven operations in scope. Implement and test the four basic operations first.
- Evaluate chains left to right, keep the result on repeated equals, replace a pending operator before entering the right operand, and preserve state across modes.
- Support direct and contextual percentages. Use a percentage of the left operand for addition and subtraction and a fraction for multiplication and division.
- Use one stateless `POST /api/calculate` endpoint with a boolean contextual modifier. Limit this task to the spec and the usage log.

### Outcome

Updated `docs/SPEC.md` with milestone order, concrete success and error examples, and acceptance criteria for arithmetic, API validation, keyboard access, display, and request recovery. The spec also captures the assessment submission requirements.

### Defaults specified by Codex

- Direct percent divides by 100. The Advanced percent control toggles the contextual modifier when a basic operation has a right operand.
- The API uses an operation identifier and numeric operand array with stable JSON error codes. Arithmetic uses float64, with up to 12 significant digits for display and full precision for chaining. Zero to the zero power returns one.
- While a request is pending, the calculator accepts Clear and mode switching. Clear invalidates the request, and failures preserve the entry for correction or retry.

### Checks run

- Parsed the 11 documented success request/response pairs as JSON and independently recalculated their results. Parsed both JSON error examples.
- Checked the workspace file list and verified the assessment, README, and project guidelines retained their original SHA-256 hashes. No application tests were run.

## 2026-11-24 — Addition implementation

Tool: Codex (ChatGPT). Purpose: build and verify the first end-to-end calculation.

### Prompt

> Read SPEC.md, ASSESSMENT.md and AGENTS.md before implementation.
>
> Initialize the frontend with React, TypeScript and Vite. Use functional components and separate responsibilities:
>
> App: application layout and composition
>
> Calculator: connect state and UI.
> CalculatorDisplay: presentational component, receive data through props.
>
> CalculatorKeypad: render buttons and dispatch actions through callbacks
>
> useCalculator: manage interaction state with useReducer and coordinate API requests.
>
> calculatorApi: handle HTTP requests using native fetch.
> Keep the reducer pure. Handle async operations outside the reducer
>
> Use useEffect only for actual side effects, such as keyboard listeners. Avoid unnecessary useMemo, useCallback, global state or dependencies.
>
>
> Use CSS Modules with shared CSS variables. Keep styling responsive and resuable.
>
> Initialize the backend with Go and net/http. Separate HTTP handlers from mathematical logic. Validate inputs and return consistent JSON responses.
>
> Implement addition only for now. Make sure the full flow works, from entering numbers in the calculator to sending the request to the Go backend and displaying the result.
>
> Include loading states, error handling and protection against stale API responses.
> Add frontend tests with Vitest and React Testing Library. Use Go testing and httptest for backend tests.
>
> Keep the architecture extensible without adding premature abstractions. Do not implement the remaining operations yet.
> Run all relevant tests, report results and limitations
>
> update AI_USAGE.md

### Decisions and outcome

- Ramiro requested a basic addition milestone, the named frontend responsibilities, a pure reducer, native fetch, a standard-library Go server, and tests in both layers.
- Used the approved `docs/SPEC.md` on disk for the `{operation,a,b}` contract. That file supersedes the operand-array contract and direct-percent details recorded in the prior log entry. Applied the spec's HTTP 422 rule for calculations without a finite result.
- Added the calculator and tests under `frontend/` and the API, arithmetic, and tests under `backend/`. Documented how to run both services, exercise the API, and reproduce coverage. The Vite dev server proxies requests to Go on loopback.
- Deferred other operations, contextual percentages, and the mode switch. Treated a trailing decimal point as an intermediate entry until followed by another digit.

### Checks run

- `npm.cmd run coverage` passed all 9 Vitest and React Testing Library tests. Calculator coverage was 93.16% of statements and 95.32% of lines. `npm.cmd run build` passed TypeScript checking and the Vite production build.
- `go vet ./...` and the Windows Go server build passed. Windows application control blocked the native `httptest` executable. The native arithmetic tests passed with 100% statement coverage.
- Ran the full Go suite with the same source and tests using `GOOS=js GOARCH=wasm` and Go's Node runner. Ran it with `go test -coverpkg=./... -coverprofile=coverage.out "-exec=node <path-to-.tooling/go-wasm-test.cjs>" ./...` using a workspace-local Node runner with a Windows directory compatibility adapter. Both packages passed. `go tool cover -func=coverage.out` reported 100% arithmetic, 95.8% for the HTTP handler package, and 90.9% overall including the server entry point, which was exercised by the browser smoke check.
- Ran a headless Chrome smoke check against Vite and the native Windows Go server. Verified keyboard and mouse addition, visible focus, repeated equals, touch entry at 320 CSS pixels without page overflow, and the formatted result `0.3` for `0.1 + 0.2`. A separate HTTP smoke check through the same proxy verified JSON responses with statuses 200, 400, 405, and 422.
- Verified the implementation left the assessment, approved spec, and project guidelines unchanged.

## 2026-11-24 — Native Windows backend recheck

Tool — Codex (ChatGPT). Purpose — verify the addition backend with the installed Windows Go toolchain.

### Prompt

> Verify the Go backend again. There was an issue with the Go environment during the previous test run, which should now be resolved.
> Run the native tests, check coverage, and verify that the API builds and runs correctly on Windows.
> Don't modify code unless necessary. Report the results and update AI_USAGE.md.

### Outcome and checks

- Used the installed Go 1.27.4 toolchain for `windows/amd64`. `go test -count=1 ./...` passed arithmetic but exited 1 because Windows Code Integrity blocked the plain HTTP test executable under its enterprise signing policy. The same block occurred with workspace-local and default Go temporary directories.
- `go test -count=1 -coverpkg=./... '-coverprofile=coverage.out' ./...` passed both packages natively with the default Go directories. `go tool cover '-func=coverage.out'` reported 100.0% for arithmetic, 95.8% for the HTTP package, and 90.9% overall. An interim WebAssembly coverage run had the same figures. The current `backend/coverage.out` is from the successful native run.
- `go vet ./...` and `go build -o '../.tooling/calculator-api-native.exe' .` passed. `go version -m '../.tooling/calculator-api-native.exe'` confirmed the Windows AMD64 build.
- Started that executable on loopback. Live checks verified HTTP 200 with `{"result":40}`, 400 for malformed JSON and a string operand, 422 for overflow, and 405 with `Allow: POST` for GET. Stopped the test process afterward.
- Compared SHA-256 hashes before and after the work. Backend source, tests, and module metadata were unchanged.

## 2026-11-24 — Standard subtraction

Tool — Codex (ChatGPT). Purpose — implement and verify subtraction in the existing calculator.

### Prompt

> Implement subtraction as the next standard calculator operation
>
> Review docs/SPEC.md, AGENTS.md and the current addition implementation before making changes
>
> Backend
>
> Extend POST /api/calculate to support the subtract operation using the existing request and response contracts
>
> Keep subtraction logic in the Go calculator service, separate from the HTTP handler
>
> Use float64 and make sure negative results and decimal operands work correctly
>
> Reuse the existing validation and error handling, dont introduce new dependencies or abstractions
>
> Frontend
>
> Add the subtraction operator to the existing keypad and connect it to the reducer and API client
>
> Reuse the current calculation flow and evaluate chained operations from left to right
>
> Support negative results and decimal inputs, including calculations like 5 - 10 and 10.5 - 2.3
>
> Selecting another operator before entering the second operand should replace the pending operator
>
> After getting a result, selecting subtraction should continue from that result. Entering a digit should start a new calculation
>
> Keep the existing loading, error recovery and Clear behavior
>
> Make sure stale API responses cannot update the calculator after Clear or a newer operation
>
> Testing
>
> Add Go unit tests for subtraction with positive numbers, negative results, negative operands, decimals and zero
>
> Extend the HTTP handler tests to verify subtraction requests and responses
>
> Add frontend tests for subtraction, chained calculations, operator replacement and continuing from a previous result
>
> Make sure all existing addition tests still pass
>
> Run native Go tests with coverage, frontend tests, TypeScript checks and production build
>
> Report the actual test results and coverage, including any failures
>
> Scope
>
> Implement subtraction only, dont add multiplication division or advanced operations yet
>
> Keep the changes focused and avoid unrelated refactoring
>
> Dont commit or push anything
>
> Update AI_USAGE.md with this exact prompt, the implementation summary and verification results

### Decisions and outcome

- Ramiro requested subtraction as the next operation using the existing API contract and left-to-right interaction rules. Multiplication, division, and advanced operations remain outside this milestone.
- Added float64 subtraction in `backend/internal/calculator` and routed `subtract` through `backend/internal/httpapi` with the shared input checks and error responses. Extended the arithmetic and HTTP tests.
- Added the minus button and keyboard shortcut, stored the pending operator alongside its left operand, and reused the same request and stale-response handling for both operations. Added frontend tests for mixed chains, replacement in both directions, full-precision continuation, recovery, and Clear. Updated the README with a subtraction example.
- No dependencies, commits, or pushes were added.

### Checks run

- On Go 1.27.4 for Windows AMD64, `go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...` passed both packages natively. `go tool cover -func=coverage.out` reported 91.9% statement coverage overall, 100.0% for arithmetic, and 96.3% for the HTTP package. `go vet ./...` and `go build -o ../.tooling/calculator-api-subtraction.exe .` passed.
- `npm.cmd run coverage` passed all 17 frontend tests, including the nine addition tests. Frontend calculator coverage was 93.44% of statements, 95.53% of lines, and 91.17% of branches. `npm.cmd run build` passed the TypeScript check and Vite production build.
- `node .tooling/browser-subtraction-smoke.mjs` passed against Vite and the compiled Windows Go API. Chrome verified `5 - 10 = -5` using touch at 320 CSS pixels, `10.5 - 2.3 = 8.2`, and `12 - 5 + 4 - 2 = 9`. The live API also returned the expected 422 for overflowing subtraction.

## 2026-11-24 — Multiplication approach review

Tool — Codex (ChatGPT). Purpose — review the next operation against the approved spec and existing calculation flow.

### Prompt

> For multiplication I want to reuse the existing calculator flow and Go API, supporting positive and negative numbers, decimals and zero
> It should work with chained operations evaluated left to right, so 10 + 5 \* 2 = 30
> The keypad and keyboard should both support multiplication, and the existing state behavior should remain unchanged
> Review the current implementation and SPEC.md, does this approach make sense or would you suggest anything different?
> Dont implement anything yet

### Outcome

- Reviewed the spec and the current Go arithmetic and HTTP dispatch, React reducer, request flow, keypad, and regression tests. The approach matches the spec, which already specifies `multiply`, the `*` shortcut, and the `30` result for the proposed chain.
- Recommended reusing the finite-result check and existing HTTP 422 overflow response, preserving the API result at full precision for chains, adding the `×` keypad button and pending-operation label, and leaving contextual percentages for their planned milestone.
- Suggested targeted tests for signed operands, decimals, zero, overflow, chained API requests, and operator replacement. This was a source review. Only this log was updated, and no tests were run.

## 2026-11-24 — Division approach review

Tool — Codex (ChatGPT). Purpose — review division against the approved spec and current calculator flow.

### Prompt

> The multiplication approach looks good, I agree with the suggested changes and test cases
>
> Now lets review division using the same architecture and API flow
>
> I want division by zero handled through a structured backend error, and the frontend should recover properly
>
> Decimal results should keep full precision internally even if the display formats them, especially for chained operations
>
> Use ÷ on the keypad and / for keyboard input, with left to right evaluation
>
> Check if this fits the current implementation and SPEC.md, suggest any missing edge cases or necessary changes
>
> Dont implement anything yet

### Decisions and outcome

- Ramiro approved the [multiplication approach and test cases](#2026-11-24--multiplication-approach-review). The current request is a division review only.
- Reviewed the division and precision rules in the approved spec, plus the current Go HTTP dispatch, API client, interaction state, display formatter, and tests. The existing operation flow can carry division and preserve the returned float64 value between requests.
- Found a spec conflict. The division-by-zero example says HTTP 400, while the adjacent status rule explicitly lists it under HTTP 422. Pending recommendation is to align the example with 422 and use `DIVISION_BY_ZERO` for either sign of zero. Keep malformed requests at 400 and overflowing quotients under `NON_FINITE_RESULT`.
- Recommended testing signed operands, a zero numerator, both signs of zero as divisors, a failed division followed by an editable retry, and a chain whose next request carries the unrounded quotient. Only this log was updated. No application tests were run.

## 2026-11-24 — Standard multiplication and division

Tool — Codex (ChatGPT). Purpose — implement and verify the remaining standard operations.

### Prompt

> Proceed with multiplication and division following the approaches we agreed on
> Use the existing architecture, API contracts and calculator state without unnecessary refactoring
> For division by zero use HTTP 422 with DIVISION_BY_ZERO, including negative zero. Keep HTTP 400 for invalid requests and NON_FINITE_RESULT for overflow
> Apply the proposed keypad and keyboard mappings, precision handling, error recovery and operator replacement behavior
> Update SPEC.md to resolve the division by zero status code inconsistency
> Implement the test cases discussed for both operations, including mixed calculations, precision, overflow and recovery after errors
> Run all backend and frontend tests with coverage, go vet, TypeScript checks and production builds. Also verify the behavior in the browser against the running Go API
> Update AI_USAGE.md with the implementation and actual verification results
> Dont commit or push yet, report any issues found

### Decisions and outcome

- Ramiro approved implementation of the [multiplication](#2026-11-24--multiplication-approach-review) and [division](#2026-11-24--division-approach-review) proposals. He confirmed HTTP 422 with `DIVISION_BY_ZERO` for both signs of zero, HTTP 400 for invalid requests, and `NON_FINITE_RESULT` for overflow.
- Added the two operations to the Go calculation service and existing HTTP dispatcher. Updated the division-by-zero example in `docs/SPEC.md` and documented the standard operations and errors in the README.
- Added `×` and `÷` to the keypad and pending-operation display, with `*` and `/` keyboard shortcuts. Both use the existing pending state, request recovery, and full-precision chaining. Added Go and frontend regression tests. No commits or pushes were made.

### Checks run

- `go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...` built the Windows test executables, which Windows Code Integrity blocked under its enterprise signing policy. The per-package native coverage retry passed arithmetic at 100.0% statement coverage and was blocked from starting the HTTP tests.
- Ran the same Go suite with Go 1.27.4 targeting `GOOS=js GOARCH=wasm` and the workspace-local Node runner. `go test -count=1 -coverpkg=./... -coverprofile=../.tooling/wasm-standard-coverage.out "-exec=node <path-to-.tooling/go-wasm-test-installed.cjs>" ./...` passed both packages. Statement coverage was 93.0% overall, 100.0% for arithmetic, and 96.6% for HTTP. The refreshed `backend/coverage.out` comes from this full run.
- `go vet ./...` and `go build -o ../.tooling/calculator-api-standard.exe .` passed. Windows Code Integrity blocked direct launch of the output file. `go run .` started the Windows Go API on loopback.
- `npm.cmd run coverage` passed all 25 frontend tests. Calculator coverage was 94.40% of statements, 96.52% of lines, and 91.04% of branches. `npm.cmd run build` passed the TypeScript check and Vite production build.
- `node .tooling/browser-standard-smoke.mjs` passed in headless Chrome with Vite proxying to the running Go API. It verified keyboard input, touch input at 320 CSS pixels, `10 + 5 × 2 = 30`, operator replacement, and correction of `8 ÷ 0` to `8 ÷ 2 = 4`. It captured the full quotient in the multiplication request for `1 ÷ 3 × 3` and checked the displayed rounded quotient. Live HTTP checks verified both zero signs return `DIVISION_BY_ZERO`, invalid requests return 400, and overflow in both operations returns `NON_FINITE_RESULT`.

## 2026-11-24 — Standard-operation test strategy review

Tool — Codex (ChatGPT). Purpose — assess the current tests and backend CI before starting advanced operations.

### Prompt

> Now that the four standard operations are implemented I want to review and consolidate our testing strategy before moving forward
>
> Review ASSESSMENT.md, SPEC.md, AGENTS.md and the current frontend and backend tests
>
> Check that we're properly covering arithmetic, HTTP contracts, calculator state, async behavior, error recovery, precision and mixed operations
>
> Identify weak assertions, missing edge cases, tests that depend too much on implementation details and anything that could become difficult to maintain
>
> I also want GitHub Actions on Ubuntu to be our main backend CI verification, with tests, coverage, go vet and build. Check what we currently have and what needs to be configured
> Suggest a small set of improvements, prioritizing correctness and reproducibility without overengineering
>
> For now dont implement anything, first give me your assessment and the changes you recommend so we can agree on them

### Decisions from Ramiro

- Use GitHub Actions on Ubuntu as the primary backend verification. Include tests, coverage, vet, and a build.
- Review the strategy and agree on improvements before implementing them.

### Outcome and checks

- Reviewed the assessment, specification, project guidelines, Go arithmetic and HTTP tests, React behavior tests, API client, and test configuration in the new repository. The existing layers cover the standard operations, including full-precision chaining, stale responses, and error recovery.
- Verified through Git that GitHub main matched the local initial commit `c55e64c`. That tree contains no GitHub Actions workflow or checked-in browser smoke script. Tests were not rerun during this review.
- Pending recommendations are one Ubuntu backend workflow, an HTTP error-schema assertion independent of the production type, less brittle keyboard focus coverage, one non-JSON response recovery case, and a short reproducible real-stack smoke check. Flagged unary operand validation, percentage edge cases, and mode switching during a pending request for the advanced milestone.
- Only this log was updated. Implementation and test changes await agreement.

## 2026-11-24 — Ubuntu backend CI baseline

Tool — Codex (ChatGPT). Purpose — establish the first repeatable backend CI run for the four standard operations.

### Prompt

> I agree with the testing review, lets start by establishing the backend CI baseline
> Implement the minimal GitHub Actions workflow on Ubuntu using the Go version from backend/go.mod
> Run the complete backend test suite with coverage, print the coverage summary, run go vet and build the API

### Follow-up

> Yes, push a CI branch and open a draft PR

### Decisions and outcome

- Ramiro approved the Ubuntu CI baseline from the standard-operation test strategy review and authorized publication on a CI branch with a draft pull request.
- Added one backend workflow triggered by pull requests and pushes to `main`. It runs from `backend/`, reads the Go version from `backend/go.mod`, and keeps read-only repository permissions.
- Pushed commit `5b7be58` to `ci/backend-baseline` and opened [draft PR #1](https://github.com/Ralet11/fullstack-calculator/pull/1). The workflow commit contains only `.github/workflows/backend.yml`. The review and CI notes in this log are local.

### Checks run

- On GitHub-hosted Ubuntu with Go 1.25.0 for Linux AMD64, `go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...` passed both backend test packages. `go tool cover -func=coverage.out` printed 93.0% overall statement coverage. `go vet ./...` and `go build -o calculator-api .` also passed. [GitHub Actions run](https://github.com/Ralet11/fullstack-calculator/actions/runs/45533516701)
- Repeated the tests, coverage summary, vet, and build locally with Go 1.25.0 for Windows AMD64. All passed, with 93.0% overall statement coverage. The local build output was placed in the ignored `.tooling` directory.

## 2026-11-24 — Finalize backend CI baseline

Tool — Codex (ChatGPT). Purpose — review and merge the backend CI workflow and verify it on main.

### Prompt

> The first GitHub Actions run passed successfully, I want to finalize the backend CI baseline
>
> Review PR #1 and confirm that the workflow is minimal and correctly configured
>
> If everything looks good, mark the PR ready for review and merge it into main

### Decisions and outcome

- Ramiro authorized marking PR #1 ready and merging it into `main` after a successful review.
- Reviewed the single workflow change and its passing PR run. The workflow uses one Ubuntu job, the version from `backend/go.mod`, read-only repository permissions, and separate test with coverage, vet, and build steps.
- Marked [PR #1](https://github.com/Ralet11/fullstack-calculator/pull/1) ready and squash-merged the verified head into `main` as `d75bf6b`. Fast-forwarded local `main` to the same commit and verified the existing log edits survived. This entry remains local.

### Checks run

- Verified the reviewed changes with `git diff --check c55e64c..5b7be58` and confirmed that the PR contained only `.github/workflows/backend.yml`. The [PR run](https://github.com/Ralet11/fullstack-calculator/actions/runs/45533516701) passed all backend checks on the reviewed commit.
- Verified the post-merge [main run](https://github.com/Ralet11/fullstack-calculator/actions/runs/45534250938) for `d75bf6b`. Go 1.25.0 on Linux AMD64 ran the full suite with 93.0% statement coverage. Vet and the API build passed.

## 2026-11-24 — Standard-operation test improvements

Tool — Codex (ChatGPT). Purpose — close three test gaps identified in the standard-operation review.

### Prompt

> Now that the backend CI is verified on main I want to address the remaining testing improvments
>
> Strengthen the HTTP error contract tests by checking the public JSON fields independently from the production response types
>
> Improve the keyboard accesibility test so it doesnt depend on a fixed number of Tab presses
>
> Add a frontend recovery test for a non JSON HTTP error response, like an HTML 502
>
> Keep the existing architecture and application behavior unchanged, avoid unnecesary tests or refactoring
>
> Run the relevant frontend and backend checks, verify coverage and report the actual results

### Decisions and outcome

- Ramiro approved the three focused test improvements. The implementation affects only the backend HTTP tests, frontend behavior tests, and this log.
- The Go error assertion checks the public `error`, `code`, and `message` JSON keys without using the handler's response type.
- The keyboard test stops when it reaches the target button or focus repeats. It verifies Enter activation. The new HTML 502 case verifies the visible error, preserved operands, and successful retry.

### Checks run

- On Windows with Go 1.25.0, `go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...` passed both test packages. `go tool cover -func=coverage.out` reported 93.0% overall statements, 100.0% for arithmetic, and 96.6% for the HTTP package. `go vet ./...` and `go build -o ../.tooling/calculator-api.exe .` passed.
- `npm.cmd ci --no-audit --no-fund` installed the locked dependencies. `npm.cmd run coverage` passed all 26 tests with 95.20% statement, 91.04% branch, and 97.39% line coverage. `npm.cmd run build` passed TypeScript checking and the Vite production build.
- `git diff --check` passed. These changes were verified locally. No commit or push was made.

## 2026-11-24 — Real-browser smoke test

Tool — Codex (ChatGPT). Purpose — make the standard calculator’s browser verification reproducible from a fresh checkout.

### Prompt

> The testing improvements look good, lets complete the standard calculator verification with a reproducible browser smoke test
> I want a small portable test that runs against the real React frontend and Go backend, not mocked API responses
> Cover the precision chain 1 / 3 \* 3 = 1 and recovery from 8 / 0 by correcting the divisor to 2
> Keep it simple and make sure someone cloning the repo can run it using documented commands, avoid unnecesary dependencies or a large E2E framework
> Run the test and report what was actually verified, also check the existing tests still pass

### Decisions and outcome

- Ramiro approved adding a small real-stack browser check for precision and error recovery after the focused standard-operation test improvements.
- Added a standalone Node script and one pinned Playwright Core development dependency. Documented how to start Go and Vite and install the headless Chromium shell. The script uses accessible keypad controls and observes real HTTP traffic.
- Verified the rounded quotient display, the full quotient sent in the multiplication request, and the final result of `1`. Verified the real `422 DIVISION_BY_ZERO` response and visible error for `8 ÷ 0`, then edited the divisor, verified the Go response and display of `4`, and checked that the alert cleared.

### Checks run

- On Windows, started Go 1.25.0 with `go run .` and Vite with `npm.cmd run dev -- --strictPort`. `npx.cmd playwright-core install --only-shell chromium` and `npm.cmd run test:smoke` succeeded. Both scenarios passed in Chromium headless shell.
- `go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...`, `go tool cover -func=coverage.out`, and `go vet ./...` passed. Backend statement coverage was 93.0%.
- `npm.cmd run coverage` passed all 26 existing frontend tests with 97.39% line and 95.20% statement coverage. `npm.cmd run build` passed TypeScript checking and the Vite production build.
- `node --check frontend/scripts/browser-smoke.mjs` and `git diff --check` passed. No commit or push was made.

## 2026-11-25 — Power operation review

Tool — Codex (ChatGPT). Purpose — review power semantics, API behavior, and focused test cases before implementation.

### Prompt

> I want to start working on the power operation
>
> My idea is to extend the current calculation flow using the first operand as the base and the second as the exponent, keeping left to right evaluation and the existing API contract
>
> Before implementing I want to review the numerical edge cases, specially 0^0, negative bases with fractional exponents, zero with negative exponents and overflow
>
> Check SPEC.md and the current architecture, tell me if this approach makes sense and if theres anything we should handle differently
>
> Also review what tests we actually need without duplicating existing coverage
>
> Focus on the decisions that need my approval, dont suggest changes just for the sake of refactoring

### Outcome and checks

- Reviewed `docs/SPEC.md`, the project guidelines, Go arithmetic and HTTP validation, and the React binary-operation flow plus existing tests. Checked the standard library's documented `math.Pow` behavior.
- Confirmed power fits the existing binary request and left-to-right sequencing. The spec defines `0^0 = 1`, rejects negative bases with non-integer exponents and zero bases with negative exponents, and uses HTTP 422 for invalid real powers or overflow.
- Pending recommendations are `INVALID_POWER` for those two domain failures, the existing `NON_FINITE_RESULT` for overflow, omission of the contextual percentage field on power, and a minimal Advanced-mode toggle with a power button and caret shortcut if the UI ships in the same slice. Preserve the pending calculation when switching modes.
- Recommended a focused arithmetic table, a few HTTP contract cases, and one mixed-operation UI chain. Cover mode switching once if introduced with power. No application or test code was changed, and no suites were rerun during this review.

## 2026-11-25 — Advanced power operation

Tool — Codex (ChatGPT). Purpose — implement and verify power using the existing calculator flow.

### Prompt

> I agree with both recommendations, lets proceed with the power operation
> Use INVALID_POWER with HTTP 422 for domain errors and keep NON_FINITE_RESULT for overflow, with specific error messages for each case
> Add the minimal Standard and Advanced mode toggle, power should only be available in Advanced mode with an xʸ button and ^ keyboard shortcut
> Switching modes should preserve the current calculator state, including pending operations and results
> Reuse the existing API, reducer and request flow. Keep left to right evaluation and follow the numerical rules defined in SPEC.md
> Add the relevant Go, HTTP and React tests we discussed, including numerical edge cases, mixed chains and switching modes
> Run the existing checks, coverage and browser smoke test to make sure nothing breaks. Report the actual results
> Keep the changes focused, no square root or percentage yet and avoid unnecesary refactoring

### Decisions and outcome

- Ramiro approved both recommendations from the [power operation review](#2026-11-25--power-operation-review). Power uses `a` as the base and `b` as the exponent. Domain errors return HTTP 422 with `INVALID_POWER` and a case-specific message. Overflow retains `NON_FINITE_RESULT`. A power request omits the contextual percentage field.
- Added the Go power function and HTTP dispatch. The React mode toggle controls the power button and shortcut independently of the pending calculation and request state. Existing calculations run left to right, and switching modes preserves operands, pending operations, in-flight requests, and results.
- Added focused Go and HTTP power tests plus two React tests for the mixed chain and mode switching. Documented the keyboard and API rules in the spec and README.

### Checks run

- On Windows with Go 1.25.0, `go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...`, `go tool cover -func=coverage.out`, `go vet ./...`, and `go build -o ../.tooling/calculator-api-power.exe .` passed. Overall Go statement coverage was 93.0%, and the `Power` function had 100.0% statement coverage.
- `npm.cmd run coverage` passed all 28 frontend tests with 97.47% line, 95.34% statement, and 91.36% branch coverage. `npm.cmd run build` passed TypeScript checking and the Vite production build.
- Windows Code Integrity blocked the temporary executable from `go run .`. Started the standalone build directly and ran `npm.cmd run test:smoke` against it and Vite. Both existing smoke scenarios passed. An additional live Chromium check verified that a pending power survived a switch to Standard, returned `8` for `2^3`, and showed the API's `INVALID_POWER` message for `(-2)^0.5`.
- `git -c core.whitespace=cr-at-eol diff --check` passed with the specification's existing Windows line endings. No commit or push was made.

## 2026-11-25 — Square root operation review

Tool — Codex (ChatGPT). Purpose — review the unary square root contract, calculator state, and regression cases before implementation.

### Prompt

> Review the implementation of square root as the next advanced operation
>
> Check SPEC.md and the current architecture before making changes
>
> Use the existing POST /api/calculate endpoint with operation sqrt and a single operand
>
> Review how unary operations should interact with the current reducer, pending calculations and mode switching
>
> Consider negative inputs, zero, decimal values, error handling and numeric precision
>
> Identify any missing edge cases, necessary changes and relevant frontend and backend tests
>
> Keep the existing architecture, avoid unnecesary refactoring
>
> Report your recommendations before implementation

### Outcome and checks

- Reviewed the specification, Go calculator and HTTP handler, React reducer and request flow, and existing power and precision tests. Checked the standard library's documented `math.Sqrt` behavior.
- Confirmed the approved unary request shape `{"operation":"sqrt","a":81}`. Recommend rejecting a supplied `b` (including null) or `percentage` as HTTP 400, and returning HTTP 422 with `INVALID_SQRT` for negative operands. Accept either sign of zero and display `0`. Keep decimal results at full float64 precision until display formatting.
- Pending interaction recommendation is to apply square root immediately to the input or result, or to the entered right operand while retaining a pending binary operation. If the right operand is empty, leave the pending calculation alone. Preserve state and request identity when switching modes. Use an Advanced-only square-root button with accessible keyboard activation.
- Recommended focused Go numerical cases, HTTP arity and domain cases, and React checks for unary payloads, full-precision chaining and negative-input recovery. No application changes were made and no suites were rerun. Only this log was updated.

## 2026-11-25 — Advanced square root operation

Tool — Codex (ChatGPT). Purpose — implement and verify square root as an immediate unary operation.

### Prompt

> Proceed with the square root implementation following the reviewed approach
>
> Apply sqrt to the active operand, preserving any pending binary operation. If theres no right operand yet, dont execute a request
>
> Use INVALID_SQRT with HTTP 422 for negative inputs, keep the value editable after an error
>
> Follow the existing API contract, b must be omitted and contextual percentage should be rejected
>
> Keep sqrt available only in Advanced mode, preserve calculator state when switching modes
>
> Reuse the current reducer and request handling, avoid unnecesary refactoring
>
> Implement the agreed Go, HTTP and React tests, including pending operations, precision, error recovery and mode switching
>
> Run all relevant tests, coverage checks, builds and the browser smoke test. Report the actual results

### Decisions and outcome

- Ramiro approved the [square root approach](#2026-11-25--square-root-operation-review). Apply it immediately to the active operand. Preserve pending operations and skip the request when a right operand is missing. Use an Advanced-only control and preserve calculator state across modes.
- The existing endpoint accepts `{"operation":"sqrt","a":81}` and rejects a supplied `b` or `percentage` field. Negative inputs return HTTP 422 with `INVALID_SQRT` and leave the operand editable.
- Added Go arithmetic and HTTP tests, and React tests covering standalone values, the precise right operand after a mode switch, and recovery. Reused the request lifecycle and held the computed operand at full precision for subsequent calculations. Updated the agreed behavior in the spec and README.

### Checks run

- On Windows with Go 1.25.0, `go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...`, `go tool cover -func=coverage.out`, `go vet ./...`, and `go build -o ../.tooling/calculator-api-sqrt.exe .` passed. Overall Go statement coverage was 94.1%, and `Sqrt` had 100.0% statement coverage.
- `npm.cmd run coverage` passed all 31 frontend tests with 98.36% line, 96.21% statement, and 93.28% branch coverage. `npm.cmd run build` passed TypeScript checking and the Vite build.
- Started the compiled Go API and Vite. `npm.cmd run test:smoke` passed both existing browser scenarios. A separate real-browser check verified no request for an empty right operand, preserved addition across a mode switch, sent the full `sqrt(2)` value to Go, and recovered from `INVALID_SQRT` by correcting `-9` to `9`.
- `git -c core.whitespace=cr-at-eol diff --check` passed. No commit or push was made.

## 2026-11-25 — Percentage operation review

Tool — Codex (ChatGPT). Purpose — review direct and contextual percentage behavior, state, API, and focused tests before implementation.

### Prompt

> Review percentage as the next advanced calculator operation
>
> Check SPEC.md and the current implementation before making changes
>
> We need to support both direct and contextual percentages, following the behavior already defined in the spec
>
> Review how percentages should work with addition, subtraction, multiplication and division, including chained calculations
>
> Check how percentage should interact with the current reducer, pending operations, numeric precision and mode switching
>
> Identify any missing edge cases, API contract details and relevant tests
>
> Keep the existing architecture and avoid unnecesary refactoring
>
> Report the decisions that need my approval before implementation

### Outcome and checks

- Read the approved spec, Go dispatch and validation, React pending state and request flow, and relevant tests. Direct percentage fits as a binary operation with the base in `a` and rate in `b`. Contextual percentage fits as a flag on the pending standard operation.
- Pending recommendations are two Advanced controls, a base-first direct percentage, and a contextual marker that toggles on repeated press, stays with an edited operand or through mode switches, clears when that operand is erased, and is consumed by a successful calculation. Square root would transform the operand before the marker is applied.
- Recommend supporting signed, fractional, and greater-than-100 rates. The context modifier should be allowed only for the four standard operations as a boolean. Either sign of zero as the actual contextual divisor should retain `DIVISION_BY_ZERO`. Recommend avoiding preventable intermediate overflow and avoiding zero-divisor classification for a nonzero rate that rounds to zero when scaled.
- Checked the four spec examples, the `150 + 20% × 10% = 18` chain, a preventable overflow, and a tiny nonzero rate using Node arithmetic. Recommended representative Go, HTTP, and React cases. No application code, spec, or tests were changed, and no test suites were run.

## 2026-11-25 — Direct and contextual percentages

Tool — Codex (ChatGPT). Purpose — implement and verify the approved percentage behavior.

### Prompt

> Proceed with the percentage implementation following the reviewed approach
>
> I approve the two Advanced mode controls, direct percentage using percentage as the operation and contextual percentage using the boolean modifier
>
> Keep the agreed operand order, marker behavior and left to right evaluation
>
> Support signed and fractional percentages, values above 100 and preserve full numeric precision for chained operations
>
> Handle overflow, underflow and division by zero correctly, avoid intermediate calculations producing incorrect results when the final result is valid
>
> Keep the existing API contracts and reject invalid percentage modifiers with HTTP 400
>
> Reuse the current reducer and request flow, avoid unnecesary changes to the architecture
>
> Implement the discussed Go, HTTP and React tests, including direct percentages, contextual chains, marker behavior and mode switching
>
> Run all relevant tests, coverage checks, builds and the browser smoke test. Report the actual results and any limitations

### Decisions and outcome

- Ramiro approved both controls from the [percentage operation review](#2026-11-25--percentage-operation-review). Direct percentage takes the base first and the rate second. Contextual percentage uses a boolean on the four standard operations only.
- Added the two Advanced controls and kept the marker on the pending operation. It survives edits, square root, failure, and mode switches, and is removed when the operand is erased, the pending operation succeeds, or Clear is pressed. Calculation chaining and full returned precision use the existing workflow.
- Percentage operations use Go's standard library rational arithmetic for exact intermediates of the received float64 operands, then round to float64 once. This avoids preventable intermediate overflow and underflow, while a final underflow can still round to zero. Both signs of zero as a contextual divisor return `DIVISION_BY_ZERO`. A non-finite final result returns `NON_FINITE_RESULT`.
- Updated the API validation, focused Go and React tests, specification, and README. The first TypeScript build exposed an action-union narrowing error. Moved the percentage toggle into the shared entry-action variants and reran the frontend checks.

### Checks run

- On Windows with Go 1.25.0, `go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...`, `go tool cover -func=coverage.out`, `go vet ./...`, and `go build -o ../.tooling/calculator-api-percentage.exe .` passed. Go coverage was 93.3% overall and 97.6% for the HTTP package.
- `npm.cmd run coverage` passed all 35 frontend tests, with 98.47% line, 96.50% statement, and 94.15% branch coverage. `npm.cmd run build` passed TypeScript checking and the Vite production build after the type fix.
- Started the compiled Go API and Vite and ran `npm.cmd run test:smoke`. Both checked-in scenarios passed. A separate Chromium spot check against the real API verified base-first direct percentage, the contextual chain across modes, an unrounded percentage quotient in the next request, and correction of a zero rate. The spot check used a 320 CSS pixel viewport.
- `git -c core.whitespace=cr-at-eol diff --check` passed. No commit or push was made.

## 2026-11-25 — Complete calculator submission review

Tool — Codex (ChatGPT). Purpose — review the working calculator against the assessment and approved specification before submission.

### Prompt

> Review the complete calculator implementation against ASSESSMENT.md and SPEC.md
>
> Check that all required and advanced operations behave correctly, including validation, numeric edge cases, precision, error recovery and mode switching
>
> Review the frontend and backend architecture for correctness, maintainability and unnecessary complexity
>
> Evaluate the existing tests and identify any important coverage gaps, avoid adding tests just to increase coverage numbers
>
> Check the API contracts, keyboard interactions, responsive layout, accessibility and browser behavior
>
> Review README.md and AI_USAGE.md for completeness and technical consistency
>
> Identify any issues that should be fixed before submission, prioritize them by severity and explain the impact
>
> Dont implement changes yet, I want to review your findings first
>
> Update AI_USAGE.md with the review and dont commit or push

### Findings and recommendations

- Reviewed the working tree at `700ddc0` plus local percentage changes. All seven operations and both percentage flows are present. Found no blocker in ordinary calculations, domain validation, precision or error recovery. The separation between the pure reducer, request hook, HTTP client, Go handler, and arithmetic is appropriate. Percentage arithmetic uses standard-library rational intermediates for the documented numeric boundary cases.
- Submission prerequisite — Percentage changes are local, and `backend/internal/calculator/percentage.go` was untracked. Include the complete implementation and log in the submission so the published tree builds, and verify Ubuntu CI on the final revision.
- Medium — The keypad renders subtraction, multiplication, and division before the digit rows in DOM order. In Chromium, Tab proceeded through these operators and then jumped back up to 7. Match source order to the visible rows and verify a representative keyboard path without counting Tab presses.
- Low — Go accepts duplicate keys with the last value winning. A request with `"percentage":"true","percentage":false` returned 200 with result 5, masking the earlier invalid value. Decide whether to reject duplicates or document the current behavior. The success test helper also accepts `{"result":null}` for expected zero because it decodes into `map[string]float64`. Assert an actual JSON number. Add one advanced scenario to the checked-in real-stack smoke test, such as contextual division-by-zero correction across a mode switch. Retain mocked deferred requests for race and network-failure tests.
- The README covers setup, proxying, API requests, tests, coverage, and design. Clarify binary versus unary operands, add the PowerShell-safe coverage command, and link the prompt log for the evaluator. Earlier log wording about an operand array is historical and differs from the current named `a` and `b` fields. Preserve historical prompts and annotate the distinction. The log records staged decisions and checks. Completeness outside the available conversation cannot be verified. Include any separately recorded assessment prompts or identify gaps at submission.

### Checks run

- Native Windows Go 1.27.4 passed `go test -count=1 -coverpkg=./... '-coverprofile=coverage.out' ./...`, `go tool cover '-func=coverage.out'`, `go vet ./...`, and `go build -o ../.tooling/calculator-api-review.exe .`. Coverage was 93.3% overall, 90.9% for the calculator package, and 97.6% for HTTP. PowerShell split the unquoted filename arguments on the first attempts, so both coverage commands were rerun with quotes. Windows application control blocked direct launch of the built file. `go run .` started the current API.
- `npm.cmd run coverage` passed 35 tests, with 96.50% statement, 94.15% branch, and 98.47% line coverage for calculator code. `npm.cmd run build` passed TypeScript and the production build. Both coverage files were present.
- With the API and `npm.cmd run dev -- --host 127.0.0.1 --strictPort` running, `npm.cmd run test:smoke` passed both standard scenarios. An additional transient Chromium probe at 320 CSS pixels verified touch, visible focus, the Tab order issue, no page-level horizontal overflow, decimal formatting, power and square root in a mixed chain across mode switches, direct percentage, and contextual division-by-zero recovery. It also verified the maximum finite result displays in scientific notation and is sent at full precision into the next calculation. Live HTTP probes verified subnormal arithmetic, `0^0`, negative square root, a null modifier, and a contextual negative-zero divisor.
- Browser checks used headless Chromium with touch emulation. No physical device, screen reader, or other browser engine was checked. Ubuntu CI configuration was reviewed locally. No hosted run was triggered for the local percentage working tree.
- Only this log was edited during the review. No commits or pushes were made.

## 2026-11-25 — Submission review fixes

Tool — Codex (ChatGPT). Purpose — address the approved keypad, API contract, browser verification, and documentation findings.

### Prompt

> Address the issues identified in the final review
>
> Fix the keypad DOM order so Tab navigation follows the visual layout
>
> Reject duplicate JSON fields with HTTP 400 and improve the HTTP success assertions to verify result is a valid JSON number
>
> Extend the browser smoke test with a contextual percentage scenario covering mode switching and recovery after division by 0%
>
> Update README.md with the correct API requirements, testing instructions and AI_USAGE.md reference
>
> Keep the existing architecture and behavior unchanged, avoid unnecesary refactoring
>
> Run all relevant tests, coverage checks, builds and browser smoke tests

### Decisions and outcome

- Rendered the keypad in visual row order and removed the CSS rules that moved buttons across rows. Extended the React keyboard regression to assert the transition from Add to the next two rows and activate a focused digit.
- The Go handler now reads object members in order, rejecting duplicate decoded keys as HTTP 400 with `INVALID_REQUEST`. The HTTP tests cover duplicate operations, escaped aliases, and modifiers that previously hid an invalid value. Success tests assert that `result` is a JSON number, including for zero.
- Extended the real-stack smoke test to mark `150 ÷ 0%` in Advanced mode, confirm the HTTP 422 error in Standard mode, then switch back to Advanced and correct the rate to 20%. The test checks that both requests carry the modifier and that the final result is 750 with the marker removed.
- The README distinguishes unary and binary operands, documents the modifier and duplicates, gives PowerShell-safe coverage commands, describes all three smoke scenarios, and links this log. The earlier operand-array reference in the [calculator behavior and API specification entry](#2026-11-24--calculator-behavior-and-api-specification) is historical. The implemented API uses named `a` and `b` fields.

### Checks run

- On Windows, `go test -count=1 -coverpkg=./... '-coverprofile=coverage.out' ./...` passed the arithmetic package but Windows application control blocked `httpapi.test.exe` on both Go 1.27.4 and Go 1.25.0. `go vet ./...` and `go build -o ../.tooling/calculator-api-review-fixes-go125.exe .` passed with Go 1.25.0. Vet and a native build also passed with Go 1.27.4. `go run .` started the API for browser verification.
- The complete Go suite passed under Node using `GOOS=js GOARCH=wasm`. For coverage, the stock WebAssembly runner hit the Node/Windows `O_DIRECTORY` limitation. Using Go 1.25.0's installed runner plus a local Node preload in ignored `.tooling`, ran `go test -count=1 -coverpkg=./... '-coverprofile=../.tooling/review-fixes-wasm/coverage.out' "-exec=node --require $fixWasmDir/windows-directory.cjs $fixWasmDir/wasm_exec_node.js" ./...`, where `$fixWasmDir` is the absolute path to that tooling directory. `go tool cover '-func=../.tooling/review-fixes-wasm/coverage.out'` reported 92.8% overall, 90.9% for arithmetic, and 96.1% for HTTP. The Windows application policy and Go installation were untouched.
- `npm.cmd run coverage` passed all 35 React tests with 96.50% statement, 94.08% branch, and 98.46% line coverage. The initial TypeScript run caught unsupported Testing Library locator options. After removing them, `npm.cmd run build` passed TypeScript and Vite, and `node --check scripts/browser-smoke.mjs` passed.
- With Vite started using `npm.cmd run dev -- --host 127.0.0.1 --strictPort`, `npm.cmd run test:smoke` passed all three Chromium scenarios against the running Go API. A separate Chromium probe checked every visual keypad position against the actual Tab order in both modes at 320 and 1024 CSS pixels. A live request with duplicate percentage fields returned 400 and `INVALID_REQUEST`.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes were made, and no hosted CI run was triggered.

## 2026-11-25 — Calculator UX and UI design review

Tool — Codex (ChatGPT). Purpose — assess the display, advanced controls, local history, responsive behavior, accessibility, and the tests needed before implementation.

### Prompt

> Review the calculator UX/UI and evaluate the following improvements before implementation
>
> Display
>
> Long numbers and scientific notation are currently getting clipped. The display should handle large values without breaking the layout
>
> I want the full result to remain accessible, with a readable formatted value and an option to inspect or copy the exact result
>
> Review responsive font sizing, overflow handling and how scientific notation is displayed
>
> Keep numeric formatting separate from calculation logic, dont modify the internal precision
>
> Controls
>
> Improve the visual hierarchy between numeric keys, basic operators and advanced operations
>
> Keep the keypad consistent across both modes and make sure changing modes doesnt cause unnecessary layout shifts
>
> Advanced operations should have clear labels and descriptions, specially power, square root, direct percentage and contextual percentage
>
> Add contextual help using tooltips on desktop, but also consider keyboard focus and touch devices
>
> Use accessible names and descriptions, dont rely only on hover or mathematical symbols
>
> Calculation history
>
> I want a small recent calculations history showing the operation, operands and result
>
> Review whether to store only completed calculations, how to represent chained operations and how errors should be handled
>
> Consider keeping the last 10 calculations locally, without adding a backend endpoint or external state library
>
> Evaluate whether users should be able to reuse a previous result and clear the history separately from the calculator
>
> Keep history separate from the active calculator state so it doesnt complicate the reducer
>
> Responsive and accessibility
>
> Review the layout at 320px, 375px, tablet and desktop widths
>
> Avoid horizontal overflow, clipped controls and unnecessarily tall layouts in Advanced mode
>
> Check keyboard navigation, visible focus, semantic buttons and screen reader announcements for results and errors
>
> Testing
>
> Identify the relevant component and browser tests for these improvements
>
> Focus on observable behavior instead of implementation details
>
> Keep the current React and Go architecture unchanged unless theres a clear technical reason
>
> Review SPEC.md and the existing components, identify conflicts or missing decisions and recommend the simplest maintainable approach
>
> Dont implement anything yet, I want to review the design decisions first

### Findings and recommendations

- The display font scales with the viewport while the card width is capped. One-line text starts at the leading end of its scroll range and can obscure trailing digits or the exponent. Size the font against the display width. Keep up to 12 significant digits in the primary view and let long input reveal the newest digits without preventing inspection of the beginning. Give completed results an explicit Full result disclosure with selectable round-trip numeric text and a Copy result action with manual selection as fallback. Use the stored number and keep formatting in the presentation layer.
- Anchor the card from the top and keep the Standard keys in the same grid in both modes. Use a compact, labeled Advanced group below the shared keys, with wrapping labels and enough row height for touch. Keep Equals the strongest action. Use specific labels and one set of descriptions shared by the desktop hover/focus help and a tap-friendly help disclosure. Tooltips should keep focus on the trigger, be dismissible and remain available while hovered. Escape closes open help before acting as calculator Clear. Scope the section's pointer-focus behavior and shortcuts so future help, copy, or history controls can be operated without focus being pulled back to the calculator display.
- Recommend 10 newest accepted successful API evaluations in memory, in a collapsible Recent calculations section. Record each evaluated step, including successful square roots and contextual markers, using the submitted operands and returned result. Skip failed, canceled, and stale requests and repeated equals with no request. Clear history should affect only the list. Keep it separate from calculator Clear. Reuse can wait. If approved, it should load the full stored value as a fresh result, be unavailable during a pending request, and create no new history row.
- The spec explicitly puts persistent history out of scope. Approve a scope update even for session-only recent history before implementing it, since the feature adds a new interaction and Clear semantics. Decide separately whether the list should survive reloads via browser storage. Recommend session-only first. Keep the API, arithmetic, precision, and active reducer state independent of history.
- The labeled output currently exposes status semantics while its text also changes during typing. Prefer one polite announcement on accepted results, a concise loading status, and the existing error alert. Verify speech behavior with a screen reader after implementation. Component tests should check full-result inspection and copy/fallback, help and keyboard behavior, accepted steps and skipped stale/errors, the history cap, and separate clear actions. Browser tests should cover overflow, common-key position across mode changes, visible focus, touch help and a real mixed calculation. Preserve existing arithmetic and smoke tests.

### Checks run

- Reviewed `docs/ASSESSMENT.md`, `docs/SPEC.md`, `AGENTS.md`, the layout and keypad styles, display, global keyboard handler, request flow, and existing tests. Checked that the current tree was clean at the start.
- Starting fresh copies with `go run .` and `npm.cmd run dev -- --host 127.0.0.1 --strictPort` reported ports already bound. Used the existing loopback services. Ran a transient Playwright probe via `node --input-type=module` against the existing Vite frontend and real Go API.
- At widths 320, 375, 768 and 1440 CSS pixels, verified no page-level horizontal overflow, visible focus and the sampled row-by-row Tab order. The result `-4.18900257888e+305` needed 15 extra horizontal pixels at 320 and 100 extra at 768 and 1440. It fit at 375. A 50-digit input overflowed the display at all four widths and initially scrolled to its beginning. The Percent of value label exceeded its button box at 320. Switching to Advanced moved the Clear key up by 52 to 62 pixels at a 900-pixel viewport height.
- Headless Chromium touch emulation verified that touchscreen entry exposed the real division-by-zero message as an alert. A physical device and actual screen-reader speech were not tested. Consulted the W3C hover/focus and disclosure guidance.
- No implementation, spec edits, commits, or pushes. The review only updated this log.

## 2026-11-25 — Display and Advanced controls implementation

Tool — Codex (ChatGPT). Purpose — implement the approved display, responsive layout, and Advanced control improvements from the [UX review](#2026-11-25--calculator-ux-and-ui-design-review).

### Prompt

> Proceed with the display and controls improvements following the reviewed approach
> Fix long number clipping by sizing the text based on the display container, not the viewport. Keep recent digits visible when entering long numbers
> Keep the current 12 significant digits formatting, preserve full numeric precision internally and add Full result and Copy result controls
> Anchor the calculator from the top so switching between Standard and Advanced doesnt shift the common keypad
> Improve the visual hierarchy between numbers, operators and Equals. Keep the advanced controls grouped below the main keypad
> Add clear descriptions and examples for advanced operations, with tooltips for mouse and keyboard and an Advanced help section for touch devices
> Make sure Escape closes help before clearing the calculator, keep keyboard focus and screen reader behavior correct
> Test the layout at 320, 375, 768 and 1440px, including scientific notation, long inputs and mode switching
> Keep the existing calculation logic and API unchanged, avoid unnecesary refactoring
> Run frontend tests, builds and browser checks, report the results

### Decisions and outcome

- Sized the result text relative to the display container and positioned long entry scrolling at the newest digits after edits. Continued to format the main result to at most 12 significant digits. Full result exposes the stored numeric value as selectable round-trip text, and Copy result reports success or provides a manual fallback.
- Top-aligned the card, distinguished operators and Equals from numeric keys, and put four visibly labeled Advanced controls below the shared keypad. A shared set of descriptions powers the mouse and keyboard tooltips and the touch-friendly Advanced help disclosure. Escape dismisses open help before clearing, and information controls keep focus. The visual display updates during entry without a live announcement for each digit. Accepted API results feed a separate status, and errors retain alert semantics.
- Documented the approved behavior in `docs/SPEC.md`. The Go API, calculation rules, reducer, and numeric precision were unchanged. History was outside this implementation.

### Checks run

- `npm.cmd run coverage` passed all 37 frontend tests after updating the previous symbol-only Power assertion to allow the visible label. Coverage was 96.58% statements, 92.73% branches and 98.90% lines. `npm.cmd run build` passed TypeScript and the Vite production build.
- `npm.cmd run test:smoke` passed all three checked-in scenarios against the running Go API and Vite.
- A transient Playwright probe via `node --input-type=module` verified 320, 375, 768 and 1440 CSS pixels. At each width the large negative scientific result fit on one line, exact value inspection matched the real Go response, a 50-digit input kept newer digits in view while allowing scrolling to its start, and the sampled common keypad positions were identical in both modes. No page-level horizontal overflow was observed. The probe also verified clipboard contents, focus on disclosure dismissal, hover persistence, focus-triggered tooltips, Escape priority, touch help examples, and the real error alert.
- Checked accessibility roles and keyboard behavior in headless Chromium and React Testing Library. Actual screen-reader speech and physical touch hardware were not tested.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Frontend visual system and layout review

Tool — Codex (ChatGPT). Purpose — review the current React and CSS structure and propose a visual direction before implementation.

### Prompt

> Now that the end to end functionality is complete I want to focus on the frontend UI/UX
>
> The current interface is functional but the visual design is still too generic, we need to improve the overall quality before submission
>
> Review the existing React components, CSS Modules and layout structure
>
> I want to establish a more consistent design system using CSS variables for colors, spacing, typography, border radius, shadows and interaction states
>
> Review the current layout constraints, specially the fixed max width of the calculator, viewport based font sizing and vertical centering. These are causing problems with proportions, display overflow and mode switching
>
> For desktop I want a more balanced composition that uses the available space better, while keeping the calculator compact and usable on mobile
>
> Review the component hierarchy and identify if display, keypad, advanced controls and a possible history panel should have separate layout responsibilities
>
> The display needs to handle long numbers and scientific notation without clipping, using container aware sizing and horizontal overflow only when necessary. Keep formatting separate from calculation logic and preserve full numeric precision
>
> Improve the keypad hierarchy using consistent sizing, spacing and clear visual differences between numeric keys, operators, utility actions and Equals
>
> Define proper hover, active, focus visible and disabled states, with subtle transitions that dont cause layout shifts
>
> Advanced controls should have accessible names, contextual descriptions and tooltips that work with mouse and keyboard, with an alternative for touch devices
>
> Review the responsive behavior at 320, 375, 768 and 1440px, including layout stability when switching modes
>
> Avoid unnecessary dependencies, CSS frameworks or component libraries unless theres a strong technical reason
>
> Keep the current reducer, API contracts and calculation behavior unchanged
>
> Before implementation propose the layout strategy, component responsibilities, design tokens and the main visual decisions with their tradeoffs
>
> I want to review the approach first, dont modify application code yet

### Findings and recommendation

- The working tree already top-aligns the page and sizes the result relative to its container. The card still caps at 25 rem, and the title and key rows use viewport-based sizing. Existing CSS variables cover colors and one radius. Spacing, typography, shadows and interaction dimensions are repeated across modules. The spec still summarizes Escape as Clear, while the current UI lets it dismiss open help first. Current help and full-result treatments should be preserved and the spec reconciled once design work is approved.
- Recommend a warm neutral page, ink-blue display and cobalt Equals. Start with a top-aligned one-column layout through tablet, with a fluid card capped at roughly 26 to 28 rem. At about 56 rem, use an approximately 68 rem top-aligned page grid, with the title and a short keyboard reference in one column and a roughly 26 to 30 rem calculator in the other. Keep the shared keypad and responsive two-column Advanced group in the same card. The extra desktop space can hold useful controls guidance without making the keypad harder to scan. A history panel would be a future sibling of the calculator in the supporting column or below on small screens. It requires separate approval, and persistent history is out of scope in the current spec.
- App owns page composition. Calculator owns the order of sections and the connection to the existing hook. CalculatorDisplay owns typography, overflow, exact-result disclosure and copy. CalculatorKeypad owns the main grid and visual key categories. CalculatorAdvanced owns the Advanced grid and its shared help descriptions and tooltips. Keep formatting in the presentation layer. The reducer, API, and calculation precision need no design changes.
- Define semantic CSS variables for surfaces, text, digit, utility, operator, primary and feedback roles. Starting values include page `#F5F3EF`, display `#14233B`, Equals `#2148C7` and operator tint `#E8EEFF`. Use an approximately 4 px spacing base, shared key dimensions, 8/12/20 px radii, a single card shadow, system UI typography and tabular figures for numeric text. Use visual-only hover and active states, visible outlines, clear disabled states and reduced-motion behavior. Preserve mouse and focus tooltips, accessible descriptions and the touch disclosure.
- After approval, verify fits, exact-result access, focus, tooltip and touch help behavior and stable mode switching across the viewport matrix. Use a narrower-height mobile check to catch unnecessarily tall controls, and rerun the existing React tests and real API smoke checks.

### Checks run

- Reviewed the assessment, specification, project instructions, existing React layout components, CSS Modules, and theme. The first Chromium connection found the services stopped. Started the backend with `go run .` and Vite with `npm.cmd run dev -- --host 127.0.0.1 --strictPort`.
- A transient Playwright probe run with `node --input-type=module` checked 320, 375, 768 and 1440 CSS pixel widths at 900 px height against the real Go API. The card measured 294, 345, 400 and 400 px. Advanced mode added 181 px of card height, while the sampled common-key rectangles stayed identical. Advanced labels fit. There was no page-level horizontal overflow. The negative scientific result `-4.18900257888e+305` fit on one line, Full result matched the number from Go, and a 50-digit input scrolled to its latest digits at every width.
- Calculated example palette contrast ratios and consulted W3C guidance for focus contrast, target size and hover/focus tooltip behavior. These checks evaluated the existing layout and selected proposed color pairings. The proposed design is not implemented, and the automated suites were not rerun for this review.
- Only this log was updated. No application or specification changes, commits or pushes.

## 2026-11-25 — Responsive calculator visual redesign

Tool — Codex (ChatGPT). Purpose — implement and visually review the approved design system and desktop composition.

### Prompt

> Proceed with the UI redesign based on the proposed approach
>
> I agree with the responsive layout, component separation and design tokens, but I want to refine the desktop composition before considering it complete
>
> Avoid having a large empty column with just a title and keyboard instructions, the layout should feel balanced and make good use of the available space
>
> Use the proposed warm neutral palette, ink blue display and cobalt for Equals as a starting point, adjust contrast and proportions if needed
>
> Refine typography, spacing, alignment, border radius and button hierarchy. I want a clean and polished interface, not just different colors and shadows
>
> Extract CalculatorAdvanced from the main keypad and keep the standard controls consistent between modes
>
> Keep the display responsive with proper number formatting, full result access and no clipping
>
> Add accessible tooltips and contextual help for advanced operations, support keyboard and touch interactions
>
> Use CSS Grid and Flexbox where appropriate, keep CSS Modules and avoid unnecesary dependencies
>
> Check the layout at 320, 375, 768 and 1440px, also test shorter viewport heights
>
> Take screenshots at mobile and desktop sizes and review the actual visual result, not only DOM measurements or passing tests
>
> Check spacing consistency, visual balance, readability and alignment. Fix any obvious issues before reporting the implementation as complete
>
> Keep the calculator logic, reducer and Go API unchanged
>
> Dont implement history yet, that will be a separate step
>
> Run the frontend tests, TypeScript checks, production build and existing browser smoke tests

### Decisions and outcome

- Used one split calculator card on desktop. The left side is anchored by the display and Full result interaction, with a compact shortcut reference underneath. The right side holds mode selection, the shared keypad, and the separate CalculatorAdvanced group. Tablet and mobile use a top-aligned stack with the short keyboard hint after the controls.
- Defined semantic CSS tokens for the warm surfaces, dark readout, cobalt Equals, key hierarchy, typography, spacing, radii, shadows and interaction states. Shared controls use fixed geometry across hover, active, focus and disabled states, with reduced-motion support. Kept visible Advanced labels, accessible descriptions, mouse and keyboard tooltips, and the touch help disclosure.
- Used container sizing for the display, giving short numbers greater emphasis while keeping long numbers legible. Kept full-result inspection and copy on the stored precision. The visual review led to tighter desktop readout and shortcut spacing, disclosure chevrons and a distinct Copy result button.
- The reducer, calculation logic and API were unchanged. No dependencies or history were added.

### Checks run

- `npm.cmd run coverage` passed all 37 frontend tests. Coverage was 96.60% statements, 92.91% branches and 98.90% lines. `npm.cmd run build` passed TypeScript checking and the Vite production build.
- `npm.cmd run test:smoke` passed all three checked-in Chromium scenarios against the running Go API and Vite.
- A transient Playwright probe via `node --input-type=module` passed at 320×900, 375×812, 768×900, 1440×900, 320×568, 375×600 and 1440×650 CSS pixels. Checked stable shared-key positions, a large scientific result on one line, the matching exact result, a 50-digit entry scrolled to its newest digits, and no page-wide horizontal overflow. Also verified mouse and keyboard tooltips, Escape preserving focus and input, reduced motion, and touch help at 320×568.
- Captured and visually inspected mobile, tablet and desktop screenshots in the ignored `.tooling/ui-redesign` directory, then captured and reviewed the refined composition. Browser checks used headless Chromium and touch emulation.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Calculator UI specification

Tool — Codex (ChatGPT). Purpose — consolidate the visual decisions, UI acceptance criteria, and proposed history scope.

### Prompt

> Before making more UI changes I want to consolidate the design decisions into a proper specification
>
> Review the current frontend, SPEC.md and the UI decisions we discussed
>
> Create docs/UI_SPEC.md defining the desktop and mobile layouts, visual hierarchy, design tokens, responsive behavior and component responsibilities
>
> The display and keypad should remain together, with a collapsible history panel and compact contextual help
>
> Define the history behavior, accessibility requirements and visual acceptance criteria, including layout stability and long number handling
>
> Keep the scope realistic for this assessment, distinguish required fixes from optional features

### Outcome and checks

- Created `docs/UI_SPEC.md` as the presentation companion to `docs/SPEC.md`. It records the unified calculator card, responsive layout, semantic tokens, responsibilities, compact help, accessibility, and testable visual requirements.
- Documented session-only history as a separate optional assessment increment. The proposed disclosure sits below the calculator at all widths and retains up to 10 successful evaluations. Persistent storage and result reuse remain deferred.
- Reviewed the existing React components, CSS Modules, theme, assessment, functional specification, and prior UI discussion. Checked Markdown links and the Git diff. No application or functional spec files were edited, and no application tests were needed for this documentation change.

## 2026-11-25 — Compact calculator navigation and history design review

Tool — Codex (ChatGPT). Purpose — review the proposed mode menu, vertical card, and responsive history interactions before implementation.

### Prompt

> Replace the Standard and Advanced segmented control with a compact navigation menu opened from a hamburger button
>
> The menu should show the available modes and indicate which one is active. Changing modes must preserve the existing calculation state
>
> Keep the display and keypad together in a vertical calculator layout, result above the controls with a clear visual hierarchy
>
> Add a history button in the calculator header that opens and closes a Recent calculations panel
>
> On desktop history can expand beside the calculator, on mobile use an overlay or drawer that doesnt resize or shift the keypad
>
> History should be closed by default, show the latest 10 successful evaluations and have its own Clear history action
>
> Keep the help for advanced operations accessible but secondary, avoid large shortcut panels occupying permanent space
>
> Define the menu and history interactions including Escape handling, focus management, aria-expanded, keyboard navigation and touch behavior
>
> Keep the existing design tokens as a starting point but refine the visual language toward a more compact and polished calculator interface
>
> Review the component responsibilities and responsive behavior before implementation, dont change the calculation logic or API

### Proposed interactions

- Use one top-aligned vertical card at all widths. Put a Modes button, current mode label, and History button in its header, then the display, shared keypad, and optional Advanced keys and help. Retire the permanent shortcuts card. Retain the existing warm surfaces, navy readout, key categories and cobalt Equals, with compact spacing and at least 44 px touch targets.
- Use a disclosure for the mode chooser, with native buttons in tab order, an active checkmark and pressed state, and an accessible label and expanded state on the hamburger trigger. Opening leaves focus on the trigger. Selecting a mode or pressing Escape closes and returns focus to the trigger. Clicking outside or tabbing away dismisses without taking focus back. The menu and mode switch leave entry, operations, results, percentage marker, and in-flight requests intact.
- Dock Recent calculations beside the card where both fit without moving the keypad. Use a labeled modal drawer on narrower screens, including tablets where the dock would crowd the card. Open with an accessible History button that exposes its expanded state. The dock allows Tab to leave. The drawer moves focus inside and keeps background controls inert. Both have a visible Close action. Escape inside the dock or anywhere in the open drawer and Close restore focus to History. A dock without focus may remain open during calculation.
- Record the last 10 accepted successful API evaluations in memory, most recent first and one per evaluated step, with operation, exact operands and result, and the contextual flag when applicable. Errors, canceled and stale responses, and repeated Equals without evaluation add no rows. Clear history only clears the list. Keep persistent storage and result reuse deferred.
- Keep Calculator responsible for presentation coordination, header for triggers, display and keypad for their existing rendering, CalculatorAdvanced for compact help, and CalculatorHistory for presentation. History listens at the existing accepted-success boundary and stays separate from the active reducer. Drawer and disclosures handle Escape before calculator Clear. Suppress calculator shortcuts while focus is in history or while the modal drawer is active.

### Checks run

- Reviewed the current React components, keyboard handlers, request acceptance, theme, UI specification, and functional spec. The split card and below-card history placement in UI_SPEC.md differ from this proposal. Consulted W3C disclosure and modal-dialog guidance.
- Only this log was updated. Application and specification implementation, screenshots, and browser verification remain pending.

## 2026-11-25 — Compact calculator navigation and history

Tool — Codex (ChatGPT). Purpose — implement the approved mode menu, vertical layout, and session-only history.

### Prompt

> I approve the proposed layout and interaction model
>
> Update UI_SPEC.md with the agreed changes and proceed with the implementation
>
> Keep the calculator as a single vertical unit with a compact header, mode menu, display and keypad
>
> Remove the permanent shortcuts panel and keep Advanced help collapsed by default
>
> Implement the collapsible history with the latest 10 successful calculations, stored in memory and managed separately from the active calculator reducer
>
> Use a docked history panel on wide desktop and a modal drawer on smaller screens, without resizing or shifting the calculator
>
> Handle keyboard navigation, focus restoration, Escape and outside clicks correctly. Make sure these interactions dont interfere with calculator shortcuts
>
> Keep the current design tokens but refine the spacing, typography and proportions for a more polished interface
>
> Dont modify calculation logic or backend contracts
>
> Add focused tests for menu behavior, history recording, clearing and stale responses

### Decisions and outcome

- Updated `docs/UI_SPEC.md` and returned to one compact vertical card. Added the mode-picker and History in its header, removed the permanent shortcuts panel, and retained the collapsed Advanced help and the existing display and keypad.
- History starts closed and holds the latest 10 successful current responses in memory, one entry per evaluated operation. It uses the exact request values and returned number, including the contextual percentage marker, and formats for readability. Calculator Clear leaves history intact. Clear history leaves the active calculation intact. Mode changes keep pending operations and in-flight requests.
- Used a non-modal dock from `72rem` and a native modal drawer below. Menu activation, outside presses, escape handling and focus return are independent of calculator Clear. The drawer suspends calculator shortcuts and wraps Tab in both directions. Initial Chromium probing found a Tab boundary gap in the native dialog; added explicit wrapping and a checked-in smoke regression.
- The reducer, arithmetic and Go contract were unchanged. The request hook gained only a callback on accepted success for history recording.

### Checks run

- `npm.cmd run coverage` passed all 41 frontend tests. Coverage was 91.31% statements, 87.89% branches and 94.44% lines. `npm.cmd run build` passed TypeScript and the Vite build. `node --check scripts/browser-smoke.mjs` passed.
- `npm.cmd run test:smoke` passed all four scenarios against the real Go API, including the new mobile history and focus case.
- Transient Playwright probes via `node --input-type=module` passed at 320×568, 375×812, 768×900, 1151×650, 1152×650 and 1440×900. Checked card and keypad stability, menu focus, dock versus drawer behavior, Escape, Tab in both directions, backdrop dismissal, independent clearing, and correct behavior when resizing across the dock breakpoint. The 320 px view also retained scientific notation and full precision, and history reset on reload.
- Visually reviewed the desktop menu, desktop dock, short mobile card, and mobile drawer screenshots under ignored `.tooling/compact-calculator`. Browser work used headless Chromium and touch emulation. No screen-reader speech or physical device was checked.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Live calculator expression display

Tool — Codex (ChatGPT). Purpose — make the upper readout show the active or completed evaluation.

### Prompt

> Improve the calculator display so the upper area shows the actual mathematical expression instead of the static Result label
>
> Show the operands, operator and percentage modifier while entering a calculation, and keep the completed expression with = after evaluation
>
> The large display value should remain the current input or calculated result
>
> Support binary operations, square root, power, direct and contextual percentages, including chained calculations
>
> Use the actual calculator state to derive the expression, dont introduce a separate expression parser or duplicate calculation state
>
> Make sure the expression reflects left to right evaluation and doesnt become misleading after an operator replacement, Clear or a failed request
>
> Handle long expressions with truncation or horizontal scrolling without showing a native scrollbar, keep the latest relevant part visible and allow access to earlier content
>
> Keep formatting in the presentation layer, dont change the reducer or API unless theres a clear state requirement that cannot be derived safely
>
> Add focused tests for pending expressions, completed calculations, chaining, unary operations and error recovery

### Decisions and outcome

- Derived the live expression from the pending operator, existing entry and result, and the request already accepted or attempted by the hook. Extended the existing accepted-result metadata with its request. The reducer, API, arithmetic and stored precision were unchanged.
- Completed expressions append equals only after success. Chains show the active step with the previously accepted result as the new left operand. A square root on a pending right operand updates that operand and keeps the binary expression active. Failures retain the attempted expression without equals and Clear removes it. Direct percentage uses a base-first expression such as `150 × 20%`; contextual percentage marks the rate on its current operation. The large value remains independent of the expression.
- Long expressions scroll to the latest digits with a hidden native scrollbar and support keyboard and touch scrolling to earlier content. Updated the display section of `docs/UI_SPEC.md`.

### Checks run

- Added five expression tests and updated earlier operator-prefix assertions to expect complete expressions. Extended the stale-response case to protect the newest completed expression. `npm.cmd run coverage` passed all 46 frontend tests with 91.84% statement, 88.66% branch, and 94.79% line coverage. `npm.cmd run build` passed TypeScript and the Vite production build.
- `npm.cmd run test:smoke` passed all four checked-in real-API scenarios.
- Transient Playwright probes via `node --input-type=module` passed at 320, 375, 768 and 1440 CSS pixels. Checked real left-to-right chaining and division recovery, 50-digit overflow with no visible scrollbar or page-level scroll, access to earlier digits using the keyboard, and Clear. A browser-emulated touch swipe also revealed earlier content at 320 px. Reviewed mobile and desktop screenshots under ignored `.tooling/expression-display`.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Display scrollbars and keyboard focus

Tool — Codex (ChatGPT). Purpose — remove the unwanted scrollbar and inner focus outline while retaining long-value navigation and a visible keyboard focus indicator.

### Prompt

> Fix the remaining display issues
>
> The native scrollbar is still visible even with a single digit, and theres an unwanted inner border around the result
>
> Check the DOM, overflow and focus styles to find the cause
>
> Hide the scrollbar without breaking horizontal scrolling for long values, keep the result right aligned with proper padding
>
> Preserve keyboard accessibility and visible focus when needed
>
> Verify the result in Chromium at different screen sizes, both focused and unfocused

### Outcome and checks

- Chromium measured one pixel of vertical overflow on the single-digit output at 375 px. Horizontal auto also computed vertical overflow as auto, and the value entry used a thin native scrollbar. The output border was zero. Its keyboard focus outline produced the inner rectangle.
- Updated only the display CSS. Both scrollable lines retain horizontal auto scrolling, hide native scrollbars, and suppress vertical scrolling. The value's keyboard focus indicator now sits around the outside edge of the display. Pointer focus and the unfocused display have no ring. Alignment, padding, markup and calculation behavior were retained.
- A transient Playwright probe via `node --input-type=module` used Chromium with overlay scrollbars disabled. At 320, 375, 768 and 1440 CSS pixels it checked focus, scrollbar styling and geometry, right alignment, long-value scroll to the end, and ArrowLeft access to earlier digits. A touch-emulated swipe also worked at 320 px. Reviewed the mobile keyboard-focus and unfocused desktop screenshots under ignored `.tooling/display-focus`.
- `npm.cmd test` passed all 46 frontend tests. `npm.cmd run build` passed TypeScript and the Vite production build. `npm.cmd run test:smoke` passed all four real-API scenarios. `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed.

## 2026-11-25 — Compact display, unified symbol keypad and history actions

Tool — Codex (ChatGPT). Purpose — reconcile the rendered calculator with the latest UI requirements and verify the result on desktop and mobile.

### Prompt

> Review the current UI against our latest design decisions, some previously requested changes are still missing
>
> Remove the Full result disclosure completely, the display should only show the active expression and the main result
>
> Refine CalculatorHistory, replace Close and Clear history text buttons with accessible icon buttons and place them properly in the header. Improve spacing and alignment of history entries
>
> Integrate Advanced operations into the main keypad layout instead of rendering them as a separate section below it
>
> Use compact mathematical symbols for Advanced operations rather than long text labels, keep accessible names and tooltips to explain their behavior
>
> Make sure both percentage controls remain clearly distinguishable
>
> Review UI_SPEC.md and update any outdated decisions that conflict with these requirements
>
> Keep the existing calculator behavior, history state and Go API unchanged
>
> Test Standard and Advanced layouts at mobile and desktop sizes, check the actual screenshots against each requirement
>
> Run the relevant frontend tests, build and browser smoke tests
>
> Report which requirements were completed and identify anything still pending

### Outcome and checks

- Removed Full result and Copy result from the display and its CSS. The expression and value keep the regular layout, with the existing loading and error feedback. Calculation precision and history state remain intact.
- Added a fourth-column grid row of symbol keys within the main keypad in Advanced mode. `xʸ`, `√`, `×%` and `%` retain accessible names and descriptions. `×%` calculates a percentage of a base, and `%` toggles a contextual rate. Advanced help remains collapsed. Initial checks found a keyboard tooltip could obscure pointer access and that moving help into the grid redirected focus to the display. Moved the tooltip below the keys, made focus-only tooltips pointer-transparent, and exempted help from the pointer focus redirect.
- Put accessible trash and close icon buttons in the history header. Aligned expressions left and results right. Preserved independent clearing, focus recovery, the dock and drawer, the reducer and Go API. Updated `docs/UI_SPEC.md` to match.
- `npm.cmd run coverage` passed all 47 frontend tests, with 91.71% statements, 88.82% branches, and 94.46% lines. `npm.cmd run build` passed TypeScript and Vite production build. `npm.cmd run test:smoke` passed five live Go scenarios, including the new regression for tooltip pointer access and help focus.
- Used a transient Playwright probe through `node --input-type=module` and reviewed screenshots in ignored `.tooling/symbol-keypad`. Verified Standard and Advanced at 320×568, 375×812, 768×900 and 1440×900, mobile history and desktop dock alignment, touch help, mouse and keyboard tooltips, clear and close actions, and stable common keys. Checks used headless Chromium with touch emulation.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Unified Advanced tooltips and result motion

Tool — Codex (ChatGPT). Purpose — consolidate contextual help and add motion for accepted calculator results.

### Prompt

> Remove the Advanced help section, its redundant with the tooltips
>
> Keep one contextual help system that works with mouse, keyboard and touch devices, with accessible descriptions
>
> Add a subtle animation when a calculation result is returned, around 200ms using opacity and a small translateY transition
>
> Only animate successful API results, not digit inputs, errors or mode changes
>
> Avoid layout shifts, preserve numeric precision and respect prefers-reduced-motion
>
> Keep the existing architecture and calculation logic unchanged
>
> Verify the interactions in Chromium and run the relevant tests

### Outcome and checks

- Removed the separate Advanced help disclosure. Each existing tooltip supplies the accessible description and opens on mouse hover, keyboard focus, or a roughly 450 ms touch or pen hold. A hold suppresses the operation, a tap still activates it, and Escape or a tap outside dismisses touch help. On coarse-pointer layouts the footer explains the hold gesture.
- Animated the existing output element for 200 ms using opacity and a 4 px translateY when a new accepted API result is shown. Used the accepted request identity to avoid replays during input, mode switching, or display updates. Reduced-motion preferences skip the animation. Updated UI_SPEC.md. Reducer, Go API, arithmetic, and stored values retained their behavior.
- `npm.cmd run coverage` passed all 47 frontend tests with 88.53% statement, 86.03% branch and 90.69% line coverage. `npm.cmd run build` passed TypeScript and Vite production build. `npm.cmd run test:smoke` passed all five real-API scenarios.
- A transient Chromium probe via `node --input-type=module` verified hover persistence, keyboard focus and Escape, 200 ms opacity and position animation, stable keypad geometry, and distinct successful responses with the same value. Digit entry, failure, repeated Equals without a request, and mode changes did not start an animation. Touch emulation at 320×568 and 375×812 verified that a hold opened the tooltip without an API request, outside tap dismissed it, and a short tap performed square root. The probe also checked long-value scrolling and successful reduced-motion results without animation.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Delayed loading feedback and smoother results

Tool — Codex (ChatGPT). Purpose — remove visible loading flashes and keep result motion independent from calculation state.

### Prompt

> The result transition still feels abrupt because Calculating appears briefly before the final value
>
> Keep the previous value visible while the API request is pending, dont replace it with loading text
>
> Only show a subtle loading indicator if the request takes longer than 250ms, without changing the display layout or dimensions
>
> When the result arrives use a smooth transition, avoid flashing, jumping or unnecessary re-renders
>
> Keep the final value immediately available in state, dont delay calculations just for the animation
>
> Preserve error handling, stale response protection and reduced motion support
>
> Review the current loading and animation implementation, fix the cause instead of adding more effects

### Outcome and checks

- Found that the immediate loading text occupied space in the expression header for every request and could flash before fast responses. Kept the readout value visible and gave the slow-request dots a fixed spot in the header. The polite loading message is visually hidden and appears only after the request has been pending for 250 ms.
- Scheduled the threshold within the existing request lifecycle without adding an effect. Settling or aborting the request cancels its timer. The existing active-request guard also protects loading feedback. Successful results are available immediately, including while the 200 ms animation runs. Reduced the motion to a 2 px rise from 90% opacity and kept reduced-motion support. Updated UI_SPEC.md.
- Added two fake-timer cases for the 249/250 ms boundary, immediate success and canceled or fast request cleanup. `npm.cmd run coverage` passed all 49 frontend tests with 91.02% line coverage. `npm.cmd run build` passed TypeScript and the Vite production build. `npm.cmd run test:smoke` passed all five real-API scenarios.
- A transient Chromium probe via `node --input-type=module` delayed real API requests at 320 and 1440 CSS pixels. Verified the readout and layout remained steady, fast requests stayed quiet, a slow request displayed the dots, and success or error removed them. Also verified immediate result availability with the animation running and no animation with reduced motion.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Calculator clipboard shortcuts

Tool — Codex (ChatGPT). Purpose — support native platform copy and paste of numeric calculator values.

### Prompt

> Add clipboard support to the calculator
>
> Support Ctrl+C and Ctrl+V on Windows, and Cmd+C and Cmd+V on macOS
>
> Copy the full numeric value instead of the rounded display text
>
> Allow pasting valid numbers including negatives, decimals and scientific notation
>
> Reject invalid or non finite values without changing the current calculation
>
> Pasting should replace the current entry while preserving pending operations, and start a new calculation after a completed result
>
> Handle clipboard permissions, keyboard focus and pending requests correctly
>
> Keep the existing architecture and calculation logic unchanged unless necessary
>
> Add focused tests and verify the behavior in Chromium

### Outcome and checks

- Used native clipboard events for the platform shortcuts. Copy uses the stored, unrounded numeric result or the complete editable operand and leaves browser text selection alone. Clipboard interactions are scoped to the calculator and ordinary page focus. Menus, history, and editable controls keep their native interactions. Unavailable clipboard event data is safely ignored.
- Validated signed decimal and scientific-notation text and rejected invalid and non-finite values before dispatch. Added one paste entry transition to preserve the pending operation and contextual marker or start fresh after a result. A pasted number in scientific notation becomes ordinary decimal text when editing its digits. Active requests ignore paste and remain eligible to complete. Updated UI_SPEC.md. Arithmetic and Go contracts retained their existing behavior.
- `npm.cmd run coverage` passed all 55 frontend tests, including six focused clipboard tests, with 91.78% line coverage. `npm.cmd run build` passed TypeScript and Vite production build. `npm.cmd run test:smoke` passed all five live-API scenarios.
- A transient browser check via `node --input-type=module` used the actual Windows Ctrl+C and Ctrl+V shortcuts in headless Chromium. It verified the full copy of `0.1 + 0.2`, scientific paste and its outgoing API request, fractional replacement, invalid and overflowing input, native selection copying, history focus, and paste safety during a delayed real request. Cmd uses the same native clipboard events. A macOS runtime was not available for direct testing.
- `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Percentage interaction review

Tool — Codex (ChatGPT). Purpose — compare the two current percentage controls with a single contextual key and identify simplifications.

### Prompt

> I want to review how we're handling percentages in the calculator
>
> Looking at the Windows calculator, it uses a single % button and its behavior depends on the pending operation
>
> Our implementation has two different percentage controls, and Im not sure the distinction is intuitive for someone using it for the first time
>
> Review the current behavior, SPEC.md and the UI, compare both approaches from a usability perspective
>
>
> What alternatives would you suggest to simplify the interaction without losing the functionality we already implemented?
>
> Explain the tradeoffs and any impact on our current state management or API

### Outcome and checks

- Reviewed SPEC.md, UI_SPEC.md, the Advanced keys, pending state, expression formatting, request routing, and Go percentage arithmetic. Direct `×%` starts a binary operation before entry of the rate. Contextual `%` marks the entered right operand without a request. The two gestures yield the same numerical result for direct percentage and contextual multiplication.
- Reviewed current Microsoft Calculator source. Its percentage key transforms the visible operand immediately. Its multiply and divide use the rate as a fraction, while add and subtract use a percentage of the base. The older Microsoft blog describes different multiply and divide behavior. The review relies on the current source and did not exercise the installed Windows app. [Arithmetic source](https://github.com/microsoft/calculator/blob/main/src/CalcManager/CEngine/scifunc.cpp#L89-L101) · [Display handling](https://github.com/microsoft/calculator/blob/main/src/CalcManager/CEngine/scicomm.cpp#L323-L367)
- Recommended a single postfix `%` in the current Advanced scope. `150 × 20 % =` preserves the direct calculation result through contextual multiply while the direct API operation stays available. This reuses the existing boolean marker and keeps all arithmetic in one Go request. To retain the explicit base-first UI sequence, use the same key to start direct percentage when no operator is pending, at the cost of more context to explain. Keeping visibly named separate controls is also viable. Decisions about standalone behavior and exposing the key in Standard mode remain open.
- A transient Chromium check via `node --input-type=module` at 375 CSS pixels verified both real requests returned 30 and that contextual marking toggles without a request. Only this log was updated. No application or specification edits were made.

## 2026-11-25 — Single contextual percentage key

Tool — Codex (ChatGPT). Purpose — simplify the Advanced keypad while preserving both percentage API forms.

### Prompt

> I agree with the first approach, lets simplify the UI to a single contextual % button
>
> Remove the direct percentage control from the keypad, users can calculate a percentage of a value using multiplication
>
> Keep the existing percentage API operation available, dont remove backend functionality
>
> Preserve the editable percentage marker and the current left to right evaluation
>
> Make sure the % button behaves correctly with pending operations, mode switching and error recovery
>
> Update SPEC.md and UI_SPEC.md to reflect the simplified interaction
>
> Adjust the relevant frontend tests and browser smoke tests, keep backend behavior unchanged

### Outcome and checks

- Removed `×%` from the Advanced keypad and let `%` span two columns. Updated its tooltip with `150 × 20% = 30` and documented the interaction in SPEC.md, UI_SPEC.md, and README.md. The reducer, API client, and Go implementation retained their existing behavior.
- `npm.cmd run coverage` passed all 55 frontend tests with 91.78% line coverage and 85.54% branch coverage. `npm.cmd run build` passed TypeScript and the Vite production build. Early runs exposed an assertion referencing an out-of-scope helper and an outdated history expectation after adding the new smoke calculation. Both were corrected.
- `npm.cmd run test:smoke` passed all six live React and Go scenarios, including `150 × 20% = 30` and mode switching and recovery from `150 ÷ 0%`. A separate HTTP POST with `{"operation":"percentage","a":150,"b":20}` returned `{"result":30}`. The native backend test suite was not rerun for this UI change.
- A transient Chromium layout check confirmed the three Advanced keys fit one row, Equals stays in place when switching modes, and the page has no horizontal overflow at 320, 375, 768, and 1440 CSS px. Inspected screenshots at 320×568 and 1440×650. `git -c core.whitespace=cr-at-eol -c core.safecrlf=false diff --check` passed. No commits or pushes.

## 2026-11-25 — Assessment verification report

Tool — Codex (ChatGPT). Purpose — review calculator coverage, check CI, and prepare reproducible assessment evidence.

### Prompt

> Review the current test coverage and prepare the assessment verification report
>
> Check the frontend and backend test suites, coverage configuration and existing GitHub Actions workflow
>
> Identify uncovered behavior that could affect correctness, dont add tests just to increase coverage

### Outcome and checks

- Created `docs/VERIFICATION.md` with fresh results, CI scope, relevant behavior gaps, and reproduction commands. No application, test, or workflow files changed.
- `npm.cmd run coverage` passed all 55 frontend tests with 91.78% line and 85.54% branch coverage. `npm.cmd run build` and all six `npm.cmd run test:smoke` scenarios passed. One-off Chromium checks covered long-entry scrolling, emulated touch help, reduced motion, and live square root followed by power.
- Native Windows Go 1.27.4 passed `go test -count=1 -coverpkg=./...` with a temporary coverage profile, `go tool cover -func`, `go vet ./...`, and the API build. Coverage was 92.8% overall. With Go 1.25.0, Windows Application Control blocked the HTTP test executable. The arithmetic tests, vet, and build passed under that version. The historical GitHub-hosted Go 1.25.0 Linux baseline passed at 93.0% coverage. No new hosted run was triggered.

## 2026-11-25 — Final testing setup

Tool — Codex (ChatGPT). Purpose — cover failed intermediate calculations and verify both layers in CI.

### Prompt

> Finalize the testing setup before submission
>
> Add a React regression test for a failed intermediate calculation like 8 / 0 followed by another operator, verify recovery and that history stays unchanged
>
> Add a frontend job to GitHub Actions running npm ci, coverage and production build. Keep the backend job unchanged
>
> Update VERIFICATION.md and README.md with the testing process and coverage results
>
> Run the relevant checks and report the actual results, avoid unnecesary changes

### Outcome and checks

- Added one React regression for `8 ÷ 0 ×`. It checks that the existing history entry survives the failure, then verifies the corrected chain `8 ÷ 2 × 3 = 12` and its two new history entries.
- Added a Node 24 frontend job on Ubuntu. Compared the backend job, workflow triggers, and permissions against HEAD and confirmed they match. `go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.7 .github/workflows/backend.yml` passed. The frontend job has yet to run on GitHub.
- In a clean temporary frontend directory, `npm.cmd ci`, `npm.cmd run coverage`, and `npm.cmd run build` passed. All 56 tests passed with 91.78% line and 85.54% branch coverage. Native Windows Go 1.27.4 passed the full test suite with 92.8% statement coverage, vet, and build.
- The first `npm.cmd run test:smoke` attempt found the local servers stopped. All six Chromium scenarios passed after starting Go and Vite. Updated README.md and docs/VERIFICATION.md. No application code changed.

## 2026-11-25 — Advanced keypad first row

Tool — Codex (ChatGPT). Purpose — integrate the Advanced controls at the top of the shared keypad.

### Prompt

> Move the Advanced operations x^y, sqrt and % to the top of the main keypad
>
> Integrate them into the same four column grid, not a separate section below
>
> Keep consistent button sizes, spacing and visual hierarchy
>
> Preserve the Standard layout, keyboard navigation, tooltips and calculator state
>
> Update UI_SPEC.md and verify the layout in Chromium at mobile and desktop sizes
>
> Run the relevant tests and update AI_USAGE.md
>
> Dont commit or push

### Outcome and checks

- Moved the Advanced controls above the utility keys in both DOM and visual order. The row uses the existing four-column grid and key styles, with `%` spanning two columns. Tooltips open upward to keep shared keys clear. Standard geometry and calculator state are unchanged. Updated UI_SPEC.md to specify the one-row shift in Advanced mode.
- Updated the React and browser assertions for Tab order and tooltip behavior. `npm.cmd run coverage` passed all 56 tests with 91.78% line and 85.54% branch coverage. `npm.cmd run build` and all six live `npm.cmd run test:smoke` scenarios passed.
- Checked grid alignment, absence of horizontal overflow, tooltip bounds, and state preservation across modes in Chromium at 320×568, 375×650, 768×800, 1440×650, and 1440×900. Inspected screenshots at 320×568 and 1440×900. At 375px, emulated touch confirmed a long press shows help without selecting Power and a digit tap dismisses it. No commits or pushes.

## 2026-11-25 — Calculator size options review

Tool — Codex (ChatGPT). Purpose — assess Compact, Default, and Large as presentation preferences.

### Prompt

> Review adding three calculator size options: Compact, Default and Large
>
> Use CSS variables or container classes to control card width, key dimensions, spacing and display typography
>
> The selected size should only affect presentation, not calculator state or API behavior
>
> Keep the control discreet, preferably in the navigation menu instead of adding buttons to the keypad
>
> Make sure all sizes remain responsive and automatically fit smaller viewports without horizontal overflow
>
> Consider how the history panel should behave when Large is selected, keeping the calculator stable
>
> Review the existing layout and suggest the simplest implementation without new dependencies

### Outcome and checks

- Recommended a presentation-only App state value and calculator-scoped CSS variables. Default retains the current styling. Proposed page caps are 25, 29, and 33 rem including gutters. At narrow or short sizes, Large uses baseline spacing and key heights. Compact retains 44 px touch targets.
- Recommended a second labeled group in the hamburger popover with a selected state, existing dismissal behavior, and focus restoration. The preference starts at Default on reload. No calculator state, request, or history entry depends on the selected size.
- In a temporary Chromium session, compared the current history geometry at 320, 1151, 1152, 1216, and 1440 px and simulated a 33 rem page cap with an inline width override. At the existing 1152 px dock breakpoint the simulated dock reached the viewport edge. At 1216 px it left 32 px on the right. Recommended one 76 rem dock threshold for all three sizes so changing presets never changes history from docked to modal. The 72–76 rem range would use the existing drawer.
- No application or specification files were changed. No test suite was run, and no commits or pushes were made.

## 2026-11-25 — Calculator size presets

Tool — Codex (ChatGPT). Purpose — add responsive presentation presets and verify calculator and history continuity.

### Prompt

> Proceed with the three calculator size presets following the reviewed approach
>
> Add Compact, Default and Large to the existing hamburger menu, with a checkmark for the selected size
>
> Use scoped CSS variables for width, spacing, key height and display typography. Keep Default as the initial size
>
> Update the history dock breakpoint to 76rem for all sizes
>
> Make sure size changes dont affect calculations, pending requests, history or keyboard navigation
>
> Keep all presets responsive, with no horizontal overflow or undersized touch targets

### Outcome and checks

- Added Compact, Default, and Large to the hamburger menu. App owns the presentation preference and starts at Default after reload. The selected option gets a checkmark and reports its pressed state. Choosing a size restores focus to the trigger. Scoped CSS variables control width, spacing, row height, and display type, and preserve the default geometry.
- Set the history dock threshold to 76 rem for every size and updated UI_SPEC.md. A focused React regression verifies that changing size preserves a pending operation, in-flight request, and open history. Display scroll positioning updates on a size change to keep the active end of a long entry in view.
- `npm.cmd run coverage` passed all 57 frontend tests with 91.89% line and 85.61% branch coverage. `npm.cmd run build` and all six live `npm.cmd run test:smoke` scenarios passed.
- A transient Chromium layout check verified all three sizes at 320, 375, 768, 1152, 1215, 1216, and 1440 CSS px, including 320×568 and 1440×650. Checked 44px minimum key targets, no horizontal overflow, history placement, result retention, and the last digits of a 50-digit entry after resizing. Inspected mobile and desktop screenshots. No backend changes, commits, or pushes.

## 2026-11-25 — Immersive Large calculator

Tool — Codex (ChatGPT). Purpose — make Large a distinct distance-readable layout while preserving the calculator’s interaction model.

### Prompt

> The three size presets still look too similar, I want Large to be a noticeably different experience
>
> Treat Large as an immersive calculator mode for someone using the app from a distance, almost fullscreen
>
> Use around 85-90% of the available viewport with significantly larger keys, typography and result display
>
> Reconsider the layout for Large instead of just increasing the card width, use the extra space to create a balanced composition
>
> Keep Compact small for multitasking and Default as the current standard calculator
>
> Make sure Advanced controls, history and the mode menu still work naturally in the larger layout
>
> Use responsive sizing based on available width and height, avoid clipping, excessive whitespace or horizontal overflow
>
> Keep calculation state and API behavior unchanged, preserve keyboard accessibility and focus management

### Outcome and checks

- Large uses viewport-relative width, height, key and text sizes. Wide and short-landscape layouts place the readout beside the shared keypad. Narrow layouts stack them. Large history opens as a modal side or bottom drawer, preserving card geometry. Compact and Default retain their layouts and 76 rem dock breakpoint. Updated UI_SPEC.md.
- `npm.cmd run coverage` passed all 57 tests with 92.20% line coverage and 85.91% branch coverage. Updated the size regression to query history after it is reopened. `npm.cmd run build` and all six live `npm.cmd run test:smoke` scenarios passed.
- A temporary Chromium check covered 320×568 through 1920×1080, including 672×375 and 1024×420. It verified key targets of at least 44px, no horizontal overflow, keyboard order, tooltips, in-bounds scientific notation, and focus and history preservation when a dock becomes a modal. Early layout checks revealed a clipped tooltip in short landscape. Adjusted its sizing and spacing and reran the checks successfully. Inspected mobile, short-landscape, and desktop screenshots. At 1440×900, the card measured 1296×774 and Advanced keys were about 94px tall.

## 2026-11-25 — Large readout and keypad refinement

Tool — Codex (ChatGPT). Purpose — reduce unused display space and improve Large typography and short-screen layout.

### Prompt

> Refine the Large calculator layout, the overall structure looks good but the display still has too much unused space
> Improve the visual balance between the expression and the result, make short results significantly larger and adapt typography for long values
> Keep the keypad layout but refine spacing, proportions and the visual hierarchy of the controls
> Make sure the layout adapts properly to shorter desktop viewports and Advanced mode without clipping
> Keep Compact and Default unchanged, this refinement should only affect Large

### Outcome and checks

- Shortened the Large readout beside the keypad and kept the expression close to the value. Large adapts the value font by character count and available width and height. Long typed entries still scroll inside the readout. Adjusted Large-only key gaps, utility and Advanced labels, and Equals emphasis. Short landscape uses tighter spacing while keeping 44 px minimum targets. Updated UI_SPEC.md.
- `npm.cmd run coverage` passed all 57 tests with 92.20% line and 85.98% branch coverage. `npm.cmd run build` and `npm.cmd run test:smoke` passed after correcting a CSS selector caught by the initial build. No calculation or API changes.
- Chromium verified Advanced mode across nine viewport sizes from 320×568 to 1920×1080, including 672×375, 1024×420, and 1280×500. Checked no horizontal overflow, all keypad keys visible at 1024×420, in-bounds percentage tooltips, one-line scientific output, and 50-digit entry scrolling. At 1440×900, the five-digit result used 151 px type and a scientific result used 42 px. Inspected mobile, short-desktop, and desktop screenshots and verified Compact and Default kept their desktop geometry and typography.

## 2026-11-25 — Final technical review

Tool — Codex (ChatGPT). Purpose — review the published calculator revision against the assessment, functional specification, and UI specification.

### Prompt

> Perform a final technical review before submission
> Compare the current implementation against ASSESSMENT.md, SPEC.md and UI_SPEC.md
> Review code quality, architecture, security, input validation, error handling, accessibility and responsive behavior
> Check for unused code, unnecessary dependencies, duplicated logic and any important regressions
> Verify that the frontend and backend tests cover the critical functionality
> Prioritize findings by severity and identify actual blockers, avoid suggesting unnecessary features or refactoring

### Outcome and checks

- Reviewed published main commit `d35ac60` and confirmed it matches the local revision. The repository is private, so evaluator access remains a submission prerequisite. The current hosted push run was not independently verified.
- Go CI resolves Go 1.25.0 from go.mod. `govulncheck` reported 29 standard-library advisories at symbol level for that toolchain. Those results overapproximate applicability to the loopback-only application. The same scanner found zero vulnerabilities on Go 1.27.4. Recommended switching the submission build to a supported patched toolchain. The npm audit reported zero advisories.
- Reproduced loss of keyboard focus when Space activates Equals and its button becomes disabled during the API request. Focus stayed on the document body after the accepted result. Verified in Chromium using a delayed real Go response. Large also rebalances its rows between Standard and Advanced, while the UI acceptance wording promises unchanged row sizing. README and VERIFICATION.md still cite the earlier 56-test run.
- `npm.cmd run coverage` passed all 57 tests with 92.20% line and 85.98% branch coverage. TypeScript with unused declarations enabled, production build, and all six live smoke scenarios passed. Native Go 1.27.4 passed both test packages with 92.8% statement coverage, vet, and build. The workflow passed actionlint. Chromium verified responsive layout, 44 px minimum key heights, and history focus and dismissal at 320×568 through 1440×900. The largest finite float64 also rendered correctly through the live API. Screen-reader output was not tested.
- No application, dependency, or workflow changes were made during the review.

## 2026-11-25 — Submission audit fixes

Tool — Codex (ChatGPT). Purpose — update the backend toolchain, preserve Equals focus, and refresh submission verification.

### Prompt

> Address the final audit findings before submission
> Update the Go toolchain to 1.27.4 and align the module, CI configuration and documentation
> Fix the keyboard focus issue when Equals triggers an API request, keep focus stable without allowing duplicate submissions
> Add a focused regression test for that behavior
> Update README.md, UI_SPEC.md and VERIFICATION.md to match the current implementation and test results
> Keep the existing architecture and calculation logic unchanged, avoid unnecesary refactoring
> Run the relevant tests, coverage, builds and browser smoke checks

### Outcome and checks

- Updated `backend/go.mod` to Go 1.27.4. CI already reads its version from that file. `actionlint` passed, and `govulncheck` returned zero findings on Go 1.27.4.
- Equals stays keyboard-focusable while its pending state is announced through `aria-disabled`. Repeat activation is rejected by the button and the existing request guard. The pending appearance keeps the focus outline visible. Added a Chromium regression that tabs to Equals, holds a real Go response, repeats keyboard activation, and verifies one POST and retained focus after completion.
- Clean `npm.cmd ci`, `npm.cmd run coverage`, and `npm.cmd run build` passed on Windows with Node 24.22.2. The suite passed 57 tests with 91.71% line and 85.81% branch coverage. All seven `npm.cmd run test:smoke` scenarios passed.
- With Go 1.27.4 on native Windows, module-wide tests and coverage, vet, and API build passed. Statement coverage was 92.8%. Updated README.md, UI_SPEC.md, and VERIFICATION.md. The audit changes have yet to run on GitHub-hosted Ubuntu.

## 2026-11-25 — Docker support review

Tool — Codex (ChatGPT). Purpose — review a two-service Docker Compose deployment before adding container files.

### Prompt

> Review adding Docker support before submission
>
> I want a simple production-like setup using multi stage builds for Go and React, Nginx for the frontend and Docker Compose for both services
>
> Keep the API accessible through /api on the same origin, without changing application code or adding unnecessary dependencies
>
> Review the Dockerfile structure, networking, port configuration, health checks and .dockerignore files
>
> The goal is to run the complete app with docker compose up --build from a fresh clone
>
> Check if this approach fits the current architecture and suggest any improvements before implementation

### Outcome and checks

- React already calls `/api/calculate` relatively. Go binds to `127.0.0.1:8080`, so a normal bridge-network service hostname cannot reach the API. Recommended letting the API join the Nginx service network namespace via `network_mode: service:frontend`, publishing only Nginx on host port 8088, and forwarding `/api/` to shared loopback without rewriting the path. This preserves application code and couples the two services' network lifecycle. [Docker networking](https://docs.docker.com/engine/network/#container-networks) · [Nginx proxy behavior](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)
- Recommended separate build contexts, a Go 1.27.4 builder with a small non-root runtime, and a Node 24 builder using `npm ci` and `npm run build` with an unprivileged Nginx static runtime. Each context gets its own .dockerignore. Exclude generated output and local files while keeping the lockfile and build inputs.
- Use a frontend GET readiness probe and a backend POST readiness probe against the existing calculate route. Verify a clean Compose build by checking the UI and running the real browser smoke suite against port 8088. Docker Compose v5.7.0 was present, but the CLI could not connect to the Docker engine. No images were built and no deployment or application files were changed.

## 2026-11-25 — Docker Compose implementation

Tool — Codex (ChatGPT). Purpose — package the Go API and production React build with standard Compose service networking.

### Prompt

> Implement Docker Compose using standard service networking
>
> Make the Go listen address configurable, keep localhost as default and use 0.0.0.0 inside Docker
>
> Use multi stage builds for Go and React, serve the frontend with Nginx and proxy /api to backend:8080
>
> Expose only the frontend port, keep the backend internal
>
> Add Dockerfiles, compose.yaml, Nginx config and .dockerignore files
>
> Keep the setup simple without changing calculation logic
>
> Validate Compose and test the full stack if Docker Engine is available

### Outcome and checks

- Added separate multi-stage Go and React images, scoped .dockerignore files, an Nginx configuration, and compose.yaml. Go reads `CALCULATOR_ADDR`, defaulting to `127.0.0.1:8080`. Compose sets `0.0.0.0:8080` on the backend and publishes only Nginx at `127.0.0.1:8088`. Nginx preserves the API path and proxies to `backend:8080` over the default Compose network. Calculation logic was unchanged.
- Started the installed Docker Desktop Linux engine. `docker compose config --quiet` and `docker compose up --build -d --wait` passed with a temporary project. Both services were healthy, inspection confirmed the backend port was unpublished, and a same-origin POST returned 40 for 25 + 15. All seven `npm.cmd run test:smoke -- http://127.0.0.1:8088` scenarios passed. Stopped and removed the temporary verification containers and network.
- Go 1.27.4 tests, coverage, and vet passed. Overall coverage was 90.8% after adding startup configuration statements. Arithmetic and HTTP package coverage remained 90.9% and 96.1%. Native Windows and Linux API builds passed. A direct run with `CALCULATOR_ADDR=127.0.0.1:18080` returned 3 for 1 + 2. The local React build passed. Updated the README and verification report.
