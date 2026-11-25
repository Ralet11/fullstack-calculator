import { useEffect, useReducer, useRef, useState } from 'react'
import { requestCalculation, type CalculationRequest } from './calculatorApi'
import { calculatorReducer, initialState, type CalculatorAction, type Operation } from './calculatorReducer'

const loadingDelay = 250

type Evaluation = { request: CalculationRequest; result: number | null }

export function useCalculator(onEvaluated: (request: CalculationRequest, result: number) => void) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [showLoading, setShowLoading] = useState(false)
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
    setEvaluation({ request: calculation, result: null })
    dispatch({ type: 'requestStarted' })

    const loadingTimer = window.setTimeout(() => {
      if (activeRequest.current === request) setShowLoading(true)
    }, loadingDelay)
    const stopLoadingTimer = () => window.clearTimeout(loadingTimer)
    request.signal.addEventListener('abort', stopLoadingTimer, { once: true })

    try {
      const result = await requestCalculation(calculation, request.signal)
      if (activeRequest.current === request) {
        setEvaluation({ request: calculation, result })
        onEvaluated(calculation, result)
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
      stopLoadingTimer()
      request.signal.removeEventListener('abort', stopLoadingTimer)
      if (activeRequest.current === request) {
        activeRequest.current = null
        setShowLoading(false)
      }
    }
  }

  function send(action: CalculatorAction) {
    if (action.type === 'clear') {
      const request = activeRequest.current
      activeRequest.current = null
      request?.abort()
      setEvaluation(null)
      setShowLoading(false)
      dispatch({ type: 'clear' })
      return
    }

    if (activeRequest.current || state.loading) return

    switch (action.type) {
      case 'digit':
      case 'paste':
      case 'decimal':
      case 'sign':
      case 'backspace':
      case 'togglePercentage':
        if (evaluation?.result === null || (action.type === 'sign' && state.result !== null)) {
          setEvaluation(null)
        }
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

  return { state, send, evaluation, showLoading }
}
