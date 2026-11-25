import type { CalculatorAction } from './calculatorReducer'
import styles from './CalculatorKeypad.module.css'

type Props = {
  loading: boolean
  onAction: (action: CalculatorAction) => void
}

export function CalculatorKeypad({ loading, onAction }: Props) {
  const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0']

  return (
    <div className={styles.keypad}>
      <button type="button" className={styles.utility} onClick={() => onAction({ type: 'clear' })} aria-label="Clear">C</button>
      <button type="button" className={styles.utility} disabled={loading} onClick={() => onAction({ type: 'sign' })} aria-label="Toggle sign">±</button>
      <button type="button" className={styles.utility} disabled={loading} onClick={() => onAction({ type: 'backspace' })} aria-label="Backspace">⌫</button>
      <button type="button" className={`${styles.operator} ${styles.add}`} disabled={loading} onClick={() => onAction({ type: 'add' })} aria-label="Add">+</button>
      <button type="button" className={`${styles.operator} ${styles.subtract}`} disabled={loading} onClick={() => onAction({ type: 'subtract' })} aria-label="Subtract">−</button>
      <button type="button" className={`${styles.operator} ${styles.multiply}`} disabled={loading} onClick={() => onAction({ type: 'multiply' })} aria-label="Multiply">×</button>
      <button type="button" className={`${styles.operator} ${styles.divide}`} disabled={loading} onClick={() => onAction({ type: 'divide' })} aria-label="Divide">÷</button>
      {digits.map(digit => (
        <button
          key={digit}
          type="button"
          className={digit === '0' ? styles.zero : undefined}
          disabled={loading}
          onClick={() => onAction({ type: 'digit', digit })}
        >
          {digit}
        </button>
      ))}
      <button type="button" disabled={loading} onClick={() => onAction({ type: 'decimal' })} aria-label="Decimal point">.</button>
      <button type="button" className={styles.equals} disabled={loading} onClick={() => onAction({ type: 'equals' })} aria-label="Equals">=</button>
    </div>
  )
}
