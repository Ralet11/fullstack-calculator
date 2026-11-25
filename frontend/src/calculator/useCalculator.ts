import { useEffect, useReducer, useRef } from 'react'
import { requestCalculation, type CalculationRequest } from './calculatorApi'
import { calculatorReducer, initialState, type CalculatorAction, type Operation } from './calculatorReducer'

export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      const request = activeRequest.current
      activeRequest.current = null
      request?.abort()
    }
  }, [])

  async function calculate(calculation: CalculationRequest, nextOperation: Operation | null = null) {
    const request = new AbortController()
    activeRequest.current = request
    dispatch({ type: 'requestStarted' })

    try {
      const result = await requestCalculation(calculation, request.signal)
      if (activeRequest.current === request) {
        dispatch(calculation.operation === 'sqrt'
          ? { type: 'unarySucceeded', result }
          : { type: 'requestSucceeded', result, nextOperation })
      }
    } catch (error) {
      if (activeRequest.current === request) {
        const message = error instanceof Error ? error.message : 'The calculation failed. Try again.'
        dispatch({ type: 'requestFailed', message })
      }
    } finally {
      if (activeRequest.current === request) activeRequest.current = null
    }
  }

  function send(action: CalculatorAction) {
    if (action.type === 'clear') {
      const request = activeRequest.current
      activeRequest.current = null
      request?.abort()
      dispatch({ type: 'clear' })
      return
    }

    if (activeRequest.current || state.loading) return

    switch (action.type) {
      case 'digit':
      case 'decimal':
      case 'sign':
      case 'backspace':
      case 'togglePercentage':
        dispatch(action)
        return
    }

    const { entry, pending, result } = state
    if (action.type === 'equals' && pending === null) return

    const nextOperation = action.type === 'equals' || action.type === 'sqrt' ? null : action.type
    if (entry === '' && result === null) {
      if (pending !== null && nextOperation !== null && nextOperation !== pending.operation) {
        dispatch({ type: 'setPending', pending: { ...pending, operation: nextOperation } })
      }
      return
    }

    const value = result ?? Number(entry)
    if (entry === '-' || entry.endsWith('.') || !Number.isFinite(value)) {
      dispatch({ type: 'requestFailed', message: 'Enter a complete number within the supported range.' })
      return
    }

    if (action.type === 'sqrt') {
      void calculate({ operation: 'sqrt', a: value })
    } else if (pending !== null) {
      void calculate({
        operation: pending.operation,
        a: pending.left,
        b: value,
        ...(pending.percentage ? { percentage: true } : {}),
      }, nextOperation)
    } else if (nextOperation !== null) {
      dispatch({ type: 'setPending', pending: { left: value, operation: nextOperation } })
    }
  }

  return { state, send }
}
