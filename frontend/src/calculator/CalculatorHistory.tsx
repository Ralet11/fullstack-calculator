import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { CalculationRequest } from './calculatorApi'
import { formatNumber, formatRequestExpression } from './calculatorPresentation'
import styles from './CalculatorPanels.module.css'

export type HistoryEntry = { id: number; request: CalculationRequest; result: number }

type Props = {
  id: string
  entries: HistoryEntry[]
  open: boolean
  docked: boolean
  dialog: RefObject<HTMLDialogElement | null>
  onClear: () => void
  onClose: () => void
}

function expression(request: CalculationRequest): string {
  if (request.operation === 'percentage') return formatNumber(request.b) + '% of ' + formatNumber(request.a)
  return formatRequestExpression(request)
}

export function CalculatorHistory({ id, entries, open, docked, dialog, onClear, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const clearButton = useRef<HTMLButtonElement>(null)
  const pointerOnBackdrop = useRef(false)
  const headingId = id + '-heading'

  useLayoutEffect(() => {
    if (!open) return
    const drawer = docked ? null : dialog.current
    drawer?.showModal()
    closeButton.current?.focus({ preventScroll: true })

    return () => {
      if (drawer?.open) drawer.close()
    }
  }, [dialog, docked, open])

  const content = (
    <div className={styles.panel}>
      <header className={styles.heading}>
        <div>
          <h2 id={headingId}>Recent calculations</h2>
          <p>{entries.length} of 10</p>
        </div>
        <div className={styles.actions}>
          {entries.length > 0 && (
            <button
              ref={clearButton}
              type="button"
              aria-label="Clear history"
              title="Clear history"
              onClick={() => { onClear(); closeButton.current?.focus() }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
              </svg>
            </button>
          )}
          <button ref={closeButton} type="button" aria-label="Close" title="Close" onClick={onClose}>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </header>
      {entries.length === 0
        ? <p className={styles.empty}>No calculations yet.</p>
        : (
          <ol className={styles.entries}>
            {entries.map(({ id: entryId, request, result }) => (
              <li key={entryId}>
                <span>{expression(request)}</span>
                <strong>= {formatNumber(result)}</strong>
              </li>
            ))}
          </ol>
        )}
    </div>
  )

  if (docked) {
    return <aside id={id} data-calculator-history aria-labelledby={headingId} className={styles.dock} hidden={!open}>{content}</aside>
  }

  return (
    <dialog
      id={id}
      ref={dialog}
      data-calculator-history
      aria-labelledby={headingId}
      className={styles.drawer}
      onCancel={event => { event.preventDefault(); onClose() }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const first = clearButton.current ?? closeButton.current
        const last = closeButton.current
        const boundary = event.shiftKey ? first : last
        if (document.activeElement !== boundary) return
        event.preventDefault()
        const next = event.shiftKey ? last : first
        next?.focus()
      }}
      onPointerDown={event => { pointerOnBackdrop.current = event.target === event.currentTarget }}
      onClick={event => {
        if (pointerOnBackdrop.current && event.target === event.currentTarget) onClose()
        pointerOnBackdrop.current = false
      }}
    >
      {content}
    </dialog>
  )
}
