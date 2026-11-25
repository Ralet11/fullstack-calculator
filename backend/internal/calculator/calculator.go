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

type InvalidPowerError string

func (err InvalidPowerError) Error() string {
	return string(err)
}

func Power(base, exponent float64) (float64, error) {
	if base == 0 && exponent < 0 {
		return 0, InvalidPowerError("Zero cannot be raised to a negative exponent.")
	}
	if base < 0 && exponent != math.Trunc(exponent) {
		return 0, InvalidPowerError("A negative base requires an integer exponent.")
	}
	return checkedResult(math.Pow(base, exponent))
}

func checkedResult(result float64) (float64, error) {
	if math.IsInf(result, 0) || math.IsNaN(result) {
		return 0, ErrNonFiniteResult
	}
	return result, nil
}
