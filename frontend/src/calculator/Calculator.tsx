import { useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import { CalculatorAdvancedHelp } from './CalculatorAdvanced'
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
  '%': { type: 'togglePercentage' },
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
  const { state, send, evaluation, showLoading, equalsUnavailable } = useCalculator(recordEvaluation)
  const [advanced, setAdvanced] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const desktop = useSyncExternalStore(subscribeToHistoryLayout, isHistoryDocked)
  const historyDocked = desktop && size !== 'Large'
  const historyId = useId()
  const helpId = useId()
  const calculator = useRef<HTMLElement>(null)
  const display = useRef<HTMLOutputElement>(null)
  const modesButton = useRef<HTMLButtonElement>(null)
  const historyButton = useRef<HTMLButtonElement>(null)
  const historyDialog = useRef<HTMLDialogElement>(null)
  const helpButton = useRef<HTMLButtonElement>(null)
  const helpDialog = useRef<HTMLDialogElement>(null)

  function recordEvaluation(request: CalculationRequest, result: number) {
    const entry = { id: nextEntryId.current++, request, result }
    setEntries(current => [entry, ...current].slice(0, 10))
  }

  function closeHistory() {
    if (historyDialog.current?.open) historyDialog.current.close()
    setHistoryOpen(false)
    historyButton.current?.focus({ preventScroll: true })
  }

  function closeHelp(restoreFocus = true) {
    if (helpDialog.current?.open) helpDialog.current.close()
    setHelpOpen(false)
    if (restoreFocus) helpButton.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    function dismissNavigation(event: KeyboardEvent) {
      if (event.defaultPrevented || event.key !== 'Escape' || event.repeat || event.isComposing) return
      const target = event.target instanceof Element ? event.target : null
      if (helpOpen && !menuOpen) {
        event.preventDefault()
        closeHelp()
      } else if (historyOpen && (!historyDocked || target === historyButton.current || target?.closest('[data-calculator-history]'))) {
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
      if (menuOpen || ((historyOpen || helpOpen) && !historyDocked) || target?.closest('[data-calculator-history], [data-calculator-help]')) return
      if (event.key === 'Escape' && event.repeat) return
      if (event.key === 'Enter' && target instanceof HTMLButtonElement) return

      const action = /^[0-9]$/.test(event.key)
        ? { type: 'digit' as const, digit: event.key }
        : keyboardActions[event.key]
      if (!action || (!advanced && (action.type === 'power' || action.type === 'togglePercentage'))) return

      event.preventDefault()
      send(action)
    }

    function isCalculatorClipboardEvent(event: ClipboardEvent) {
      if (event.defaultPrevented || menuOpen || ((historyOpen || helpOpen) && !historyDocked)) return false
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
  }, [advanced, helpOpen, historyDocked, historyOpen, menuOpen, send, state])

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
  if (evaluation?.result === null && evaluation.request.operation === 'percentage' && (state.loading || state.error !== null)) {
    expression = formatRequestExpression(evaluation.request)
  }
  if (state.confirmedEntry !== null) expression = state.confirmedEntry + ' ='
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
          helpId={helpId}
          helpOpen={helpOpen}
          helpButton={helpButton}
          onHelpToggle={() => {
            if (helpOpen) closeHelp()
            else { setMenuOpen(false); setHistoryOpen(false); setHelpOpen(true) }
          }}
          modesButton={modesButton}
          historyButton={historyButton}
          onMenuOpenChange={setMenuOpen}
          onModeChange={next => { if (!next) closeHelp(false); setAdvanced(next) }}
          onHistoryToggle={() => {
            if (historyOpen) closeHistory()
            else {
              setMenuOpen(false)
              closeHelp(false)
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
        <CalculatorKeypad
          advanced={advanced}
          equalsUnavailable={equalsUnavailable}
          percentageMarked={percentageMarked}
          helpId={helpId}
          onAction={send}
        />
      </section>
      {advanced && <CalculatorAdvancedHelp id={helpId} open={helpOpen} docked={historyDocked} dialog={helpDialog} onClose={() => closeHelp()} />}
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
