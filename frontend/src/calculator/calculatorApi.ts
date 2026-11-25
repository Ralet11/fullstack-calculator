import type { Operation } from './calculatorReducer'

export async function requestCalculation(operation: Operation, a: number, b: number, signal: AbortSignal): Promise<number> {
  let response: Response
  try {
    response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, a, b }),
      signal,
    })
  } catch {
    throw new Error('Could not reach the calculator API. Try again.')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('The calculator API returned an invalid response. Try again.')
  }

  if (!response.ok) {
    if (
      typeof body === 'object' && body !== null && 'error' in body &&
      typeof body.error === 'object' && body.error !== null && 'message' in body.error &&
      typeof body.error.message === 'string' && body.error.message.trim()
    ) {
      throw new Error(body.error.message)
    }
    throw new Error('The calculation failed. Try again.')
  }

  if (
    typeof body !== 'object' || body === null || !('result' in body) ||
    typeof body.result !== 'number' || !Number.isFinite(body.result)
  ) {
    throw new Error('The calculator API returned an invalid result. Try again.')
  }
  return body.result
}
