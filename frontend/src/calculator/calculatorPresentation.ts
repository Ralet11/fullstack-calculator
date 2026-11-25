import type { CalculationRequest } from './calculatorApi'
import type { Operation } from './calculatorReducer'

const operationSymbols: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  percentage: '×',
}

export function formatNumber(value: number): string {
  const rounded = Number(value.toPrecision(12))
  const magnitude = Math.abs(rounded)
  return magnitude >= 1e12 || (magnitude > 0 && magnitude < 1e-6)
    ? rounded.toExponential()
    : String(rounded)
}

function formatOperand(value: number): string {
  return Object.is(value, -0) ? '-0' : formatNumber(value)
}

export function formatPendingExpression(operation: Operation, left: number, right: string, percentage = false): string {
  const base = formatOperand(left)
  const a = operation === 'power' && base.startsWith('-') ? '(' + base + ')' : base
  const prefix = a + ' ' + operationSymbols[operation]
  if (!right) return prefix
  return prefix + ' ' + right + (right !== '-' && (percentage || operation === 'percentage') ? '%' : '')
}

export function formatRequestExpression(request: CalculationRequest): string {
  if (request.operation === 'sqrt') return '√(' + formatOperand(request.a) + ')'
  return formatPendingExpression(request.operation, request.a, formatOperand(request.b), request.percentage)
}
