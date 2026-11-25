import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import type { CalculationRequest } from './calculatorApi'
import type { CalculatorSize } from './CalculatorHeader'
import styles from './CalculatorDisplay.module.css'

type Props = {
  ref: RefObject<HTMLOutputElement | null>
  size: CalculatorSize
  value: string
  animationRequest: CalculationRequest | null
  typing: boolean
  announcedResult: string | null
  expression: string
  showLoading: boolean
  error: string | null
}

export function CalculatorDisplay({ ref, size, value, animationRequest, typing, announcedResult, expression, showLoading, error }: Props) {
  useLayoutEffect(() => {
    const output = ref.current
    if (output) output.scrollLeft = typing ? output.scrollWidth : 0
  }, [ref, size, typing, value])

  const playedRequest = useRef<CalculationRequest | null>(null)

  useLayoutEffect(() => {
    if (!animationRequest || animationRequest === playedRequest.current) return
    playedRequest.current = animationRequest
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const animation = ref.current?.animate?.(
      [{ opacity: 0.9, transform: 'translateY(2px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 200, easing: 'ease-out' },
    )
    return () => animation?.cancel()
  }, [animationRequest, ref])

  const expressionRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const line = expressionRef.current
    if (line) line.scrollLeft = line.scrollWidth
  }, [expression, size])

  const valueClass = [styles.value, typing && styles.entry, value.length <= 10 && styles.shortValue]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.display}>
      <div className={styles.header}>
        <div
          ref={expressionRef}
          className={styles.expression}
          role="group"
          aria-label="Calculation expression"
          aria-hidden={!expression}
          tabIndex={expression ? 0 : undefined}
        >
          {expression}
        </div>
        <span className={styles.activity} role="status">
          {showLoading && (
            <>
              <span className={styles.activityDots} aria-hidden="true" />
              <span className={styles.visuallyHidden}>Calculating…</span>
            </>
          )}
        </span>
      </div>
      <output
        ref={ref}
        className={valueClass}
        style={size === 'Large' ? { '--large-value-length': value.length } as CSSProperties : undefined}
        aria-label="Calculator display"
        aria-live="off"
        tabIndex={0}
      >
        {value}
      </output>
      <div role="status" aria-label="Calculation result" className={styles.visuallyHidden}>{announcedResult === null ? '' : 'Result: ' + announcedResult}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
