import { useEffect, useRef, type MouseEvent } from 'react'
import { CalculatorDisplay } from './CalculatorDisplay'
import { CalculatorKeypad } from './CalculatorKeypad'
import type { CalculatorAction, Operation } from './calculatorReducer'
import { useCalculator } from './useCalculator'
import styles from './Calculator.module.css'

const keyboardActions: Record<string, CalculatorAction | undefined> = {
  '+': { type: 'add' },
  '-': { type: 'subtract' },
  '*': { type: 'multiply' },
  '/': { type: 'divide' },
  '.': { type: 'decimal' },
  '=': { type: 'equals' },
  Enter: { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
}

const operationSymbols: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
}

function formatNumber(value: number): string {
  const rounded = Number(value.toPrecision(12))
  const magnitude = Math.abs(rounded)
  return magnitude >= 1e12 || (magnitude > 0 && magnitude < 1e-6)
    ? rounded.toExponential()
    : String(rounded)
}

export function Calculator() {
  const { state, send } = useCalculator()
  const display = useRef<HTMLOutputElement>(null)

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
      if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return

      const action = /^[0-9]$/.test(event.key)
        ? { type: 'digit' as const, digit: event.key }
        : keyboardActions[event.key]
      if (!action) return

      event.preventDefault()
      send(action)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [send])

  function focusDisplayAfterPointerClick(event: MouseEvent<HTMLElement>) {
    if (event.detail > 0 && event.target instanceof Element && event.target.closest('button')) {
      display.current?.focus({ preventScroll: true })
    }
  }

  const pending = state.pending
    ? `${formatNumber(state.pending.left)} ${operationSymbols[state.pending.operation]}`
    : ''
  const value = state.entry || formatNumber(state.result ?? state.pending?.left ?? 0)

  return (
    <section className={styles.calculator} aria-label="Calculator" onClick={focusDisplayAfterPointerClick}>
      <CalculatorDisplay ref={display} value={value} pending={pending} loading={state.loading} error={state.error} />
      <CalculatorKeypad loading={state.loading} onAction={send} />
      <p className={styles.hint}><kbd>Enter</kbd> calculate · <kbd>Esc</kbd> clear</p>
    </section>
  )
}
