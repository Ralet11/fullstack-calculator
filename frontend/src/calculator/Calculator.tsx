import { useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import { CalculatorDisplay } from './CalculatorDisplay'
import { CalculatorHeader, type CalculatorSize } from './CalculatorHeader'
import { CalculatorHistory, type HistoryEntry } from './CalculatorHistory'
import { CalculatorKeypad } from './CalculatorKeypad'
import type { CalculationRequest } from './calculatorApi'
import { formatClipboardNumber, parseClipboardEntry } from './calculatorEntry'
import { formatNumber, formatPendingExpression, formatRequestExpression } from './calculatorPresentation'
import type { CalculatorAction } from './calculatorReducer'
import { useCalculator } from './useCalculator'
import styles from './Calculator.module.css'

const keyboardActions: Record<string, CalculatorAction | undefined> = {
  '+': { type: 'add' },
  '-': { type: 'subtract' },
  '*': { type: 'multiply' },
  '/': { type: 'divide' },
  '^': { type: 'power' },
  '.': { type: 'decimal' },
  '=': { type: 'equals' },
  Enter: { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
}

const historyDockQuery = '(min-width: 76rem)'

function subscribeToHistoryLayout(onChange: () => void) {
  const query = window.matchMedia(historyDockQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function isHistoryDocked() {
  return window.matchMedia(historyDockQuery).matches
}

type Props = {
  size: CalculatorSize
  onSizeChange: (size: CalculatorSize) => void
}

export function Calculator({ size, onSizeChange }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const nextEntryId = useRef(0)
  const { state, send, evaluation, showLoading } = useCalculator(recordEvaluation)
  const [advanced, setAdvanced] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const desktop = useSyncExternalStore(subscribeToHistoryLayout, isHistoryDocked)
  const historyDocked = desktop && size !== 'Large'
  const historyId = useId()
  const calculator = useRef<HTMLElement>(null)
  const display = useRef<HTMLOutputElement>(null)
  const modesButton = useRef<HTMLButtonElement>(null)
  const historyButton = useRef<HTMLButtonElement>(null)
  const historyDialog = useRef<HTMLDialogElement>(null)

  function recordEvaluation(request: CalculationRequest, result: number) {
    const entry = { id: nextEntryId.current++, request, result }
    setEntries(current => [entry, ...current].slice(0, 10))
  }

  function closeHistory() {
    if (historyDialog.current?.open) historyDialog.current.close()
    setHistoryOpen(false)
    historyButton.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    function dismissNavigation(event: KeyboardEvent) {
      if (event.defaultPrevented || event.key !== 'Escape' || event.repeat || event.isComposing) return
      const target = event.target instanceof Element ? event.target : null
      if (historyOpen && (!historyDocked || target === historyButton.current || target?.closest('[data-calculator-history]'))) {
        event.preventDefault()
        closeHistory()
      } else if (menuOpen) {
        event.preventDefault()
        setMenuOpen(false)
        modesButton.current?.focus({ preventScroll: true })
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
      const target = event.target instanceof Element ? event.target : null
      if (menuOpen || (historyOpen && !historyDocked) || target?.closest('[data-calculator-history]')) return
      if (event.key === 'Escape' && event.repeat) return
      if (event.key === 'Enter' && target instanceof HTMLButtonElement) return

      const action = /^[0-9]$/.test(event.key)
        ? { type: 'digit' as const, digit: event.key }
        : keyboardActions[event.key]
      if (!action || (action.type === 'power' && !advanced)) return

      event.preventDefault()
      send(action)
    }

    function isCalculatorClipboardEvent(event: ClipboardEvent) {
      if (event.defaultPrevented || menuOpen || (historyOpen && !historyDocked)) return false
      const target = event.target instanceof Element ? event.target : document.activeElement
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return false
      return target === document.body || (target !== null && calculator.current?.contains(target))
    }

    function handleCopy(event: ClipboardEvent) {
      const clipboard = event.clipboardData
      if (!clipboard || !isCalculatorClipboardEvent(event) || window.getSelection()?.isCollapsed === false) return

      const { entry, result, pending } = state
      if (entry && (entry.endsWith('.') || !Number.isFinite(Number(entry)))) return
      const text = entry || formatClipboardNumber(result ?? pending?.left ?? 0)
      try {
        clipboard.setData('text/plain', text)
        event.preventDefault()
      } catch {
        // Let the browser handle the event if the clipboard is unavailable.
      }
    }

    function handlePaste(event: ClipboardEvent) {
      const clipboard = event.clipboardData
      if (!clipboard || !isCalculatorClipboardEvent(event) || state.loading) return

      let entry: string | null
      try {
        entry = parseClipboardEntry(clipboard.getData('text/plain'))
      } catch {
        return
      }
      if (entry === null) return
      event.preventDefault()
      send({ type: 'paste', entry })
    }

    window.addEventListener('keydown', dismissNavigation, true)
    window.addEventListener('keydown', handleKey)
    window.addEventListener('copy', handleCopy)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keydown', dismissNavigation, true)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('copy', handleCopy)
      window.removeEventListener('paste', handlePaste)
    }
  }, [advanced, historyDocked, historyOpen, menuOpen, send, state])

  function focusDisplayAfterPointerClick(event: MouseEvent<HTMLElement>) {
    if (event.detail === 0 || !(event.target instanceof Element)) return
    const key = event.target.closest('[data-calculator-keys] button')
    if (key) {
      display.current?.focus({ preventScroll: true })
    }
  }

  const acceptedResult = evaluation?.result ?? null
  const attemptedRoot = evaluation?.result === null && evaluation.request.operation === 'sqrt'
    && (state.loading || state.error !== null)
    ? formatRequestExpression(evaluation.request)
    : ''
  const value = state.entry || formatNumber(state.result ?? state.pending?.left ?? 0)
  const right = attemptedRoot || state.entry || (state.result === null ? '' : formatNumber(state.result))

  let expression = attemptedRoot
  if (state.pending) {
    const { operation, left, percentage } = state.pending
    expression = formatPendingExpression(operation, left, right, percentage)
  } else if (evaluation?.result != null && Object.is(state.result, evaluation.result)) {
    expression = formatRequestExpression(evaluation.request) + ' ='
  }
  const percentageMarked = state.pending?.percentage === true

  return (
    <div className={styles.workspace}>
      <section ref={calculator} className={styles.calculator} aria-label="Calculator" onClick={focusDisplayAfterPointerClick}>
        <CalculatorHeader
          advanced={advanced}
          size={size}
          onSizeChange={onSizeChange}
          menuOpen={menuOpen}
          historyOpen={historyOpen}
          historyId={historyId}
          modesButton={modesButton}
          historyButton={historyButton}
          onMenuOpenChange={setMenuOpen}
          onModeChange={setAdvanced}
          onHistoryToggle={() => {
            if (historyOpen) closeHistory()
            else {
              setMenuOpen(false)
              setHistoryOpen(true)
            }
          }}
        />
        <CalculatorDisplay
          ref={display}
          size={size}
          value={percentageMarked ? value + '%' : value}
          animationRequest={acceptedResult !== null && state.entry === '' ? evaluation?.request ?? null : null}
          typing={state.entry !== ''}
          announcedResult={acceptedResult === null ? null : formatNumber(acceptedResult)}
          expression={expression}
          showLoading={showLoading}
          error={state.error}
        />
        <CalculatorKeypad advanced={advanced} loading={state.loading} percentageMarked={percentageMarked} onAction={send} />
        <p className={styles.hint}>
          <span className={advanced ? styles.advancedKeyboardHint : undefined}><kbd>Enter</kbd> calculate · <kbd>Esc</kbd> clear</span>
          {advanced && <span className={styles.touchHint}>Hold an Advanced key for help</span>}
        </p>
      </section>
      <CalculatorHistory
        id={historyId}
        entries={entries}
        open={historyOpen}
        docked={historyDocked}
        dialog={historyDialog}
        onClear={() => setEntries([])}
        onClose={closeHistory}
      />
    </div>
  )
}
