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
