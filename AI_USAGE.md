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
