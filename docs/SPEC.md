Calculator — Functional Specification

1. Objective
Build a responsive full-stack calculator with a React + TypeScript frontend and a Go REST API. The application should be intuitive, reliable, easy to test, and straightforward to extend without adding speculative features.

The implementation includes the four required arithmetic operations and the three optional operations. Correctness, tests, and documentation take priority over additional features.

2. Scope
Standard mode: addition (add), subtraction (subtract), multiplication (multiply), and division (divide).

Advanced mode: all Standard operations plus exponentiation (power), square root (sqrt), and a contextual % key. The API also supports direct percentage of a value (percentage).

Contextual percentage: the % key modifies the second operand of a pending addition, subtraction, multiplication, or division.

Both modes share the same calculator state and reusable UI elements. A database, authentication, expression parser, persistent history, and external mathematical services are out of scope.
3. Interaction and User Experience
The calculator uses sequential evaluation, not operator precedence:
- 25 → + → 15 → = displays 40.
- 10 → + → 5 → × → 2 → = displays 30 (evaluate 10 + 5 before × 2).
Behavior:
- = evaluates the pending operation. Repeated = keeps the result; it does not repeat the operation.
- Changing the operator before entering the second operand replaces the pending operator.
- Choosing another operator after entering the second operand evaluates the pending operation, then starts the next one.
- After =, entering a digit starts a new calculation; choosing an operator continues from the result.
- C clears all calculation state. Backspace edits the current input, and ± changes its sign.
- A number may contain at most one decimal point. The entry display supports zero, negative values, and decimals, including intermediate typing states such as - and 0.; incomplete entries cannot be submitted.
- Switching Standard/Advanced modes preserves the current calculation, including a pending operation.
- While an API request is pending, display a loading state and prevent a duplicate calculation. Clear and mode switching remain available.
- Clearing the calculation or starting a newer calculation invalidates outstanding responses so late HTTP results cannot overwrite the current state.
- On a mathematical or network error, show an understandable message and preserve the editable inputs so the user can correct or retry. Clear always remains available.
Keyboard: digits 0–9, ., +, -, *, /, Enter or = to calculate, Backspace to delete, and Escape to clear. Buttons must also work with mouse and touch. The interface must remain usable on narrow mobile screens, with readable results and visible keyboard focus.
In Advanced mode, the xʸ button and ^ key start a power operation. Switching to Standard mode hides the button and disables that shortcut while preserving any pending calculation.
The Advanced mode √ button applies square root immediately to the input or result. When a binary operation is pending, it applies to the entered right operand and preserves the pending operator. For example, 2 + 9 √ = displays 5. With no right operand entered, √ leaves the pending calculation alone and sends no request. On error, the operand remains editable.

4. Percentages
Use one % key in Advanced mode. To calculate 20% of 150, enter 150 → × → 20 → % → = to display 30.

The % button toggles a visible marker on the entered right operand of a pending add, subtract, multiply, or divide. It sends no request. Editing the operand, applying square root, or switching modes preserves the marker. Erasing the operand, clearing, or successfully evaluating the operation removes it. Evaluating a chain consumes one marker at a time, so 150 + 20% × 10% displays 18:
Input	Calculation	Result
150 + 20%	150 + (150 × 20 / 100)	180
150 - 20%	150 - (150 × 20 / 100)	120
150 × 20%	150 × (20 / 100)	30
150 ÷ 20%	150 ÷ (20 / 100)	750


Either sign of zero as the contextual divisor returns 422 with DIVISION_BY_ZERO. Zero is a valid rate for the other operations. Rates may be signed, fractional, or greater than 100. Percentage arithmetic preserves the supplied float64 values, uses exact intermediate calculations, and rounds the final result to float64. This avoids intermediate overflow and underflow. A final non-finite result returns 422 with NON_FINITE_RESULT.
% leaves the state alone when there is no eligible pending operation or complete right operand. A failed evaluation preserves the marker and keeps the right operand editable.

5. Backend and API
The Go backend owns the arithmetic and domain validation. React owns keystrokes, calculator interaction state, and rendering. HTTP handlers decode and validate requests, call a calculation service independent of HTTP, and return JSON. The API is stateless.

Endpoint: POST /api/calculate with Content-Type: application/json.

Standard request:
{"operation":"multiply","a":12,"b":5}
Success (200 OK):
{"result":60}
Square root is unary; b must be omitted:
{"operation":"sqrt","a":81}
Also omit percentage. A negative operand returns HTTP 422 with INVALID_SQRT and the message "Square root requires a non-negative number."
Direct percentage of a value via the API (two operands, a × b / 100):
{"operation":"percentage","a":150,"b":20}
Contextual percentage uses the existing arithmetic operation plus an optional boolean modifier:
{"operation":"add","a":150,"b":20,"percentage":true}
The result is 180. The percentage modifier defaults to false and must be a boolean when supplied. Only add, subtract, multiply, and divide accept it. Omit it for direct percentage, power, and square root. Do not introduce separate addPercentage-style operation identifiers.

All operations other than sqrt require both a and b; sqrt requires only a. Unrecognized fields, unsupported operations, strings or booleans in place of numeric operands, and inappropriate operand/modifier combinations are rejected.

Error example (422 Unprocessable Content):
{"error":{"code":"DIVISION_BY_ZERO","message":"Division by zero is not allowed."}}
Use 400 for malformed JSON or invalid request fields and 422 Unprocessable Content for a structurally valid calculation that cannot produce a finite real-number result (for example division by zero, sqrt(-1), invalid real powers, or overflow). Both use the same JSON error shape. Unexpected server failures return 500 with a generic error message. No error response should expose internal details.
Power takes a as the base and b as the exponent. Omit percentage on power requests. Non-integer exponents for negative bases and negative exponents for zero return 422 with INVALID_POWER and a message specific to the case. Overflow returns 422 with NON_FINITE_RESULT.

6. Numerical Rules and Edge Cases
- Use float64 for operands and results. Percentage operations use the intermediate precision described above. Keep the full returned numeric value for subsequent calculations; do not reuse the rounded display string.
- Display at most 12 significant digits, removing unnecessary trailing zeros and avoiding obvious floating-point artifacts: 0.1 + 0.2 should display 0.3. This formatting rule does not promise exact decimal arithmetic.
- Division by positive or negative zero is invalid.
- Square roots of negative values are invalid; sqrt(0) = 0.
- For this application, define 0^0 = 1. Reject powers with no finite real-number result, including negative bases raised to non-integer exponents and 0 raised to a negative exponent.
- Reject non-finite results rather than serializing NaN or infinity in JSON.
- Keep the implementation consistent for very large/small inputs, and document floating-point limitations. Financial-grade decimal precision is not in scope.

7. Testing and Acceptance Criteria
Automated tests are required for both layers, with reproducible coverage output.

Backend tests: all seven operations; direct and contextual percentages; negative/zero/decimal operands; 0^0; negative bases with fractional exponents; division by ±0; square roots of negative values; overflow/non-finite results; missing operands; incorrect JSON types; malformed JSON; unknown operations; correct HTTP status and response shape.

Frontend tests: entry and calculation via the API; sequential chaining; repeated equals; operator replacement; mode switching without losing state; contextual percentage interactions, including percentage of a value via multiplication; clear/backspace/sign/decimal keys; keyboard support; loading and errors; correction/retry; stale-response protection after Clear or a newer calculation.

Manual checks: basic mobile viewport without horizontal overflow, visible focus, readable results, and mouse/touch interaction.

Done means: the seven selected operations behave as specified, both applications can be run locally, relevant tests pass, coverage reports can be generated, and the README documents setup, execution, API examples, testing, and design choices. Do not claim completion based only on generated code.

8. Future Evolution (Documentation Only)
Document how the present separation of UI, interaction state, HTTP transport, and calculation logic would support future work such as:
- An expression parser with parentheses and operator precedence (new parser/evaluator and likely a new API contract).
- More scientific operations (additional calculation rules and tests).
- Persistent history (storage and retrieval).
- Higher-precision calculation (a revised numeric representation and contracts as needed).
- Higher traffic (deployment, observability, limits, and scaling review).
These are not part of the assessment implementation. The architecture should make changes manageable, not claim these features will require no changes.

9. Deliverables
- A Git repository containing the React/TypeScript frontend and Go backend.
- Unit tests for each layer and a coverage report or reproducible coverage commands.
- A README with setup, how to run both applications, REST examples, and design decisions/assumptions.
- An accurate record of AI prompts used during the project.
- A repository link for submission.
- Docker and a live demo are optional only after mandatory work is complete.
