import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { CalculatorAction } from './calculatorReducer'
import styles from './CalculatorAdvanced.module.css'
import panels from './CalculatorPanels.module.css'

export const percentageDescription = 'Mark the right operand of +, −, × or ÷ as a rate. For example, 150 × 20% = 30. Press again to remove the marker. To take a percentage of the last result, enter the rate and press %.'

const operations = [
  {
    action: 'power', label: 'Power', symbol: 'xʸ',
    description: 'Enter a base, press Power, then enter an exponent. For example, 2³ = 8. Keyboard shortcut: ^.',
  },
  {
    action: 'sqrt', label: 'Square root', symbol: '√',
    description: 'Apply to the current value or to the right operand you’ve entered. For example, √9 = 3.',
  },
  {
    action: 'togglePercentage', label: 'Contextual percentage', symbol: '%',
    description: percentageDescription,
  },
] as const

type Props = {
  keyClassName: string
  helpId: string
  onAction: (action: CalculatorAction) => void
}

export function CalculatorAdvanced({ keyClassName, helpId, onAction }: Props) {
  return (
    <>
      {operations.filter(({ action }) => action !== 'togglePercentage').map(({ action, label, symbol }) => (
        <button
          key={action}
          type="button"
          className={keyClassName}
          aria-label={label}
          aria-describedby={`${helpId}-${action}`}
          onClick={() => onAction({ type: action })}
        >
          <span aria-hidden="true">{symbol}</span>
        </button>
      ))}
    </>
  )
}

type HelpProps = {
  id: string
  open: boolean
  docked: boolean
  dialog: RefObject<HTMLDialogElement | null>
  onClose: () => void
}

export function CalculatorAdvancedHelp({ id, open, docked, dialog, onClose }: HelpProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const pointerOnBackdrop = useRef(false)
  const headingId = id + '-heading'

  useLayoutEffect(() => {
    if (!open) return
    const drawer = docked ? null : dialog.current
    drawer?.showModal()
    closeButton.current?.focus({ preventScroll: true })
    return () => { if (drawer?.open) drawer.close() }
  }, [dialog, docked, open])

  const content = (
    <div className={panels.panel}>
      <header className={panels.heading}>
        <h2 id={headingId}>Advanced help</h2>
        <div className={panels.actions}>
          <button ref={closeButton} type="button" aria-label="Close help" onClick={onClose}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
      </header>
      <dl className={styles.help}>
        {operations.map(({ action, label, symbol, description }) => (
          <div key={action}>
            <dt><span aria-hidden="true">{symbol} </span>{label}</dt>
            <dd id={id + '-' + action}>{description}</dd>
          </div>
        ))}
      </dl>
    </div>
  )

  if (docked) {
    return <aside id={id} data-calculator-help aria-labelledby={headingId} className={panels.dock} hidden={!open}>{content}</aside>
  }

  return (
    <dialog
      id={id}
      ref={dialog}
      data-calculator-help
      aria-labelledby={headingId}
      className={panels.drawer}
      onCancel={event => { event.preventDefault(); onClose() }}
      onKeyDown={event => { if (event.key === 'Tab') event.preventDefault() }}
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
