package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculate(t *testing.T) {
	for _, test := range []struct {
		name, body string
		want       float64
	}{
		{"add whole numbers", `{"operation":"add","a":25,"b":15}`, 40},
		{"add negative decimal", `{"operation":"add","a":-2.5,"b":4,"percentage":false}`, 1.5},
		{"add zero", `{"operation":"add","a":0,"b":0}`, 0},
		{"subtract to a negative result", `{"operation":"subtract","a":5,"b":10}`, -5},
		{"subtract decimals", `{"operation":"subtract","a":10.5,"b":2.3,"percentage":false}`, 8.2},
		{"subtract negative operand", `{"operation":"subtract","a":0,"b":-3}`, 3},
		{"multiply positive operands", `{"operation":"multiply","a":12,"b":5}`, 60},
		{"multiply negative decimals", `{"operation":"multiply","a":-2.5,"b":4}`, -10},
		{"multiply by zero", `{"operation":"multiply","a":-7,"b":0}`, 0},
		{"divide decimal operands", `{"operation":"divide","a":-7.5,"b":2.5,"percentage":false}`, -3},
		{"divide without rounding quotient", `{"operation":"divide","a":1,"b":3}`, 0.3333333333333333},
		{"zero dividend", `{"operation":"divide","a":0,"b":5}`, 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			recorder := sendRequest(http.MethodPost, "application/json; charset=utf-8", test.body)
			checkResponse(t, recorder, http.StatusOK)

			var body map[string]float64
			if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			got, present := body["result"]
			if !present || len(body) != 1 || got != test.want {
				t.Fatalf("response = %v; want result %g", body, test.want)
			}
		})
	}
}

func TestCalculateRejectsInvalidBodies(t *testing.T) {
	for _, test := range []struct {
		name, body string
	}{
		{"malformed", `{"operation":"add",`},
		{"array", `[]`},
		{"multiple values", `{"operation":"add","a":2,"b":3} {}`},
		{"unknown field", `{"operation":"add","a":2,"b":3,"extra":4}`},
		{"incorrect field case", `{"operation":"add","A":2,"b":3}`},
		{"missing operation", `{"a":2,"b":3}`},
		{"invalid operation type", `{"operation":1,"a":2,"b":3}`},
		{"unsupported operation", `{"operation":"power","a":2,"b":3}`},
		{"missing left", `{"operation":"add","b":3}`},
		{"missing right", `{"operation":"add","a":2}`},
		{"string operand", `{"operation":"add","a":2,"b":"3"}`},
		{"boolean operand", `{"operation":"add","a":false,"b":3}`},
		{"null operand", `{"operation":"add","a":2,"b":null}`},
		{"out-of-range operand", `{"operation":"add","a":1e999,"b":3}`},
		{"contextual percentage deferred", `{"operation":"add","a":2,"b":3,"percentage":true}`},
		{"subtraction contextual percentage deferred", `{"operation":"subtract","a":2,"b":3,"percentage":true}`},
		{"subtraction missing right", `{"operation":"subtract","a":2}`},
		{"multiplication contextual percentage deferred", `{"operation":"multiply","a":2,"b":3,"percentage":true}`},
		{"division contextual percentage deferred", `{"operation":"divide","a":2,"b":3,"percentage":true}`},
		{"division missing divisor", `{"operation":"divide","a":2}`},
		{"division string divisor", `{"operation":"divide","a":2,"b":"0"}`},
		{"non-boolean modifier", `{"operation":"add","a":2,"b":3,"percentage":"false"}`},
		{"null modifier", `{"operation":"add","a":2,"b":3,"percentage":null}`},
		{"oversized body", `{"operation":"add","a":2,"b":3}` + strings.Repeat(" ", 4096)},
	} {
		t.Run(test.name, func(t *testing.T) {
			recorder := sendRequest(http.MethodPost, "application/json", test.body)
			checkError(t, recorder, http.StatusBadRequest, "INVALID_REQUEST")
		})
	}
}

func TestCalculateRejectsOverflow(t *testing.T) {
	for _, body := range []string{
		`{"operation":"add","a":1e308,"b":1e308}`,
		`{"operation":"subtract","a":1e308,"b":-1e308}`,
		`{"operation":"multiply","a":1e308,"b":2}`,
		`{"operation":"divide","a":1e308,"b":0.1}`,
	} {
		t.Run(body, func(t *testing.T) {
			recorder := sendRequest(http.MethodPost, "application/json", body)
			checkError(t, recorder, http.StatusUnprocessableEntity, "NON_FINITE_RESULT")
		})
	}
}

func TestCalculateRejectsDivisionByZero(t *testing.T) {
	for _, body := range []string{
		`{"operation":"divide","a":8,"b":0}`,
		`{"operation":"divide","a":8,"b":-0}`,
		`{"operation":"divide","a":0,"b":0}`,
	} {
		t.Run(body, func(t *testing.T) {
			recorder := sendRequest(http.MethodPost, "application/json", body)
			checkError(t, recorder, http.StatusUnprocessableEntity, "DIVISION_BY_ZERO")
		})
	}
}

func TestCalculateRejectsWrongContentType(t *testing.T) {
	recorder := sendRequest(http.MethodPost, "text/plain", `{"operation":"add","a":2,"b":3}`)
	checkError(t, recorder, http.StatusBadRequest, "INVALID_REQUEST")
}

func TestCalculateRejectsWrongMethod(t *testing.T) {
	recorder := sendRequest(http.MethodGet, "", "")
	checkError(t, recorder, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED")
	if got := recorder.Header().Get("Allow"); got != http.MethodPost {
		t.Errorf("Allow = %q; want POST", got)
	}
}

func sendRequest(method, contentType, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, "/api/calculate", strings.NewReader(body))
	request.Header.Set("Content-Type", contentType)
	recorder := httptest.NewRecorder()
	NewHandler().ServeHTTP(recorder, request)
	return recorder
}

func checkResponse(t *testing.T, recorder *httptest.ResponseRecorder, status int) {
	t.Helper()
	if recorder.Code != status || recorder.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("status = %d, headers = %v, body = %s", recorder.Code, recorder.Header(), recorder.Body)
	}
}

func checkError(t *testing.T, recorder *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	checkResponse(t, recorder, status)
	var body errorResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	if body.Error.Code != code || body.Error.Message == "" {
		t.Fatalf("error = %+v; want %s and a message", body.Error, code)
	}
}
