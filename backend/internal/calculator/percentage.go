package calculator

import (
	"errors"
	"math/big"
)

func Percentage(operation string, base, percent float64) (float64, error) {
	value := new(big.Rat).SetFloat64(base)
	rate := new(big.Rat).SetFloat64(percent)
	if value == nil || rate == nil {
		return 0, ErrNonFiniteResult
	}

	// Keep the intermediates exact for the received float64 operands so only the final result rounds.
	rate.Quo(rate, big.NewRat(100, 1))
	switch operation {
	case "add":
		value.Mul(value, rate.Add(big.NewRat(1, 1), rate))
	case "subtract":
		value.Mul(value, rate.Sub(big.NewRat(1, 1), rate))
	case "multiply", "percentage":
		value.Mul(value, rate)
	case "divide":
		if rate.Sign() == 0 {
			return 0, ErrDivisionByZero
		}
		value.Quo(value, rate)
	default:
		return 0, errors.New("unsupported percentage operation")
	}
	result, _ := value.Float64()
	return checkedResult(result)
}
