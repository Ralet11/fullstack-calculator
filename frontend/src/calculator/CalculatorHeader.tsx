import { useEffect, useId, useRef, type RefObject } from 'react'
import styles from './CalculatorHeader.module.css'

const sizes = ['Compact', 'Default', 'Large'] as const
export type CalculatorSize = typeof sizes[number]

type Props = {
  advanced: boolean
  size: CalculatorSize
  onSizeChange: (size: CalculatorSize) => void
  menuOpen: boolean
  historyOpen: boolean
  historyId: string
  modesButton: RefObject<HTMLButtonElement | null>
  historyButton: RefObject<HTMLButtonElement | null>
  onMenuOpenChange: (open: boolean) => void
  onModeChange: (advanced: boolean) => void
  onHistoryToggle: () => void
}

export function CalculatorHeader({
  advanced, size, onSizeChange, menuOpen, historyOpen, historyId, modesButton, historyButton,
  onMenuOpenChange, onModeChange, onHistoryToggle,
}: Props) {
  const menuId = useId()
  const modeLabelId = useId()
  const modePicker = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function dismissOnOutsidePress(event: PointerEvent) {
      if (event.target instanceof Node && !modePicker.current?.contains(event.target)) {
        onMenuOpenChange(false)
      }
    }

    document.addEventListener('pointerdown', dismissOnOutsidePress)
    return () => document.removeEventListener('pointerdown', dismissOnOutsidePress)
  }, [menuOpen, onMenuOpenChange])

  function closeMenu() {
    onMenuOpenChange(false)
    modesButton.current?.focus({ preventScroll: true })
  }

  return (
    <header className={styles.header}>
      <div
        ref={modePicker}
        className={styles.modePicker}
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) onMenuOpenChange(false)
        }}
      >
        <button
          ref={modesButton}
          type="button"
          className={styles.modes}
          aria-label="Modes"
          aria-describedby={modeLabelId}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => {
            modesButton.current?.focus({ preventScroll: true })
            onMenuOpenChange(!menuOpen)
          }}
        >
          <span className={styles.hamburger} aria-hidden="true" />
          <span id={modeLabelId}>{advanced ? 'Advanced' : 'Standard'}</span>
        </button>
        <div id={menuId} className={styles.options} hidden={!menuOpen}>
          <div role="group" aria-label="Calculator modes">
            {([false, true] as const).map(isAdvanced => (
              <button key={String(isAdvanced)} type="button" aria-pressed={advanced === isAdvanced} onClick={() => {
                onModeChange(isAdvanced)
                closeMenu()
              }}>
                {isAdvanced ? 'Advanced' : 'Standard'}
                {advanced === isAdvanced && <span className={styles.check} aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
          <div className={styles.sizeOptions} role="group" aria-label="Calculator size">
            <p className={styles.optionsLabel}>Calculator size</p>
            {sizes.map(option => (
              <button key={option} type="button" aria-pressed={size === option} onClick={() => {
                onSizeChange(option)
                closeMenu()
              }}>
                {option}
                {size === option && <span className={styles.check} aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        ref={historyButton}
        type="button"
        className={styles.history}
        aria-expanded={historyOpen}
        aria-controls={historyId}
        onClick={onHistoryToggle}
      >
        <span className={styles.clock} aria-hidden="true" />
        History
      </button>
    </header>
  )
}
