import { useEffect, useReducer, useRef } from 'react'
import { requestCalculation } from './calculatorApi'
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

  async function calculate(operation: Operation, a: number, b: number, nextOperation: Operation | null) {
    const request = new AbortController()
    activeRequest.current = request
    dispatch({ type: 'requestStarted' })

    try {
      const result = await requestCalculation(operation, a, b, request.signal)
      if (activeRequest.current === request) {
        dispatch({ type: 'requestSucceeded', result, nextOperation })
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
        dispatch(action)
        return
    }

    const { pending } = state
    const nextOperation = action.type === 'equals' ? null : action.type
    if (nextOperation === null && pending === null) return

    if (state.entry === '') {
      const left = pending?.left ?? state.result
      if (nextOperation !== null && nextOperation !== pending?.operation && left !== null) {
        dispatch({ type: 'setPending', pending: { left, operation: nextOperation } })
      }
      return
    }

    const value = Number(state.entry)
    if (state.entry === '-' || state.entry.endsWith('.') || !Number.isFinite(value)) {
      dispatch({ type: 'requestFailed', message: 'Enter a complete number within the supported range.' })
      return
    }

    if (pending !== null) {
      void calculate(pending.operation, pending.left, value, nextOperation)
    } else if (nextOperation !== null) {
      dispatch({ type: 'setPending', pending: { left: value, operation: nextOperation } })
    }
  }

  return { state, send }
}
