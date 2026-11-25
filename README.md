# Calculator

A React and TypeScript calculator with a Go JSON API. It supports addition, subtraction, multiplication, and division with negative and decimal operands. Mixed chains evaluate from left to right. Advanced mode adds power with the `xʸ` button or `^` key.

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

The response is HTTP 200 with `{"result":40}`. The other operation names are `subtract`, `multiply`, and `divide`. Both operands are required and must be finite JSON numbers. For the four standard operations, the optional `percentage` field may be omitted or set to `false`. Omit it for power. Invalid input returns HTTP 400. Division by either sign of zero returns HTTP 422 with `{"error":{"code":"DIVISION_BY_ZERO","message":"Division by zero is not allowed."}}`. Overflow returns HTTP 422 with the code `NON_FINITE_RESULT`. For power, send `{"operation":"power","a":2,"b":3}` to get `{"result":8}`. A negative base with a fractional exponent or zero with a negative exponent returns HTTP 422 with `INVALID_POWER`.

## Tests and coverage

From `frontend/`:

```sh
npm test
npm run coverage
npm run build
```

Frontend coverage is also written to `frontend/coverage/index.html`. From `backend/`:

```sh
go test ./...
go test -coverpkg=./... -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
```

## Browser smoke test

Start the Go API and Vite using the [local setup commands](#run-locally). Then run these commands in another terminal from `frontend/`.

```sh
npx playwright-core install --only-shell chromium
npm run test:smoke
```

The script drives Chromium through the running React app and checks the real Go responses for `1 ÷ 3 × 3 = 1` and correction of `8 ÷ 0` to `8 ÷ 2 = 4`. It uses `http://127.0.0.1:5173` by default. If Vite uses another port, pass its URL with `npm run test:smoke -- http://127.0.0.1:5174`. On Linux, `npx playwright-core install --with-deps --only-shell chromium` also installs the browser's system dependencies.

## Design

- React owns the calculator interaction. A pure reducer manages input and transitions. The hook issues requests through native `fetch`; Clear aborts the request and invalidates any response that still arrives.
- The Go HTTP handler validates JSON before calling the arithmetic function. Go uses float64, so decimal arithmetic can round. The display shows up to 12 significant digits, while chaining uses the full returned number.
- Additional operations can extend the calculation package and keypad interaction while retaining the separation between UI, state, transport, and arithmetic.
