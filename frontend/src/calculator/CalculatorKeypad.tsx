import { Fragment } from 'react'
import { CalculatorAdvanced } from './CalculatorAdvanced'
import type { CalculatorAction } from './calculatorReducer'
import styles from './CalculatorKeypad.module.css'

type Props = {
  advanced: boolean
  percentageMarked: boolean
  loading: boolean
  onAction: (action: CalculatorAction) => void
}

const numberRows = [
  { digits: ['7', '8', '9'], operation: 'subtract', label: 'Subtract', symbol: '−' },
  { digits: ['4', '5', '6'], operation: 'multiply', label: 'Multiply', symbol: '×' },
  { digits: ['1', '2', '3'], operation: 'divide', label: 'Divide', symbol: '÷' },
] as const

export function CalculatorKeypad({ advanced, loading, percentageMarked, onAction }: Props) {
  return (
    <div className={styles.keypad} data-calculator-keys>
      {advanced && <CalculatorAdvanced keyClassName={styles.advancedKey} loading={loading} percentageMarked={percentageMarked} onAction={onAction} />}
      <button type="button" className={styles.utility} onClick={() => onAction({ type: 'clear' })} aria-label="Clear">C</button>
      <button type="button" className={styles.utility} disabled={loading} onClick={() => onAction({ type: 'sign' })} aria-label="Toggle sign">±</button>
      <button type="button" className={styles.utility} disabled={loading} onClick={() => onAction({ type: 'backspace' })} aria-label="Backspace">⌫</button>
      <button type="button" className={styles.operator} disabled={loading} onClick={() => onAction({ type: 'add' })} aria-label="Add">+</button>
      {numberRows.map(({ digits, operation, label, symbol }) => (
        <Fragment key={operation}>
          {digits.map(digit => (
            <button key={digit} type="button" disabled={loading} onClick={() => onAction({ type: 'digit', digit })}>
              {digit}
            </button>
          ))}
          <button type="button" className={styles.operator} disabled={loading} onClick={() => onAction({ type: operation })} aria-label={label}>
            {symbol}
          </button>
        </Fragment>
      ))}
      <button type="button" className={styles.zero} disabled={loading} onClick={() => onAction({ type: 'digit', digit: '0' })}>0</button>
      <button type="button" disabled={loading} onClick={() => onAction({ type: 'decimal' })} aria-label="Decimal point">.</button>
      <button type="button" className={styles.equals} disabled={loading} onClick={() => onAction({ type: 'equals' })} aria-label="Equals">=</button>
    </div>
  )
}
