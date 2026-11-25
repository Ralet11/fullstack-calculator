import type { Ref } from 'react'
import styles from './CalculatorDisplay.module.css'

type Props = {
  ref: Ref<HTMLOutputElement>
  value: string
  pending: string
  loading: boolean
  error: string | null
}

export function CalculatorDisplay({ ref, value, pending, loading, error }: Props) {
  return (
    <div className={styles.display}>
      <div className={styles.header}>
        <span aria-label="Pending operation">{pending}</span>
        {loading && <span role="status">Calculating…</span>}
      </div>
      <output ref={ref} className={styles.value} aria-label="Calculator display" tabIndex={0}>{value}</output>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
