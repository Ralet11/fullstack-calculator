type EntryAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' | 'sign' | 'backspace' }

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide'

export type CalculatorAction = EntryAction | { type: Operation | 'equals' | 'clear' }

type PendingOperation = { left: number; operation: Operation }

export type CalculatorState = {
  entry: string
  pending: PendingOperation | null
  result: number | null
  loading: boolean
  error: string | null
}

type StateAction =
  | EntryAction
  | { type: 'clear' | 'requestStarted' }
  | { type: 'setPending'; pending: PendingOperation }
  | { type: 'requestSucceeded'; result: number; nextOperation: Operation | null }
  | { type: 'requestFailed'; message: string }

export const initialState: CalculatorState = {
  entry: '0',
  pending: null,
  result: null,
  loading: false,
  error: null,
}

export function calculatorReducer(state: CalculatorState, action: StateAction): CalculatorState {
  switch (action.type) {
    case 'clear':
      return initialState
    case 'digit': {
      const entry = state.result === null ? state.entry : ''
      const prefix = entry === '0' ? '' : entry === '-0' ? '-' : entry
      return { ...state, entry: prefix + action.digit, result: null, error: null }
    }
    case 'decimal': {
      const entry = state.result === null ? state.entry : ''
      if (entry.includes('.')) return state
      const prefix = entry === '' || entry === '-' ? entry + '0' : entry
      return { ...state, entry: prefix + '.', result: null, error: null }
    }
    case 'sign':
      if (state.result !== null) return { ...state, result: -state.result, error: null }
      if (state.entry === '' || state.entry === '0') {
        return { ...state, entry: '-', error: null }
      }
      return {
        ...state,
        entry: state.entry.startsWith('-') ? state.entry.slice(1) : '-' + state.entry,
        error: null,
      }
    case 'backspace':
      if (state.result !== null) return state
      return { ...state, entry: state.entry.slice(0, -1), error: null }
    case 'setPending':
      return { ...initialState, pending: action.pending, entry: '' }
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
      return { ...initialState, entry: '', result: action.result }
    case 'requestFailed':
      return { ...state, loading: false, error: action.message }
  }
}
