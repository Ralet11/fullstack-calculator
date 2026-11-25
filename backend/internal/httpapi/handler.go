package httpapi

import (
	"calculator/internal/calculator"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
)

type errorDetails struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error errorDetails `json:"error"`
}

type successResponse struct {
	Result float64 `json:"result"`
}

func NewHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/calculate", calculate)
	return mux
}

func calculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Use POST for this endpoint.")
		return
	}

	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Send the request as application/json.")
		return
	}

	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
	var fields map[string]json.RawMessage
	if err := decoder.Decode(&fields); err != nil || fields == nil || decoder.Decode(new(json.RawMessage)) != io.EOF {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Send a single valid JSON object.")
		return
	}

	for key := range fields {
		switch key {
		case "operation", "a", "b", "percentage":
		default:
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "The request contains an unrecognized field.")
			return
		}
	}

	var operation string
	if err := json.Unmarshal(fields["operation"], &operation); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Provide an operation as a JSON string.")
		return
	}
	var apply func(float64, float64) (float64, error)
	switch operation {
	case "add":
		apply = calculator.Add
	case "subtract":
		apply = calculator.Subtract
	case "multiply":
		apply = calculator.Multiply
	case "divide":
		apply = calculator.Divide
	case "power":
		apply = calculator.Power
	default:
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Supported operations are add, subtract, multiply, divide, and power.")
		return
	}

	a, hasA := readNumber(fields["a"])
	b, hasB := readNumber(fields["b"])
	if !hasA || !hasB {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Provide finite JSON numbers for a and b.")
		return
	}

	if percentage, present := fields["percentage"]; present {
		if operation == "power" {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Omit percentage for power.")
			return
		}
		if string(percentage) != "false" {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Omit percentage or set it to false.")
			return
		}
	}

	result, err := apply(a, b)
	if errors.Is(err, calculator.ErrDivisionByZero) {
		writeError(w, http.StatusUnprocessableEntity, "DIVISION_BY_ZERO", "Division by zero is not allowed.")
		return
	}
	if errors.Is(err, calculator.ErrNonFiniteResult) {
		writeError(w, http.StatusUnprocessableEntity, "NON_FINITE_RESULT", "The result exceeds the supported number range.")
		return
	}
	var invalidPower calculator.InvalidPowerError
	if errors.As(err, &invalidPower) {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_POWER", invalidPower.Error())
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "The calculation failed. Try again.")
		return
	}
	writeJSON(w, http.StatusOK, successResponse{Result: result})
}

func readNumber(raw json.RawMessage) (float64, bool) {
	var value *float64
	if err := json.Unmarshal(raw, &value); err != nil || value == nil {
		return 0, false
	}
	return *value, true
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorDetails{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
