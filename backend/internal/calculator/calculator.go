package calculator

import (
	"errors"
	"math"
)

var ErrNonFiniteResult = errors.New("the calculation exceeds the supported number range")
var ErrDivisionByZero = errors.New("division by zero is not allowed")

func Add(a, b float64) (float64, error) {
	return checkedResult(a + b)
}

func Subtract(a, b float64) (float64, error) {
	return checkedResult(a - b)
}

func Multiply(a, b float64) (float64, error) {
	return checkedResult(a * b)
}

func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return checkedResult(a / b)
}

func checkedResult(result float64) (float64, error) {
	if math.IsInf(result, 0) || math.IsNaN(result) {
		return 0, ErrNonFiniteResult
	}
	return result, nil
}
