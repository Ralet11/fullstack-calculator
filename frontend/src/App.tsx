import { useState } from 'react'
import styles from './App.module.css'
import { Calculator } from './calculator/Calculator'
import type { CalculatorSize } from './calculator/CalculatorHeader'

export function App() {
  const [size, setSize] = useState<CalculatorSize>('Default')

  return (
    <main className={styles.page} data-size={size}>
      <h1>Calculator</h1>
      <Calculator size={size} onSizeChange={setSize} />
    </main>
  )
}
