# Calculator

A React and TypeScript calculator with a Go JSON API. It supports addition, subtraction, multiplication, and division with negative and decimal operands. Mixed chains evaluate from left to right. Advanced mode adds square root, power, and a contextual `%` key.

## Run locally

Install Node.js (20.19+ within the 20.x line, or 22.12+) and Go 1.25 or later.

Start the API in one terminal.

```sh
cd backend
go run .
```

Start Vite in another terminal and open the URL it prints (normally `http://127.0.0.1:5173`).

```sh
cd frontend
npm ci
npm run dev
```

Vite proxies `/api` to the Go server at `http://127.0.0.1:8080`. A deployment of the frontend build should route `/api` to Go on the same origin.

## API

Send JSON to `POST /api/calculate`.

```sh
curl -H 'Content-Type: application/json' \
  --data '{"operation":"add","a":25,"b":15}' \
  http://127.0.0.1:8080/api/calculate
```

The response is HTTP 200 with `{"result":40}`. Send one JSON object containing an `operation` string. Operands must be finite JSON numbers.

| Operations | Operands | `percentage` modifier |
| --- | --- | --- |
| `add`, `subtract`, `multiply`, `divide` | `a` and `b` | Optional boolean. `true` treats `b` as a rate. Omit it or use `false` for ordinary arithmetic. |
| `power` | `a` is the base and `b` is the exponent | Omit |
| `percentage` | `a` is the base and `b` is the rate | Omit |
| `sqrt` | `a` only. Omit `b`. | Omit |

Invalid requests, including duplicate or unknown fields, return HTTP 400 with `INVALID_REQUEST`. Calculation errors return HTTP 422. Division by either sign of zero returns `{"error":{"code":"DIVISION_BY_ZERO","message":"Division by zero is not allowed."}}`. Overflow uses `NON_FINITE_RESULT`. A negative base with a fractional exponent or zero with a negative exponent uses `INVALID_POWER`. A negative square root operand uses `INVALID_SQRT`. For example, `{"operation":"power","a":2,"b":3}` returns `{"result":8}` and `{"operation":"sqrt","a":81}` returns `{"result":9}`.

For 20% of 150, enter `150 × 20`, press **%**, and evaluate. The API receives `{"operation":"multiply","a":150,"b":20,"percentage":true}` and returns `{"result":30}`. API clients can also send `{"operation":"percentage","a":150,"b":20}` for the same result. For `150 + 20%`, press **%** after entering `20`. Evaluation sends `{"operation":"add","a":150,"b":20,"percentage":true}` and returns `{"result":180}`.

## Tests and coverage

From `frontend/`, install dependencies from the lockfile, run the React suite with coverage, and check the production build.

```sh
npm ci
npm run coverage
npm run build
```

Frontend coverage is printed in the terminal and written to `frontend/coverage/index.html`. From `backend/`:

```sh
go test -count=1 -coverpkg=./... '-coverprofile=coverage.out' ./...
go tool cover '-func=coverage.out'
go vet ./...
go build -o calculator-api .
```

On pull requests and pushes to `main`, GitHub Actions runs both sets of checks in separate Ubuntu jobs. The frontend uses Node 24 and the backend uses the version in `backend/go.mod`. Run the browser smoke test separately with both services running. [CI workflow](.github/workflows/backend.yml)

The local assessment run passed 56 React tests with 91.78% line and 85.54% branch coverage. The Go suite reported 92.8% statement coverage. See the [assessment verification report](docs/VERIFICATION.md) for toolchain details and browser results.

## Browser smoke test

Start the Go API and Vite using the [local setup commands](#run-locally). Then run these commands in another terminal from `frontend/`.

```sh
npx playwright-core install --only-shell chromium
npm run test:smoke
```

The script drives Chromium through the running React app and checks the real Go responses for `1 ÷ 3 × 3 = 1`, correction of `8 ÷ 0` to `8 ÷ 2 = 4`, correction of `150 ÷ 0%` to `150 ÷ 20% = 750` with mode switches, and `150 × 20% = 30`. It uses `http://127.0.0.1:5173` by default. If Vite uses another port, pass its URL with `npm run test:smoke -- http://127.0.0.1:5174`. On Linux, `npx playwright-core install --with-deps --only-shell chromium` also installs the browser's system dependencies.

## Design

- React owns the calculator interaction. A pure reducer manages input and transitions. The hook issues requests through native `fetch`; Clear aborts the request and invalidates any response that still arrives.
- The Go HTTP handler validates JSON before calling the arithmetic function. Go uses float64, so decimal arithmetic can round. The display shows up to 12 significant digits, while chaining uses the full returned number.
- Additional operations can extend the calculation package and keypad interaction while retaining the separation between UI, state, transport, and arithmetic.

## AI usage

See the [AI usage log](AI_USAGE.md) for prompts, decisions, and verification results.
