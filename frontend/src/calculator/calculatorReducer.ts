import { editableDecimal } from './calculatorEntry'

type EntryAction =
  | { type: 'digit'; digit: string }
  | { type: 'paste'; entry: string }
  | { type: 'decimal' | 'sign' | 'backspace' | 'togglePercentage' | 'clearEntry' }

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'percentage'

export type CalculatorAction = EntryAction | { type: Operation | 'sqrt' | 'equals' | 'clear' }

type PendingOperation = { left: number; operation: Operation; percentage?: boolean }

export type CalculatorState = {
  entry: string
  pending: PendingOperation | null
  result: number | null
  percentageBase: number | null
  confirmedEntry: string | null
  loading: boolean
  error: string | null
}

type StateAction =
  | EntryAction
  | { type: 'clear' | 'requestStarted' }
  | { type: 'setPending'; pending: PendingOperation }
  | { type: 'confirmEntry'; result: number }
  | { type: 'requestSucceeded'; result: number; nextOperation: Operation | null }
  | { type: 'unarySucceeded'; result: number }
  | { type: 'requestFailed'; message: string }

export const initialState: CalculatorState = {
  entry: '0',
  pending: null,
  result: null,
  percentageBase: null,
  confirmedEntry: null,
  loading: false,
  error: null,
}

export function calculatorReducer(state: CalculatorState, action: StateAction): CalculatorState {
  switch (action.type) {
    case 'clear':
      return initialState
    case 'clearEntry':
      return {
        ...state,
        entry: '0',
        pending: state.pending?.percentage ? { ...state.pending, percentage: false } : state.pending,
        result: null,
        confirmedEntry: null,
        loading: false,
        error: null,
      }
    case 'paste':
      return { ...state, entry: action.entry, result: null, confirmedEntry: null, error: null }
    case 'digit': {
      const entry = state.result === null ? editableDecimal(state.entry) : ''
      const prefix = entry === '0' ? '' : entry === '-0' ? '-' : entry
      return { ...state, entry: prefix + action.digit, result: null, confirmedEntry: null, error: null }
    }
    case 'decimal': {
      const entry = state.result === null ? editableDecimal(state.entry) : ''
      if (entry.includes('.')) return state
      const prefix = entry === '' || entry === '-' ? entry + '0' : entry
      return { ...state, entry: prefix + '.', result: null, confirmedEntry: null, error: null }
    }
    case 'sign':
      if (state.result !== null) {
        const result = -state.result
        return { ...state, result, percentageBase: state.pending === null ? result : state.percentageBase, confirmedEntry: null, error: null }
      }
      if (state.entry === '' || state.entry === '0') {
        return { ...state, entry: '-', error: null }
      }
      return {
        ...state,
        entry: state.entry.startsWith('-') ? state.entry.slice(1) : '-' + state.entry,
        error: null,
      }
    case 'backspace': {
      if (state.result !== null) return state
      const entry = editableDecimal(state.entry).slice(0, -1)
      const pending = (entry === '' || entry === '-') && state.pending?.percentage
        ? { ...state.pending, percentage: false }
        : state.pending
      return { ...state, entry, pending, error: null }
    }
    case 'togglePercentage': {
      const { pending, entry, result } = state
      if (pending === null || pending.operation === 'power' || pending.operation === 'percentage') return state
      if (result === null && (entry === '' || entry.endsWith('.') || !Number.isFinite(Number(entry)))) return state
      return { ...state, pending: { ...pending, percentage: !pending.percentage }, error: null }
    }
    case 'setPending':
      return { ...initialState, pending: action.pending, entry: '' }
    case 'confirmEntry':
      return { ...initialState, entry: '', result: action.result, percentageBase: action.result, confirmedEntry: state.entry }
    case 'requestStarted':
      return { ...state, loading: true, error: null }
    case 'requestSucceeded':
      if (action.nextOperation !== null) {
        return {
          ...initialState,
          pending: { left: action.result, operation: action.nextOperation },
          entry: '',
        }
      }
      return { ...initialState, entry: '', result: action.result, percentageBase: action.result }
    case 'unarySucceeded':
      return {
        ...state,
        entry: '',
        result: action.result,
        percentageBase: state.pending === null ? action.result : state.percentageBase,
        confirmedEntry: null,
        loading: false,
        error: null,
      }
    case 'requestFailed':
      return { ...state, loading: false, error: action.message }
  }
}
