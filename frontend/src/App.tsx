import styles from './App.module.css'
import { Calculator } from './calculator/Calculator'

export function App() {
  return (
    <main className={styles.page}>
      <h1>Calculator</h1>
      <Calculator />
    </main>
  )
}
