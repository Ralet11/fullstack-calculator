package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestAdd(t *testing.T) {
	for _, test := range []struct {
		name string
		a, b float64
		want float64
	}{
		{"whole numbers", 25, 15, 40},
		{"negative decimal", -2.5, 4, 1.5},
		{"zero", -3, 0, -3},
		{"cancellation", 2, -2, 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, err := Add(test.a, test.b)
			if err != nil || got != test.want {
				t.Fatalf("Add(%g, %g) = %g, %v; want %g", test.a, test.b, got, err, test.want)
			}
		})
	}
}

func TestAddRejectsNonFiniteResults(t *testing.T) {
	for _, a := range []float64{math.MaxFloat64, -math.MaxFloat64, math.Inf(1), math.NaN()} {
		if _, err := Add(a, a); !errors.Is(err, ErrNonFiniteResult) {
			t.Errorf("Add(%g, %g) error = %v; want ErrNonFiniteResult", a, a, err)
		}
	}
}

func TestSubtract(t *testing.T) {
	for _, test := range []struct {
		name string
		a, b float64
		want float64
	}{
		{"positive numbers", 10, 5, 5},
		{"negative result", 5, 10, -5},
		{"negative left operand", -5, 2, -7},
		{"negative right operand", 5, -2, 7},
		{"decimal operands", 10.5, 2.3, 8.2},
		{"zero left operand", 0, 5, -5},
		{"zero right operand", 5, 0, 5},
		{"zero result", 5, 5, 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, err := Subtract(test.a, test.b)
			if err != nil || got != test.want {
				t.Fatalf("Subtract(%g, %g) = %g, %v; want %g", test.a, test.b, got, err, test.want)
			}
		})
	}
}

func TestSubtractRejectsOverflow(t *testing.T) {
	if _, err := Subtract(math.MaxFloat64, -math.MaxFloat64); !errors.Is(err, ErrNonFiniteResult) {
		t.Errorf("Subtract(MaxFloat64, -MaxFloat64) error = %v; want ErrNonFiniteResult", err)
	}
}

func TestMultiply(t *testing.T) {
	for _, test := range []struct {
		name string
		a, b float64
		want float64
	}{
		{"positive numbers", 12, 5, 60},
		{"negative decimal", -2.5, 4, -10},
		{"two negatives", -2, -3, 6},
		{"decimal operands", 1.5, 2.5, 3.75},
		{"zero factor", -7, 0, 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, err := Multiply(test.a, test.b)
			if err != nil || got != test.want {
				t.Fatalf("Multiply(%g, %g) = %g, %v; want %g", test.a, test.b, got, err, test.want)
			}
		})
	}
}

func TestMultiplyRejectsOverflow(t *testing.T) {
	if _, err := Multiply(1e308, 2); !errors.Is(err, ErrNonFiniteResult) {
		t.Errorf("Multiply(1e308, 2) error = %v; want ErrNonFiniteResult", err)
	}
}

func TestDivide(t *testing.T) {
	for _, test := range []struct {
		name string
		a, b float64
		want float64
	}{
		{"positive numbers", 8, 2, 4},
		{"negative dividend", -7.5, 2.5, -3},
		{"negative divisor", 7.5, -2.5, -3},
		{"repeating quotient", 1, 3, 0.3333333333333333},
		{"zero dividend", 0, 5, 0},
		{"small nonzero divisor", 1e-300, 1e-300, 1},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, err := Divide(test.a, test.b)
			if err != nil || got != test.want {
				t.Fatalf("Divide(%g, %g) = %g, %v; want %g", test.a, test.b, got, err, test.want)
			}
		})
	}
}

func TestDivideRejectsEitherSignOfZero(t *testing.T) {
	for _, test := range []struct {
		name string
		a, b float64
	}{
		{"positive zero divisor", 8, 0},
		{"negative zero divisor", 8, math.Copysign(0, -1)},
		{"zero divided by zero", 0, 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			if _, err := Divide(test.a, test.b); !errors.Is(err, ErrDivisionByZero) {
				t.Errorf("Divide(%g, %g) error = %v; want ErrDivisionByZero", test.a, test.b, err)
			}
		})
	}
}

func TestDivideRejectsOverflow(t *testing.T) {
	if _, err := Divide(1e308, 0.1); !errors.Is(err, ErrNonFiniteResult) {
		t.Errorf("Divide(1e308, 0.1) error = %v; want ErrNonFiniteResult", err)
	}
}

func TestPower(t *testing.T) {
	for _, test := range []struct {
		name           string
		base, exponent float64
		want           float64
	}{
		{"positive integer exponent", 2, 3, 8},
		{"zero to zero", 0, 0, 1},
		{"zero to positive exponent", 0, 2, 0},
		{"negative base with odd exponent", -2, 3, -8},
		{"negative base with even exponent", -2, 4, 16},
		{"positive base with fractional exponent", 4, 0.5, 2},
		{"nonzero base with negative exponent", 2, -3, 0.125},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, err := Power(test.base, test.exponent)
			if err != nil || got != test.want {
				t.Fatalf("Power(%g, %g) = %g, %v; want %g", test.base, test.exponent, got, err, test.want)
			}
		})
	}
}

func TestPowerRejectsInvalidRealPowers(t *testing.T) {
	for _, test := range []struct {
		name           string
		base, exponent float64
	}{
		{"negative base with fractional exponent", -2, 0.5},
		{"negative base just above an integer exponent", -2, math.Nextafter(2, 3)},
		{"zero with negative exponent", 0, -1},
		{"negative zero with negative exponent", math.Copysign(0, -1), -1},
	} {
		t.Run(test.name, func(t *testing.T) {
			var domainError InvalidPowerError
			if _, err := Power(test.base, test.exponent); !errors.As(err, &domainError) {
				t.Errorf("Power(%g, %g) error = %v; want InvalidPowerError", test.base, test.exponent, err)
			}
		})
	}
}

func TestPowerRejectsOverflow(t *testing.T) {
	if _, err := Power(1e308, 2); !errors.Is(err, ErrNonFiniteResult) {
		t.Errorf("Power(1e308, 2) error = %v; want ErrNonFiniteResult", err)
	}
}

func TestSqrt(t *testing.T) {
	for _, test := range []struct {
		name        string
		value, want float64
	}{
		{"perfect square", 81, 9},
		{"decimal", 0.25, 0.5},
		{"zero", 0, 0},
		{"negative zero", math.Copysign(0, -1), 0},
		{"irrational result", 2, math.Sqrt2},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, err := Sqrt(test.value)
			if err != nil || got != test.want {
				t.Fatalf("Sqrt(%g) = %g, %v; want %g", test.value, got, err, test.want)
			}
		})
	}
}

func TestSqrtRejectsNegativeOperand(t *testing.T) {
	if _, err := Sqrt(-1); !errors.Is(err, ErrInvalidSqrt) {
		t.Errorf("Sqrt(-1) error = %v; want ErrInvalidSqrt", err)
	}
}

func TestPercentage(t *testing.T) {
	for _, test := range []struct {
		name, operation     string
		base, percent, want float64
	}{
		{"direct", "percentage", 150, 20, 30},
		{"signed fractional rate", "percentage", 80, -12.5, -10},
		{"rate over 100", "percentage", 8, 150, 12},
		{"contextual addition", "add", 150, 20, 180},
		{"contextual subtraction", "subtract", 150, 20, 120},
		{"contextual multiplication", "multiply", 150, 20, 30},
		{"contextual division", "divide", 150, 20, 750},
		{"zero rate", "multiply", 150, 0, 0},
		{"zero base", "divide", 0, 20, 0},
		{"large finite direct result", "percentage", 1e308, 100, 1e308},
		{"finite after negative adjustment", "add", 1e308, -200, -1e308},
		{"finite after subtraction", "subtract", 1e308, 200, -1e308},
		{"tiny rate times a larger base", "multiply", 100, math.SmallestNonzeroFloat64, math.SmallestNonzeroFloat64},
		{"nonzero rate too small to scale in float64", "divide", math.SmallestNonzeroFloat64, math.SmallestNonzeroFloat64, 100},
		{"tiny dividend with a nonzero result", "divide", math.SmallestNonzeroFloat64, 50, 2 * math.SmallestNonzeroFloat64},
		{"final result rounds to zero", "percentage", math.SmallestNonzeroFloat64, 1, 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, err := Percentage(test.operation, test.base, test.percent)
			if err != nil || got != test.want {
				t.Fatalf("Percentage(%q, %g, %g) = %g, %v; want %g", test.operation, test.base, test.percent, got, err, test.want)
			}
		})
	}
}

func TestPercentageErrors(t *testing.T) {
	for _, test := range []struct {
		name, operation string
		base, percent   float64
		want            error
	}{
		{"zero divisor", "divide", 150, 0, ErrDivisionByZero},
		{"negative zero divisor", "divide", 150, math.Copysign(0, -1), ErrDivisionByZero},
		{"direct result overflow", "percentage", 1e308, 200, ErrNonFiniteResult},
		{"nonzero tiny divisor overflows", "divide", 1, math.SmallestNonzeroFloat64, ErrNonFiniteResult},
	} {
		t.Run(test.name, func(t *testing.T) {
			if _, err := Percentage(test.operation, test.base, test.percent); !errors.Is(err, test.want) {
				t.Errorf("Percentage(%q, %g, %g) error = %v; want %v", test.operation, test.base, test.percent, err, test.want)
			}
		})
	}
}
