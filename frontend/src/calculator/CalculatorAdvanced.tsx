import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import type { CalculatorAction } from './calculatorReducer'
import styles from './CalculatorAdvanced.module.css'

const operations = [
  {
    action: 'power', label: 'Power', symbol: 'xʸ',
    description: 'Enter a base, press Power, then enter an exponent. For example, 2³ = 8. Keyboard shortcut: ^.',
  },
  {
    action: 'sqrt', label: 'Square root', symbol: '√',
    description: 'Apply to the current value, or to the right operand you’ve entered. For example, √9 = 3.',
  },
  {
    action: 'togglePercentage', label: 'Contextual percentage', symbol: '%',
    description: 'Mark the right operand of +, −, × or ÷ as a rate. For example, 150 × 20% = 30 and 150 + 20% = 180. Press again to remove the marker.',
  },
] as const

type AdvancedAction = typeof operations[number]['action']
type TouchPress = { id: number; x: number; y: number; timer: number }

type Props = {
  keyClassName: string
  loading: boolean
  percentageMarked: boolean
  onAction: (action: CalculatorAction) => void
}

export function CalculatorAdvanced({ keyClassName, loading, percentageMarked, onAction }: Props) {
  const id = useId()
  const [focused, setFocused] = useState<AdvancedAction | null>(null)
  const [hovered, setHovered] = useState<AdvancedAction | null>(null)
  const [touched, setTouched] = useState<AdvancedAction | null>(null)
  const press = useRef<TouchPress | null>(null)
  const heldAction = useRef<AdvancedAction | null>(null)
  const tooltip = loading ? null : touched ?? hovered ?? focused

  function stopPress() {
    window.clearTimeout(press.current?.timer)
    press.current = null
  }

  function startPress(event: PointerEvent<HTMLButtonElement>, action: AdvancedAction) {
    heldAction.current = null
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    stopPress()
    setTouched(null)
    press.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      timer: window.setTimeout(() => {
        heldAction.current = action
        setTouched(action)
      }, 450),
    }
  }

  useEffect(() => () => window.clearTimeout(press.current?.timer), [])

  useEffect(() => {
    if (tooltip === null) return

    function dismissHelp(event: KeyboardEvent) {
      if (event.defaultPrevented || event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      setTouched(null)
      setHovered(null)
      setFocused(null)
    }

    function dismissOnOutsidePress(event: globalThis.PointerEvent) {
      if (touched === null || !(event.target instanceof Element)) return
      if (event.target.closest('button')?.getAttribute('aria-describedby') !== id + '-' + touched) {
        setTouched(null)
      }
    }

    document.addEventListener('keydown', dismissHelp)
    document.addEventListener('pointerdown', dismissOnOutsidePress)
    return () => {
      document.removeEventListener('keydown', dismissHelp)
      document.removeEventListener('pointerdown', dismissOnOutsidePress)
    }
  }, [id, tooltip, touched])

  return (
    <>
      {operations.map(({ action, label, symbol, description }) => {
        const tooltipId = `${id}-${action}`
        return (
          <div
            key={action}
            className={action === 'togglePercentage' ? styles.key + ' ' + styles.percentageKey : styles.key}
            onPointerEnter={event => {
              if (event.pointerType === 'mouse' && !loading) setHovered(action)
            }}
            onPointerLeave={() => setHovered(null)}
          >
            <button
              type="button"
              className={keyClassName}
              disabled={loading}
              aria-label={label}
              aria-describedby={tooltipId}
              aria-pressed={action === 'togglePercentage' ? percentageMarked : undefined}
              onFocus={event => {
                if (event.currentTarget.matches(':focus-visible')) setFocused(action)
              }}
              onBlur={() => setFocused(null)}
              onPointerDown={event => startPress(event, action)}
              onPointerMove={event => {
                const active = press.current
                if (active?.id === event.pointerId && Math.hypot(event.clientX - active.x, event.clientY - active.y) > 10) {
                  stopPress()
                }
              }}
              onPointerUp={stopPress}
              onPointerCancel={stopPress}
              onContextMenu={event => {
                if (press.current || heldAction.current === action) event.preventDefault()
              }}
              onClick={event => {
                if (event.detail > 0 && heldAction.current === action) {
                  heldAction.current = null
                  event.stopPropagation()
                  return
                }
                setTouched(null)
                onAction({ type: action })
              }}
            >
              <span aria-hidden="true">{symbol}</span>
            </button>
            <span id={tooltipId} className={styles.tooltip} role="tooltip" hidden={tooltip !== action} data-hovered={hovered === action}>
              <span>{description}</span>
            </span>
          </div>
        )
      })}
    </>
  )
}
