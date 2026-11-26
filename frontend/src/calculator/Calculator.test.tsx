import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function openCalculator() {
  const user = userEvent.setup()
  render(<App />)
  const calculator = within(screen.getByRole('region', { name: 'Calculator' }))
  return {
    user,
    press: async (name: string) => {
      if (name === 'Standard' || name === 'Advanced') {
        await user.click(calculator.getByRole('button', { name: 'Modes' }))
      }
      await user.click(calculator.getByRole('button', { name }))
    },
    value: () => calculator.getByRole('status', { name: 'Calculator display' }).textContent,
  }
}

function requestBody(call = 0) {
  const [url, options] = fetchMock.mock.calls[call]
  expect(url).toBe('/api/calculate')
  expect(options).toMatchObject({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return JSON.parse(String(options?.body))
}

function reply(result: number) {
  return Response.json({ result })
}

function deferredResponse() {
  let resolve!: (response: Response) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<Response>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('calculator clipboard', () => {
  function paste(text: string, target: Element = document.body) {
    return fireEvent.paste(target, { clipboardData: { getData: () => text } })
  }

  it('copies the unrounded numeric result and leaves the current calculation in place', async () => {
    fetchMock.mockResolvedValueOnce(reply(0.30000000000000004))
    const { user, value } = openCalculator()
    await user.keyboard('0.1+0.2=')
    await waitFor(() => expect(value()).toBe('0.3'))

    const setData = vi.fn()
    const display = screen.getByRole('status', { name: 'Calculator display' })
    expect(fireEvent.copy(display, { clipboardData: { setData } })).toBe(false)
    expect(setData).toHaveBeenCalledWith('text/plain', '0.30000000000000004')
    expect(value()).toBe('0.3')
    expect(screen.getByRole('group', { name: 'Calculation expression' }).textContent).toBe('0.1 + 0.2 =')
  })

  it('starts a fresh calculation after a result and accepts signed scientific notation', async () => {
    fetchMock.mockResolvedValueOnce(reply(3)).mockResolvedValueOnce(reply(-0.00000025))
    const { user, value } = openCalculator()
    await user.keyboard('1+2=')
    await waitFor(() => expect(value()).toBe('3'))

    expect(paste('  -1.25E-7  ')).toBe(false)
    expect(value()).toBe('-1.25e-7')
    expect(screen.queryByRole('group', { name: 'Calculation expression' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await user.keyboard('*2=')
    expect(requestBody(1)).toEqual({ operation: 'multiply', a: -1.25e-7, b: 2 })
    await waitFor(() => expect(value()).toBe('-2.5e-7'))
  })

  it('replaces a pending right operand while retaining its contextual rate marker', async () => {
    fetchMock.mockResolvedValueOnce(reply(149.8125))
    const { press, user, value } = openCalculator()
    await press('Advanced')
    await user.keyboard('150+20')
    await press('Contextual percentage')

    expect(paste('-.125')).toBe(false)
    expect(value()).toBe('-0.125%')
    await user.keyboard('=')
    expect(requestBody()).toEqual({ operation: 'add', a: 150, b: -0.125, percentage: true })
    await waitFor(() => expect(value()).toBe('149.8125'))
  })

  it('keeps pasted scientific notation editable as decimal digits', async () => {
    const { user, value } = openCalculator()
    paste('1.2e-7')
    await user.keyboard('{Backspace}5')
    expect(value()).toBe('0.00000015')

    paste('2e+21')
    await user.keyboard('.')
    expect(value()).toBe('2000000000000000000000.')
  })

  it('leaves the entry and operation alone when clipboard data is invalid, non-finite, or unavailable', async () => {
    const { user, value } = openCalculator()
    await user.keyboard('7+8')
    for (const text of ['', '4 2', '2+3', '0x10', 'NaN', 'Infinity', '1e309']) {
      expect(paste(text)).toBe(true)
    }

    expect(fireEvent.paste(document.body, { clipboardData: null })).toBe(true)
    expect(fireEvent.paste(document.body, { clipboardData: { getData() { throw new Error('Clipboard denied') } } })).toBe(true)
    expect(fireEvent.copy(document.body, { clipboardData: { setData() { throw new Error('Clipboard denied') } } })).toBe(true)
    expect(value()).toBe('8')
    expect(screen.getByRole('group', { name: 'Calculation expression' }).textContent).toBe('7 + 8')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leaves an in-flight request intact and respects focus outside the calculator', async () => {
    const pending = deferredResponse()
    fetchMock.mockReturnValueOnce(pending.promise)
    const { press, user, value } = openCalculator()

    await user.keyboard('2+3=')
    expect(paste('10')).toBe(true)
    expect(value()).toBe('3')
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)
    await act(async () => pending.resolve(reply(5)))
    expect(value()).toBe('5')

    await press('History')
    const close = screen.getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(close)
    expect(paste('99', close)).toBe(true)
    const setData = vi.fn()
    expect(fireEvent.copy(close, { clipboardData: { setData } })).toBe(true)
    expect(setData).not.toHaveBeenCalled()
    expect(value()).toBe('5')
  })
})

describe('calculation expression', () => {
  const expression = () => screen.queryByRole('group', { name: 'Calculation expression' })?.textContent

  it('shows and replaces the pending operator, then retains the completed expression until a new entry', async () => {
    fetchMock.mockResolvedValueOnce(reply(5))
    const { user, value, press } = openCalculator()

    expect(expression()).toBeUndefined()
    await user.keyboard('12+')
    expect(expression()).toBe('12 +')
    await user.keyboard('-')
    expect(expression()).toBe('12 −')
    await user.keyboard('7')
    expect(expression()).toBe('12 − 7')
    expect(value()).toBe('7')
    await user.keyboard('=')
    await waitFor(() => expect(expression()).toBe('12 − 7 ='))
    expect(value()).toBe('5')

    await user.keyboard('=')
    expect(expression()).toBe('12 − 7 =')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await user.keyboard('4')
    expect(expression()).toBeUndefined()
    await user.keyboard('+8')
    expect(expression()).toBe('4 + 8')
    await press('Clear')
    expect(expression()).toBeUndefined()
    expect(value()).toBe('0')
  })

  it('starts each chained expression from the accepted intermediate result', async () => {
    const first = deferredResponse()
    fetchMock.mockImplementationOnce(() => first.promise).mockResolvedValueOnce(reply(30))
    const { user, value } = openCalculator()

    await user.keyboard('10+5*')
    expect(expression()).toBe('10 + 5')
    await act(async () => first.resolve(reply(15)))
    expect(expression()).toBe('15 ×')
    expect(value()).toBe('15')
    await user.keyboard('2=')
    await waitFor(() => expect(expression()).toBe('15 × 2 ='))
    expect(value()).toBe('30')
  })

  it('shows explicit percentage rates and groups a negative power base', async () => {
    fetchMock.mockResolvedValueOnce(reply(30)).mockResolvedValueOnce(reply(36)).mockResolvedValueOnce(reply(-8))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('150*20')
    expect(expression()).toBe('150 × 20')
    await press('Contextual percentage')
    expect(expression()).toBe('150 × 20%')
    expect(value()).toBe('20%')
    await user.keyboard('=')
    await waitFor(() => expect(expression()).toBe('150 × 20% ='))

    await user.keyboard('+20')
    expect(expression()).toBe('30 + 20')
    await press('Contextual percentage')
    expect(expression()).toBe('30 + 20%')
    await user.keyboard('=')
    await waitFor(() => expect(expression()).toBe('30 + 20% ='))

    await press('Clear')
    await press('Toggle sign')
    await user.keyboard('2^3')
    expect(expression()).toBe('(-2) ^ 3')
    await user.keyboard('=')
    await waitFor(() => expect(expression()).toBe('(-2) ^ 3 ='))
    expect(value()).toBe('-8')
  })

  it('shows a standalone root result and uses a root result as the pending right operand', async () => {
    const root = deferredResponse()
    fetchMock.mockImplementationOnce(() => root.promise).mockResolvedValueOnce(reply(3)).mockResolvedValueOnce(reply(5))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('81')
    await press('Square root')
    expect(expression()).toBe('√(81)')
    expect(value()).toBe('81')
    await act(async () => root.resolve(reply(9)))
    expect(expression()).toBe('√(81) =')
    expect(value()).toBe('9')

    await user.keyboard('2+9')
    await press('Square root')
    await waitFor(() => expect(expression()).toBe('2 + 3'))
    expect(value()).toBe('3')
    await user.keyboard('=')
    await waitFor(() => expect(expression()).toBe('2 + 3 ='))
    expect(value()).toBe('5')
  })

  it('keeps failed expressions editable and marks only successful retries as evaluated', async () => {
    fetchMock.mockResolvedValueOnce(divisionByZero()).mockResolvedValueOnce(reply(4))
      .mockResolvedValueOnce(Response.json({ error: { message: 'Square root requires a non-negative number.' } }, { status: 422 }))
      .mockResolvedValueOnce(reply(3))
    const { press, user, value } = openCalculator()

    await user.keyboard('8/0=')
    await screen.findByRole('alert')
    expect(expression()).toBe('8 ÷ 0')
    expect(value()).toBe('0')
    await user.keyboard('{Backspace}2')
    expect(expression()).toBe('8 ÷ 2')
    await user.keyboard('=')
    await waitFor(() => expect(expression()).toBe('8 ÷ 2 ='))
    expect(value()).toBe('4')

    await press('Clear')
    await press('Advanced')
    await press('Toggle sign')
    await user.keyboard('9')
    await press('Square root')
    await screen.findByRole('alert')
    expect(expression()).toBe('√(-9)')
    expect(value()).toBe('-9')
    await press('Toggle sign')
    expect(expression()).toBeUndefined()
    await press('Square root')
    await waitFor(() => expect(expression()).toBe('√(9) ='))
  })
})

describe('calculator navigation and history', () => {
  it('opens the mode menu with the keyboard and dismisses it without clearing the entry', async () => {
    const { user, value } = openCalculator()
    await user.keyboard('12')
    const modes = screen.getByRole('button', { name: 'Modes', expanded: false })
    await user.tab()
    expect(document.activeElement).toBe(modes)
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(modes)
    const standard = screen.getByRole('button', { name: 'Standard', pressed: true })
    const advanced = screen.getByRole('button', { name: 'Advanced', pressed: false })
    await user.tab()
    expect(document.activeElement).toBe(standard)
    await user.tab()
    expect(document.activeElement).toBe(advanced)
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(modes)
    expect(modes.getAttribute('aria-expanded')).toBe('false')
    expect(value()).toBe('12')

    await user.keyboard(' ')
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(modes)
    expect(screen.getByRole('button', { name: 'Modes', description: 'Advanced', expanded: false })).toBe(modes)
    expect(screen.getByRole('button', { name: 'Advanced help', expanded: false })).toBeTruthy()
    expect(value()).toBe('12')
  })

  it('dismisses the menu on a pointer press or Tab away and leaves the destination focus in place', async () => {
    const { user, value } = openCalculator()
    const modes = screen.getByRole('button', { name: 'Modes' })
    await user.click(modes)
    await user.click(screen.getByRole('button', { name: '7' }))
    expect(modes.getAttribute('aria-expanded')).toBe('false')
    expect(value()).toBe('7')
    expect(document.activeElement).toBe(screen.getByRole('status', { name: 'Calculator display' }))

    await user.click(modes)
    for (const name of ['Standard', 'Advanced', 'Compact', 'Default', 'Large', 'History']) {
      await user.tab()
      expect(document.activeElement).toBe(screen.getByRole('button', { name }))
    }
    expect(modes.getAttribute('aria-expanded')).toBe('false')
  })

  it('changes size through the menu without interrupting a calculation or changing history', async () => {
    const pending = deferredResponse()
    fetchMock.mockResolvedValueOnce(reply(3)).mockReturnValueOnce(pending.promise)
    const { user, value } = openCalculator()
    const modes = screen.getByRole('button', { name: 'Modes' })

    await user.keyboard('1+2=')
    await waitFor(() => expect(value()).toBe('3'))
    await user.keyboard('8/2')
    await user.click(modes)
    const sizes = within(screen.getByRole('group', { name: 'Calculator size' }))
    expect(sizes.getByRole('button', { name: 'Default', pressed: true }).textContent).toContain('✓')
    await user.click(sizes.getByRole('button', { name: 'Compact', pressed: false }))
    expect(document.activeElement).toBe(modes)
    expect(modes.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('8 ÷ 2')).toBeTruthy()

    await user.keyboard('=')
    expect(requestBody(1)).toEqual({ operation: 'divide', a: 8, b: 2 })
    await user.click(screen.getByRole('button', { name: 'History' }))
    const history = within(screen.getByRole('complementary', { name: 'Recent calculations' }))
    expect(history.getAllByRole('listitem').map(row => row.textContent)).toEqual(['1 + 2= 3'])
    await user.click(history.getByRole('button', { name: 'Close' }))

    await user.click(modes)
    expect(sizes.getByRole('button', { name: 'Compact', pressed: true })).toBeTruthy()
    const large = sizes.getByRole('button', { name: 'Large', pressed: false })
    large.focus()
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(modes)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(false)

    await act(async () => pending.resolve(reply(4)))
    expect(value()).toBe('4')
    await user.click(modes)
    expect(sizes.getByRole('button', { name: 'Large', pressed: true }).textContent).toContain('✓')
    await user.click(sizes.getByRole('button', { name: 'Compact' }))
    await user.click(screen.getByRole('button', { name: 'History' }))
    const reopenedHistory = within(screen.getByRole('complementary', { name: 'Recent calculations' }))
    expect(reopenedHistory.getAllByRole('listitem').map(row => row.textContent)).toEqual(['8 ÷ 2= 4', '1 + 2= 3'])
    expect(value()).toBe('4')
  })

  it('records each successful step once and keeps history and calculator Clear independent', async () => {
    const { press, user, value } = openCalculator()
    fetchMock.mockResolvedValueOnce(reply(15)).mockResolvedValueOnce(reply(30))
      .mockResolvedValueOnce(reply(180)).mockResolvedValueOnce(reply(3))
    expect(screen.queryByRole('complementary', { name: 'Recent calculations' })).toBeNull()
    await user.keyboard('10+5*')
    await waitFor(() => expect(value()).toBe('15'))
    await user.keyboard('2=')
    await waitFor(() => expect(value()).toBe('30'))
    await user.keyboard('=')
    await press('Advanced')
    await user.keyboard('150+20')
    await press('Contextual percentage')
    await press('Equals')
    await waitFor(() => expect(value()).toBe('180'))
    await user.keyboard('9')
    await press('Square root')
    await waitFor(() => expect(value()).toBe('3'))

    await press('History')
    const history = within(screen.getByRole('complementary', { name: 'Recent calculations' }))
    expect(history.getAllByRole('listitem').map(row => row.textContent)).toEqual([
      '√(9)= 3', '150 + 20%= 180', '15 × 2= 30', '10 + 5= 15',
    ])
    const close = history.getByRole('button', { name: 'Close' })
    const actions = close.closest('header')
    expect(actions).not.toBeNull()
    const clearHistory = history.getByRole('button', { name: 'Clear history' })
    expect(actions?.contains(clearHistory)).toBe(true)
    expect(close.textContent).toBe('')
    expect(clearHistory.textContent).toBe('')
    expect(document.activeElement).toBe(close)
    await user.keyboard('99=')
    expect(value()).toBe('3')
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'History' }))
    expect(value()).toBe('3')

    await press('Clear')
    await press('History')
    expect(history.getAllByRole('listitem')).toHaveLength(4)
    await press('6')
    await user.click(history.getByRole('button', { name: 'Clear history' }))
    expect(history.getByText('No calculations yet.')).toBeTruthy()
    expect(document.activeElement).toBe(history.getByRole('button', { name: 'Close' }))
    expect(value()).toBe('6')
  })

  it('keeps only the latest ten results and omits failed and stale requests', async () => {
    const { press, user, value } = openCalculator()
    const stale = deferredResponse()
    fetchMock.mockImplementationOnce(() => stale.promise).mockResolvedValueOnce(divisionByZero())
    await user.keyboard('90+1=')
    await press('Clear')
    await user.keyboard('8/0=')
    await screen.findByRole('alert')
    await press('Clear')

    for (let operand = 1; operand <= 11; operand++) {
      fetchMock.mockResolvedValueOnce(reply(operand + 1))
      await user.keyboard(operand + '+1=')
      await waitFor(() => expect(value()).toBe(String(operand + 1)))
    }
    await act(async () => stale.resolve(reply(91)))
    await press('History')
    const history = within(screen.getByRole('complementary', { name: 'Recent calculations' }))
    const rows = history.getAllByRole('listitem')
    expect(rows).toHaveLength(10)
    expect(rows[0].textContent).toBe('11 + 1= 12')
    expect(rows[9].textContent).toBe('2 + 1= 3')
    expect(history.queryByText(/90|8 ÷ 0/)).toBeNull()
  })
})

describe('addition calculator', () => {
  it('sends both entered numbers and displays the result returned by the API', async () => {
    fetchMock.mockResolvedValueOnce(reply(40))
    const { press, value } = openCalculator()

    for (const key of ['2', '5', 'Add', '1', '5', 'Equals']) await press(key)

    expect(requestBody()).toEqual({ operation: 'add', a: 25, b: 15 })
    await waitFor(() => expect(value()).toBe('40'))

    await press('Equals')
    expect(value()).toBe('40')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await press('7')
    expect(value()).toBe('7')
  })

  it('evaluates left to right and chains from the full API result', async () => {
    fetchMock.mockResolvedValueOnce(reply(0.30000000000000004)).mockResolvedValueOnce(reply(4.3))
    const { user, value } = openCalculator()

    await user.keyboard('0.1+0.2+')

    await screen.findByText('0.3 +')
    expect(value()).toBe('0.3')
    expect(requestBody()).toEqual({ operation: 'add', a: 0.1, b: 0.2 })

    await user.keyboard('4{Enter}')
    expect(requestBody(1)).toEqual({ operation: 'add', a: 0.30000000000000004, b: 4 })
    await waitFor(() => expect(value()).toBe('4.3'))
  })

  it('uses scientific notation for a large result and supports Enter after a pointer click', async () => {
    fetchMock.mockResolvedValueOnce(reply(1.2345678912345678e19)).mockResolvedValueOnce(reply(1.234567891234568e19))
    const { press, user, value } = openCalculator()

    for (const key of ['2', 'Add', '3']) await press(key)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(value()).toBe('1.23456789123e+19'))

    await user.keyboard('+4=')
    expect(requestBody(1)).toEqual({ operation: 'add', a: 1.2345678912345678e19, b: 4 })
  })

  it('shows the rounded calculation and announces the accepted result without a disclosure', async () => {
    fetchMock.mockResolvedValueOnce(reply(1 / 3))
    const { user, value } = openCalculator()

    await user.keyboard('1/3=')
    await waitFor(() => expect(value()).toBe('0.333333333333'))
    expect(screen.getByRole('group', { name: 'Calculation expression' }).textContent).toBe('1 ÷ 3 =')
    expect(screen.getByRole('status', { name: 'Calculation result' }).textContent).toBe('Result: 0.333333333333')
    expect(screen.queryByRole('button', { name: 'Full result' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Copy result' })).toBeNull()
  })

  it('opens Advanced help on demand and closes it with Escape before clearing the entry', async () => {
    const { press, user, value } = openCalculator()
    const announcement = screen.getByRole('status', { name: 'Calculation result' })
    await user.keyboard('12')
    expect(announcement.textContent).toBe('')
    expect(screen.queryByRole('button', { name: 'Advanced help' })).toBeNull()
    await press('Advanced')
    const info = screen.getByRole('button', { name: 'Advanced help', expanded: false })
    const history = screen.getByRole('button', { name: 'History' })
    expect(info.closest('header')).toBe(history.closest('header'))
    info.focus()
    await user.tab()
    expect(document.activeElement).toBe(history)
    const power = screen.getByRole('button', { name: 'Power', description: /enter an exponent/i })
    await user.hover(power)
    expect(screen.queryByRole('complementary', { name: 'Advanced help' })).toBeNull()

    info.focus()
    await user.keyboard('{Enter}')
    const help = screen.getByRole('complementary', { name: 'Advanced help' })
    expect(help.id).toBe(info.getAttribute('aria-controls'))
    expect(help.textContent).toContain('150 × 20% = 30')
    expect(info.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(within(help).getByRole('button', { name: 'Close help' }))

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('complementary', { name: 'Advanced help' })).toBeNull()
    expect(document.activeElement).toBe(info)
    expect(value()).toBe('12')

    await user.keyboard('{Escape}')
    expect(value()).toBe('0')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('handles sign, backspace, a single decimal point, and incomplete operands', async () => {
    fetchMock.mockResolvedValueOnce(reply(0.5))
    const { press, user, value } = openCalculator()

    await press('Toggle sign')
    await user.keyboard('.')
    expect(value()).toBe('-0.')
    await user.keyboard('+')
    expect(screen.getByRole('alert').textContent).toContain('Enter a complete number')
    expect(fetchMock).not.toHaveBeenCalled()

    await user.keyboard('.6{Backspace}5++')
    expect(screen.queryByRole('alert')).toBeNull()
    await user.keyboard('=')
    expect(fetchMock).not.toHaveBeenCalled()
    await user.keyboard('1=')
    expect(requestBody()).toEqual({ operation: 'add', a: -0.5, b: 1 })
    await waitFor(() => expect(value()).toBe('0.5'))

    await user.keyboard('{Escape}')
    expect(value()).toBe('0')
  })

  it('tabs through the Standard keypad in row order and activates a focused digit', async () => {
    const { user, value } = openCalculator()
    const clearEntry = screen.getByRole('button', { name: 'Clear entry' })
    const visited = new Set<Element | null>()
    while (document.activeElement !== clearEntry && !visited.has(document.activeElement)) {
      visited.add(document.activeElement)
      await user.tab()
    }
    expect(document.activeElement).toBe(clearEntry)

    for (const name of ['Clear', 'Backspace', '7', '8', '9', 'Divide', '4']) {
      await user.tab()
      expect(document.activeElement).toBe(screen.getByRole('button', { name }))
    }
    await user.keyboard('{Enter}')
    expect(value()).toBe('4')
  })

  it('blocks duplicate calculations and ignores a stale success after Clear', async () => {
    const stale = deferredResponse()
    const current = deferredResponse()
    fetchMock.mockImplementationOnce(() => stale.promise).mockImplementationOnce(() => current.promise)
    const { press, user, value } = openCalculator()

    await user.keyboard('2+3=')
    expect(screen.getByRole('button', { name: 'Equals' }).getAttribute('aria-disabled')).toBe('true')
    await user.keyboard('==')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await user.keyboard('91')

    await press('Clear')
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(value()).toBe('0')
    await user.keyboard('7+8=')
    await act(async () => stale.resolve(reply(5)))
    expect(value()).toBe('8')
    expect(screen.getByRole('button', { name: 'Equals' }).getAttribute('aria-disabled')).toBe('true')

    await act(async () => current.resolve(reply(15)))
    expect(value()).toBe('15')
    expect(screen.queryByText('Calculating…')).toBeNull()
  })

  it('keeps the value visible and only announces loading at 250 ms', async () => {
    const response = deferredResponse()
    fetchMock.mockReturnValueOnce(response.promise)
    const { user, value } = openCalculator()
    await user.keyboard('2+3')

    vi.useFakeTimers()
    try {
      fireEvent.keyDown(window, { key: '=' })
      expect(value()).toBe('3')
      expect(screen.queryByText('Calculating…')).toBeNull()

      act(() => { vi.advanceTimersByTime(249) })
      expect(screen.queryByText('Calculating…')).toBeNull()
      act(() => { vi.advanceTimersByTime(1) })
      expect(screen.getByText('Calculating…')).toBeTruthy()
      expect(value()).toBe('3')

      await act(async () => response.resolve(reply(5)))
      expect(screen.queryByText('Calculating…')).toBeNull()
      expect(value()).toBe('5')
      expect(screen.getByRole('button', { name: 'Equals' }).getAttribute('aria-disabled')).toBe('false')
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps canceled and fast requests from displaying a stale loading indicator', async () => {
    const stale = deferredResponse()
    const current = deferredResponse()
    fetchMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise)
    const { user, value } = openCalculator()
    await user.keyboard('2+3')

    vi.useFakeTimers()
    try {
      fireEvent.keyDown(window, { key: '=' })
      act(() => { vi.advanceTimersByTime(100) })
      fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
      for (const key of '7+8=') fireEvent.keyDown(window, { key })
      act(() => { vi.advanceTimersByTime(150) })
      expect(screen.queryByText('Calculating…')).toBeNull()
      expect(value()).toBe('8')

      await act(async () => current.resolve(reply(15)))
      await act(async () => stale.resolve(reply(5)))
      act(() => { vi.advanceTimersByTime(250) })
      expect(screen.queryByText('Calculating…')).toBeNull()
      expect(value()).toBe('15')
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores a stale error after Clear', async () => {
    const stale = deferredResponse()
    fetchMock.mockImplementationOnce(() => stale.promise)
    const { user, value } = openCalculator()

    await user.keyboard('2+3={Escape}')
    await act(async () => stale.reject(new Error('network failure')))

    expect(value()).toBe('0')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('preserves the operands on a server error so the user can correct them', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({
        error: { code: 'NON_FINITE_RESULT', message: 'The result exceeds the supported number range.' },
      }, { status: 422 }))
      .mockResolvedValueOnce(reply(9))
    const { user, value } = openCalculator()

    await user.keyboard('4+3=')
    expect((await screen.findByRole('alert')).textContent).toContain('exceeds the supported number range')
    expect(value()).toBe('3')
    await user.keyboard('{Backspace}5=')
    expect(requestBody(1)).toEqual({ operation: 'add', a: 4, b: 5 })
    await waitFor(() => expect(value()).toBe('9'))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lets the user retry after a network failure or invalid API response', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json({ result: '5' }))
      .mockResolvedValueOnce(reply(5))
    const { user, value } = openCalculator()

    await user.keyboard('2+3=')
    expect((await screen.findByRole('alert')).textContent).toContain('Could not reach')
    await user.keyboard('=')
    expect((await screen.findByRole('alert')).textContent).toContain('invalid result')
    await user.keyboard('=')
    await waitFor(() => expect(value()).toBe('5'))
    expect(requestBody(0)).toEqual(requestBody(1))
    expect(requestBody(1)).toEqual(requestBody(2))
  })

  it('preserves the calculation and allows retry after an HTML 502 response', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('<html><body>Bad Gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }))
      .mockResolvedValueOnce(reply(11))
    const { user, value } = openCalculator()

    await user.keyboard('7+4=')
    expect((await screen.findByRole('alert')).textContent).toContain('invalid response')
    expect(screen.getByText('7 + 4')).toBeTruthy()
    expect(value()).toBe('4')

    await user.keyboard('=')
    expect(requestBody(1)).toEqual({ operation: 'add', a: 7, b: 4 })
    await waitFor(() => expect(value()).toBe('11'))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('multiplication and division', () => {
  it('multiplies a signed decimal and then multiplies the result by zero', async () => {
    fetchMock.mockResolvedValueOnce(reply(-10)).mockResolvedValueOnce(reply(0))
    const { press, value } = openCalculator()

    for (const key of ['Toggle sign', '2', 'Decimal point', '5', 'Multiply', '4', 'Equals']) {
      await press(key)
    }
    expect(requestBody()).toEqual({ operation: 'multiply', a: -2.5, b: 4 })
    await waitFor(() => expect(value()).toBe('-10'))

    for (const key of ['Multiply', '0', 'Equals']) await press(key)
    expect(requestBody(1)).toEqual({ operation: 'multiply', a: -10, b: 0 })
    await waitFor(() => expect(value()).toBe('0'))
  })

  it('evaluates addition, multiplication and division from left to right', async () => {
    fetchMock.mockResolvedValueOnce(reply(15)).mockResolvedValueOnce(reply(30)).mockResolvedValueOnce(reply(6))
    const { user, value } = openCalculator()

    await user.keyboard('10+5*')
    await screen.findByText('15 ×')
    await user.keyboard('2/')
    await screen.findByText('30 ÷')
    await user.keyboard('5=')

    expect(requestBody(0)).toEqual({ operation: 'add', a: 10, b: 5 })
    expect(requestBody(1)).toEqual({ operation: 'multiply', a: 15, b: 2 })
    expect(requestBody(2)).toEqual({ operation: 'divide', a: 30, b: 5 })
    await waitFor(() => expect(value()).toBe('6'))
  })

  it.each([
    ['10+*', '10 ×', 'multiply', 20],
    ['10*/', '10 ÷', 'divide', 5],
  ])('replaces the pending operator in %s', async (keys, label, operation, result) => {
    fetchMock.mockResolvedValueOnce(reply(result))
    const { user, value } = openCalculator()

    await user.keyboard(keys)
    expect(screen.getByText(label)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    await user.keyboard('2=')

    expect(requestBody()).toEqual({ operation, a: 10, b: 2 })
    await waitFor(() => expect(value()).toBe(String(result)))
  })

  it('uses the full quotient when chaining division into multiplication', async () => {
    const quotient = 0.3333333333333333
    fetchMock.mockResolvedValueOnce(reply(quotient)).mockResolvedValueOnce(reply(1))
    const { press, user, value } = openCalculator()

    for (const key of ['1', 'Divide', '3', 'Multiply']) await press(key)
    await screen.findByText('0.333333333333 ×')
    expect(value()).toBe('0.333333333333')
    await user.keyboard('3=')

    expect(requestBody(0)).toEqual({ operation: 'divide', a: 1, b: 3 })
    expect(requestBody(1)).toEqual({ operation: 'multiply', a: quotient, b: 3 })
    await waitFor(() => expect(value()).toBe('1'))
  })

  it.each(['=', '+'])('recovers from division by zero triggered by %s', async key => {
    fetchMock.mockResolvedValueOnce(divisionByZero()).mockResolvedValueOnce(reply(4))
    const { user, value } = openCalculator()

    await user.keyboard('8/0' + key)
    expect((await screen.findByRole('alert')).textContent).toBe('Division by zero is not allowed.')
    expect(screen.getByText('8 ÷ 0')).toBeTruthy()
    expect(value()).toBe('0')

    await user.keyboard('{Backspace}2=')
    expect(requestBody(0)).toEqual({ operation: 'divide', a: 8, b: 0 })
    expect(requestBody(1)).toEqual({ operation: 'divide', a: 8, b: 2 })
    await waitFor(() => expect(value()).toBe('4'))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('preserves history after a failed intermediate division and records the corrected chain', async () => {
    fetchMock.mockResolvedValueOnce(reply(3)).mockResolvedValueOnce(divisionByZero())
      .mockResolvedValueOnce(reply(4)).mockResolvedValueOnce(reply(12))
    const { press, user, value } = openCalculator()

    await user.keyboard('1+2=')
    await waitFor(() => expect(value()).toBe('3'))
    await press('History')
    const history = within(screen.getByRole('complementary', { name: 'Recent calculations' }))
    const historyRows = () => history.getAllByRole('listitem').map(row => row.textContent)
    expect(historyRows()).toEqual(['1 + 2= 3'])
    await user.click(history.getByRole('button', { name: 'Close' }))

    await user.keyboard('8/0*')
    expect((await screen.findByRole('alert')).textContent).toBe('Division by zero is not allowed.')
    expect(requestBody(1)).toEqual({ operation: 'divide', a: 8, b: 0 })
    expect(screen.getByText('8 ÷ 0')).toBeTruthy()
    expect(value()).toBe('0')

    await press('History')
    expect(historyRows()).toEqual(['1 + 2= 3'])
    await user.click(history.getByRole('button', { name: 'Close' }))

    await user.keyboard('{Backspace}2*')
    await screen.findByText('4 ×')
    expect(requestBody(2)).toEqual({ operation: 'divide', a: 8, b: 2 })
    expect(screen.queryByRole('alert')).toBeNull()
    await user.keyboard('3=')
    expect(requestBody(3)).toEqual({ operation: 'multiply', a: 4, b: 3 })
    await waitFor(() => expect(value()).toBe('12'))

    await press('History')
    expect(historyRows()).toEqual(['4 × 3= 12', '8 ÷ 2= 4', '1 + 2= 3'])
  })

  it('ignores a stale division error after Clear and a newer result', async () => {
    const stale = deferredResponse()
    fetchMock.mockImplementationOnce(() => stale.promise).mockResolvedValueOnce(reply(6))
    const { user, value } = openCalculator()

    await user.keyboard('8/0={Escape}2*3=')
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    await waitFor(() => expect(value()).toBe('6'))
    await act(async () => stale.resolve(divisionByZero()))

    expect(value()).toBe('6')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

function divisionByZero() {
  return Response.json({
    error: { code: 'DIVISION_BY_ZERO', message: 'Division by zero is not allowed.' },
  }, { status: 422 })
}

describe('subtraction calculator', () => {
  it('subtracts with the keypad and displays a negative result', async () => {
    fetchMock.mockResolvedValueOnce(reply(-5))
    const { press, value } = openCalculator()

    for (const key of ['5', 'Subtract', '1', '0', 'Equals']) await press(key)

    expect(requestBody()).toEqual({ operation: 'subtract', a: 5, b: 10 })
    await waitFor(() => expect(value()).toBe('-5'))
    await press('Equals')
    expect(value()).toBe('-5')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('subtracts decimal operands with the keyboard', async () => {
    fetchMock.mockResolvedValueOnce(reply(8.2))
    const { user, value } = openCalculator()

    await user.keyboard('10.5-2.3=')

    expect(requestBody()).toEqual({ operation: 'subtract', a: 10.5, b: 2.3 })
    await waitFor(() => expect(value()).toBe('8.2'))
  })

  it('evaluates mixed chains left to right', async () => {
    fetchMock.mockResolvedValueOnce(reply(7)).mockResolvedValueOnce(reply(11)).mockResolvedValueOnce(reply(9))
    const { user, value } = openCalculator()

    await user.keyboard('12-5+')
    await screen.findByText('7 +')
    await user.keyboard('4-')
    await screen.findByText('11 −')
    await user.keyboard('2=')

    expect(requestBody(0)).toEqual({ operation: 'subtract', a: 12, b: 5 })
    expect(requestBody(1)).toEqual({ operation: 'add', a: 7, b: 4 })
    expect(requestBody(2)).toEqual({ operation: 'subtract', a: 11, b: 2 })
    await waitFor(() => expect(value()).toBe('9'))
  })

  it.each([
    ['8+-', '8 −', 'subtract', 6],
    ['8-+', '8 +', 'add', 10],
  ])('replaces the pending operator in %s before a right operand', async (keys, pending, operation, result) => {
    fetchMock.mockResolvedValueOnce(reply(result))
    const { user, value } = openCalculator()

    await user.keyboard(keys)
    expect(screen.getByText(pending)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    await user.keyboard('2=')

    expect(requestBody()).toEqual({ operation, a: 8, b: 2 })
    await waitFor(() => expect(value()).toBe(String(result)))
  })

  it('continues from the full prior result and starts fresh on digit entry', async () => {
    fetchMock.mockResolvedValueOnce(reply(0.30000000000000004)).mockResolvedValueOnce(reply(-0.7)).mockResolvedValueOnce(reply(6))
    const { user, value } = openCalculator()

    await user.keyboard('0.1+0.2=')
    await waitFor(() => expect(value()).toBe('0.3'))
    await user.keyboard('-1=')
    expect(requestBody(1)).toEqual({ operation: 'subtract', a: 0.30000000000000004, b: 1 })
    await waitFor(() => expect(value()).toBe('-0.7'))

    await user.keyboard('9-3=')
    expect(requestBody(2)).toEqual({ operation: 'subtract', a: 9, b: 3 })
    await waitFor(() => expect(value()).toBe('6'))
  })

  it('preserves the pending subtraction on failure and retries with the corrected operand', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(reply(3))
    const { user, value } = openCalculator()

    await user.keyboard('5-4=')
    expect((await screen.findByRole('alert')).textContent).toContain('Could not reach')
    expect(screen.getByText('5 − 4')).toBeTruthy()
    expect(value()).toBe('4')

    await user.keyboard('{Backspace}2=')
    expect(requestBody(1)).toEqual({ operation: 'subtract', a: 5, b: 2 })
    await waitFor(() => expect(value()).toBe('3'))
  })

  it('ignores a cleared subtraction after a newer calculation returns', async () => {
    const stale = deferredResponse()
    fetchMock.mockImplementationOnce(() => stale.promise).mockResolvedValueOnce(reply(15))
    const { press, user, value } = openCalculator()

    await user.keyboard('5-10+')
    expect(screen.getByRole('button', { name: 'Equals' }).getAttribute('aria-disabled')).toBe('true')
    expect(requestBody()).toEqual({ operation: 'subtract', a: 5, b: 10 })

    await press('Clear')
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    await user.keyboard('7+8=')
    await waitFor(() => expect(value()).toBe('15'))

    await act(async () => stale.resolve(reply(-5)))
    expect(value()).toBe('15')
    expect(screen.getByRole('group', { name: 'Calculation expression' }).textContent).toBe('7 + 8 =')
    expect(screen.queryByText('-5 +')).toBeNull()
  })
})

describe('keypad layout and controls', () => {
  it('uses Backspace for one digit, CE for the right entry, and C for the whole calculation', async () => {
    fetchMock.mockResolvedValueOnce(reply(19))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('12+85')
    await press('Backspace')
    expect(value()).toBe('8')
    await press('Contextual percentage')
    expect(value()).toBe('8%')
    await press('Clear entry')
    expect(value()).toBe('0')
    expect(screen.getByText('12 + 0')).toBeTruthy()
    await user.keyboard('7=')

    await waitFor(() => expect(value()).toBe('19'))
    expect(requestBody()).toEqual({ operation: 'add', a: 12, b: 7 })
    await press('Clear')
    expect(value()).toBe('0')
    expect(screen.queryByRole('group', { name: 'Calculation expression' })).toBeNull()
  })

  it('lets CE cancel an in-flight request while preserving its pending operator', async () => {
    const pending = deferredResponse()
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(reply(4))
    const { press, user, value } = openCalculator()

    await user.keyboard('8/4=')
    await press('Clear entry')
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    await act(async () => pending.resolve(reply(2)))
    expect(value()).toBe('0')
    expect(screen.getByText('8 ÷ 0')).toBeTruthy()

    await user.keyboard('2=')
    await waitFor(() => expect(value()).toBe('4'))
    expect(requestBody(1)).toEqual({ operation: 'divide', a: 8, b: 2 })
  })

  it('places the Advanced keys in the second row and follows the full visual Tab order', async () => {
    const { press, user } = openCalculator()
    const equals = screen.getByRole('button', { name: 'Equals' })
    const keypad = equals.parentElement!
    expect(within(keypad).queryByRole('button', { name: 'Power' })).toBeNull()

    await press('Advanced')
    expect(within(keypad).queryByRole('button', { name: 'Percent of value' })).toBeNull()
    const contextual = within(keypad).getByRole('button', { name: 'Contextual percentage', description: /mark the right operand/i })
    expect(within(keypad).getByRole('button', { name: 'Power' }).textContent).toBe('xʸ')
    expect(within(keypad).getByRole('button', { name: 'Square root' }).textContent).toBe('√')
    expect(contextual.textContent).toBe('%')

    screen.getByRole('status', { name: 'Calculator display' }).focus()
    for (const name of ['Clear entry', 'Clear', 'Contextual percentage', 'Backspace', 'Power', 'Square root', 'Divide', '7', '8', '9', 'Multiply', '4', '5', '6', 'Subtract', '1', '2', '3', 'Add', 'Toggle sign', '0', 'Decimal point', 'Equals']) {
      await user.tab()
      expect(document.activeElement).toBe(within(keypad).getByRole('button', { name }))
    }
  })
})

describe('advanced power', () => {
  it('enables power only in Advanced mode and chains it from left to right', async () => {
    fetchMock.mockResolvedValueOnce(reply(5)).mockResolvedValueOnce(reply(25))
    const { press, user, value } = openCalculator()

    expect(screen.getByRole('button', { name: 'Modes', description: 'Standard' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Power' })).toBeNull()
    await user.keyboard('2+3^')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(value()).toBe('3')

    await press('Advanced')
    expect(screen.getByRole('button', { name: 'Power' }).textContent).toContain('xʸ')
    await user.keyboard('^')
    await screen.findByText('5 ^')
    await user.keyboard('2=')

    expect(requestBody()).toEqual({ operation: 'add', a: 2, b: 3 })
    expect(requestBody(1)).toEqual({ operation: 'power', a: 5, b: 2 })
    await waitFor(() => expect(value()).toBe('25'))
  })

  it('preserves the pending power, in-flight request, and result when switching modes', async () => {
    const response = deferredResponse()
    fetchMock.mockReturnValueOnce(response.promise)
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('2')
    await press('Power')
    await user.keyboard('3')
    await press('Standard')
    expect(screen.queryByRole('button', { name: 'Power' })).toBeNull()
    expect(screen.getByText('2 ^ 3')).toBeTruthy()
    expect(value()).toBe('3')

    await user.keyboard('=')
    expect(requestBody()).toEqual({ operation: 'power', a: 2, b: 3 })
    expect(screen.getByRole('button', { name: 'Equals' }).getAttribute('aria-disabled')).toBe('true')
    await press('Advanced')
    expect(screen.getByRole('button', { name: 'Modes', description: 'Advanced' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Equals' }).getAttribute('aria-disabled')).toBe('true')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)

    await act(async () => response.resolve(reply(8)))
    expect(value()).toBe('8')
    await press('Standard')
    expect(value()).toBe('8')
  })
})

describe('advanced square root', () => {
  it('applies to a standalone input or result in Advanced mode', async () => {
    fetchMock.mockResolvedValueOnce(reply(9)).mockResolvedValueOnce(reply(3))
    const { press, user, value } = openCalculator()

    expect(screen.queryByRole('button', { name: 'Square root' })).toBeNull()
    await press('Advanced')
    await user.keyboard('81')
    await press('Square root')

    expect(requestBody()).toEqual({ operation: 'sqrt', a: 81 })
    await waitFor(() => expect(value()).toBe('9'))
    await press('Square root')
    expect(requestBody(1)).toEqual({ operation: 'sqrt', a: 9 })
    await waitFor(() => expect(value()).toBe('3'))
  })

  it('preserves the pending operation and uses the full right operand across modes', async () => {
    const response = deferredResponse()
    const root = 1.4142135623730951
    fetchMock.mockReturnValueOnce(response.promise).mockResolvedValueOnce(reply(2 + root))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('2+')
    await press('Square root')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText('2 +')).toBeTruthy()

    await user.keyboard('2')
    await press('Square root')
    expect(requestBody()).toEqual({ operation: 'sqrt', a: 2 })
    await press('Standard')
    expect(screen.queryByRole('button', { name: 'Square root' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Equals' }).getAttribute('aria-disabled')).toBe('true')

    await act(async () => response.resolve(reply(root)))
    expect(screen.getByText('2 + 1.41421356237')).toBeTruthy()
    expect(value()).toBe('1.41421356237')
    await user.keyboard('=')
    expect(requestBody(1)).toEqual({ operation: 'add', a: 2, b: root })
    await waitFor(() => expect(value()).toBe('3.41421356237'))
  })

  it('allows correcting and retrying square root after a negative-input error', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({
        error: { code: 'INVALID_SQRT', message: 'Square root requires a non-negative number.' },
      }, { status: 422 }))
      .mockResolvedValueOnce(reply(3))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('2+')
    await press('Toggle sign')
    await user.keyboard('9')
    await press('Square root')
    expect(requestBody()).toEqual({ operation: 'sqrt', a: -9 })
    expect((await screen.findByRole('alert')).textContent).toBe('Square root requires a non-negative number.')
    expect(screen.getByText('2 + √(-9)')).toBeTruthy()
    expect(value()).toBe('-9')

    await press('Toggle sign')
    expect(value()).toBe('9')
    await press('Square root')
    expect(requestBody(1)).toEqual({ operation: 'sqrt', a: 9 })
    await waitFor(() => expect(value()).toBe('3'))
    expect(screen.getByText('2 + 3')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('advanced percentages', () => {
  it('confirms a standalone number and applies a typed rate to that value', async () => {
    fetchMock.mockResolvedValueOnce(reply(9.9))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('99=')
    expect(screen.getByRole('group', { name: 'Calculation expression' }).textContent).toBe('99 =')
    expect(value()).toBe('99')
    expect(fetchMock).not.toHaveBeenCalled()

    await user.keyboard('10%')
    expect(requestBody()).toEqual({ operation: 'percentage', a: 99, b: 10 })
    await waitFor(() => expect(value()).toBe('9.9'))
    expect(screen.getByRole('group', { name: 'Calculation expression' }).textContent).toBe('99 × 10% =')
  })

  it('accepts keypad digits and percentage during a request and uses the result as the base', async () => {
    const addition = deferredResponse()
    fetchMock.mockReturnValueOnce(addition.promise).mockResolvedValueOnce(reply(19.7))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('164+33=')
    expect(screen.getByRole('button', { name: '1' }).hasAttribute('disabled')).toBe(false)
    await press('1')
    await press('0')
    await press('Contextual percentage')
    expect(value()).toBe('33')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => addition.resolve(reply(197)))
    await waitFor(() => expect(value()).toBe('19.7'))
    expect(requestBody(1)).toEqual({ operation: 'percentage', a: 197, b: 10 })
    expect(screen.getByRole('group', { name: 'Calculation expression' }).textContent).toBe('197 × 10% =')
  })

  it('keeps the failed operands editable even if keys were pressed during the request', async () => {
    const division = deferredResponse()
    fetchMock.mockReturnValueOnce(division.promise).mockResolvedValueOnce(reply(4))
    const { user, value } = openCalculator()

    await user.keyboard('8/0=72')
    await act(async () => division.resolve(Response.json({
      error: { code: 'DIVISION_BY_ZERO', message: 'Division by zero is not allowed.' },
    }, { status: 422 })))
    expect(value()).toBe('0')
    expect((await screen.findByRole('alert')).textContent).toContain('Division by zero')
    await user.keyboard('2=')
    await waitFor(() => expect(value()).toBe('4'))
    expect(requestBody(1)).toEqual({ operation: 'divide', a: 8, b: 2 })
  })

  it('finds a percentage of a value through multiplication and starts a new chain from the result', async () => {
    fetchMock.mockResolvedValueOnce(reply(30)).mockResolvedValueOnce(reply(35))
    const { press, user, value } = openCalculator()

    await user.keyboard('50=10%')
    expect(value()).toBe('10')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Contextual percentage' })).toBeNull()
    await press('Clear')
    await press('Advanced')
    await user.keyboard('150*')
    await press('Contextual percentage')
    await user.keyboard('20')
    expect(value()).toBe('20')
    await press('Contextual percentage')
    expect(value()).toBe('20%')
    expect(fetchMock).not.toHaveBeenCalled()
    await user.keyboard('=')

    expect(requestBody()).toEqual({ operation: 'multiply', a: 150, b: 20, percentage: true })
    await waitFor(() => expect(value()).toBe('30'))

    await user.keyboard('+5=')
    expect(requestBody(1)).toEqual({ operation: 'add', a: 30, b: 5 })
    await waitFor(() => expect(value()).toBe('35'))
  })

  it('keeps the contextual marker across modes and consumes it once per step in a chain', async () => {
    fetchMock.mockResolvedValueOnce(reply(180)).mockResolvedValueOnce(reply(18))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('150+20')
    await press('Contextual percentage')
    expect(value()).toBe('20%')
    expect(fetchMock).not.toHaveBeenCalled()

    await press('Standard')
    expect(screen.queryByRole('button', { name: 'Contextual percentage' })).toBeNull()
    expect(value()).toBe('20%')
    await user.keyboard('*')
    await screen.findByText('180 ×')
    expect(requestBody()).toEqual({ operation: 'add', a: 150, b: 20, percentage: true })
    await user.keyboard('10')
    expect(value()).toBe('10')

    await press('Advanced')
    await press('Contextual percentage')
    await user.keyboard('=')
    expect(requestBody(1)).toEqual({ operation: 'multiply', a: 180, b: 10, percentage: true })
    await waitFor(() => expect(value()).toBe('18'))
  })

  it('toggles the marker, keeps it while editing, and clears it when the right operand is erased', async () => {
    fetchMock.mockResolvedValueOnce(reply(104))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('100')
    await press('Contextual percentage')
    expect(value()).toBe('100')
    await user.keyboard('+')
    await press('Contextual percentage')
    expect(value()).toBe('100')

    await user.keyboard('2')
    await press('Contextual percentage')
    expect(value()).toBe('2%')
    await press('Contextual percentage')
    expect(value()).toBe('2')
    await press('Contextual percentage')
    await user.keyboard('5{Backspace}')
    expect(value()).toBe('2%')
    await user.keyboard('{Backspace}4')
    expect(value()).toBe('4')
    expect(fetchMock).not.toHaveBeenCalled()

    await user.keyboard('=')
    expect(requestBody()).toEqual({ operation: 'add', a: 100, b: 4 })
    await waitFor(() => expect(value()).toBe('104'))
  })

  it('applies square root to the marked right operand before contextual evaluation', async () => {
    fetchMock.mockResolvedValueOnce(reply(3)).mockResolvedValueOnce(reply(206))
    const { press, user, value } = openCalculator()

    await press('Advanced')
    await user.keyboard('200+9')
    await press('Contextual percentage')
    await press('Square root')
    expect(requestBody()).toEqual({ operation: 'sqrt', a: 9 })
    await waitFor(() => expect(value()).toBe('3%'))
    await user.keyboard('=')
    expect(requestBody(1)).toEqual({ operation: 'add', a: 200, b: 3, percentage: true })
    await waitFor(() => expect(value()).toBe('206'))
  })
})
