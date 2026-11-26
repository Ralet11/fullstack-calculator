import { Fragment, useId } from 'react'
import { CalculatorAdvanced, percentageDescription } from './CalculatorAdvanced'
import type { CalculatorAction } from './calculatorReducer'
import styles from './CalculatorKeypad.module.css'

type Props = {
  advanced: boolean
  percentageMarked: boolean
  equalsUnavailable: boolean
  helpId: string
  onAction: (action: CalculatorAction) => void
}

const advancedNumberRows = [
  { digits: ['7', '8', '9'], operation: 'multiply', label: 'Multiply', symbol: '×' },
  { digits: ['4', '5', '6'], operation: 'subtract', label: 'Subtract', symbol: '−' },
  { digits: ['1', '2', '3'], operation: 'add', label: 'Add', symbol: '+' },
] as const

const standardNumberRows = [
  { digits: ['7', '8', '9'], operation: 'divide', label: 'Divide', symbol: '÷' },
  { ...advancedNumberRows[0], digits: ['4', '5', '6'] },
  { ...advancedNumberRows[1], digits: ['1', '2', '3'] },
] as const

export function CalculatorKeypad({ advanced, equalsUnavailable, percentageMarked, helpId, onAction }: Props) {
  const percentageHint = useId()
  const numberRows = advanced ? advancedNumberRows : standardNumberRows
  return (
    <div className={styles.keypad} data-calculator-keys>
      <div className={advanced ? styles.entryControls : styles.entryControls + ' ' + styles.standardEntryControls}>
        <button type="button" className={styles.clearEntry} onClick={() => onAction({ type: 'clearEntry' })} aria-label="Clear entry">CE</button>
        <button type="button" className={styles.utility} onClick={() => onAction({ type: 'clear' })} aria-label="Clear">C</button>
        {advanced && (
          <>
            <button type="button" className={styles.advancedKey} aria-label="Contextual percentage" aria-describedby={percentageHint} aria-pressed={percentageMarked} onClick={() => onAction({ type: 'togglePercentage' })}>%</button>
            <span id={percentageHint} hidden>{percentageDescription}</span>
          </>
        )}
        <button type="button" className={styles.backspace} onClick={() => onAction({ type: 'backspace' })} aria-label="Backspace">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-7-7 7-7Z" />
            <path d="m11.25 9.25 5.5 5.5m0-5.5-5.5 5.5" />
          </svg>
        </button>
      </div>
      {advanced && (
        <>
          <div className={styles.advancedOperations}>
            <CalculatorAdvanced keyClassName={styles.advancedKey} helpId={helpId} onAction={onAction} />
          </div>
          <button type="button" className={styles.operator} onClick={() => onAction({ type: 'divide' })} aria-label="Divide">÷</button>
        </>
      )}
      {numberRows.map(({ digits, operation, label, symbol }) => (
        <Fragment key={operation}>
          {digits.map(digit => (
            <button key={digit} type="button" onClick={() => onAction({ type: 'digit', digit })}>
              {digit}
            </button>
          ))}
          <button type="button" className={styles.operator} onClick={() => onAction({ type: operation })} aria-label={label}>
            {symbol}
          </button>
        </Fragment>
      ))}
      <button type="button" className={styles.utility} onClick={() => onAction({ type: 'sign' })} aria-label="Toggle sign">±</button>
      <button type="button" onClick={() => onAction({ type: 'digit', digit: '0' })}>0</button>
      <button type="button" onClick={() => onAction({ type: 'decimal' })} aria-label="Decimal point">.</button>
      {!advanced && <button type="button" className={styles.operator} onClick={() => onAction({ type: 'add' })} aria-label="Add">+</button>}
      <button
        type="button"
        className={advanced ? styles.equals : styles.equals + ' ' + styles.wideEquals}
        aria-disabled={equalsUnavailable}
        aria-label="Equals"
        onClick={event => {
          if (equalsUnavailable) {
            event.stopPropagation()
            return
          }
          onAction({ type: 'equals' })
        }}
      >
        =
      </button>
    </div>
  )
}
