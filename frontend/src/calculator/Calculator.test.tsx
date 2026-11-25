import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Calculator } from './Calculator'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function openCalculator() {
  const user = userEvent.setup()
  render(<Calculator />)
  const calculator = within(screen.getByRole('region', { name: 'Calculator' }))
  return {
    user,
    press: (name: string) => user.click(calculator.getByRole('button', { name })),
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

  it('activates a keypad button with native keyboard focus', async () => {
    const { user, value } = openCalculator()
    const seven = screen.getByRole('button', { name: '7' })
    const visited = new Set<Element | null>()
    while (document.activeElement !== seven && !visited.has(document.activeElement)) {
      visited.add(document.activeElement)
      await user.tab()
    }
    expect(document.activeElement).toBe(seven)
    await user.keyboard('{Enter}')
    expect(value()).toBe('7')
  })

  it('shows loading, blocks duplicate calculations, and ignores a stale success after Clear', async () => {
    const stale = deferredResponse()
    const current = deferredResponse()
    fetchMock.mockImplementationOnce(() => stale.promise).mockImplementationOnce(() => current.promise)
    const { press, user, value } = openCalculator()

    await user.keyboard('2+3=')
    expect(screen.getByText('Calculating…')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Equals' }) as HTMLButtonElement).disabled).toBe(true)
    await user.keyboard('==')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await press('Clear')
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(value()).toBe('0')
    await user.keyboard('7+8=')
    await act(async () => stale.resolve(reply(5)))
    expect(value()).toBe('8')
    expect(screen.getByText('Calculating…')).toBeTruthy()

    await act(async () => current.resolve(reply(15)))
    expect(value()).toBe('15')
    expect(screen.queryByText('Calculating…')).toBeNull()
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
    expect(screen.getByText('7 +')).toBeTruthy()
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
    expect(screen.getByText('8 ÷')).toBeTruthy()
    expect(value()).toBe('0')

    await user.keyboard('{Backspace}2=')
    expect(requestBody(0)).toEqual({ operation: 'divide', a: 8, b: 0 })
    expect(requestBody(1)).toEqual({ operation: 'divide', a: 8, b: 2 })
    await waitFor(() => expect(value()).toBe('4'))
    expect(screen.queryByRole('alert')).toBeNull()
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
    expect(screen.getByText('5 −')).toBeTruthy()
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
    expect(screen.getByText('Calculating…')).toBeTruthy()
    expect(requestBody()).toEqual({ operation: 'subtract', a: 5, b: 10 })

    await press('Clear')
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    await user.keyboard('7+8=')
    await waitFor(() => expect(value()).toBe('15'))

    await act(async () => stale.resolve(reply(-5)))
    expect(value()).toBe('15')
    expect(screen.queryByText('-5 +')).toBeNull()
  })
})

describe('advanced power', () => {
  it('enables power only in Advanced mode and chains it from left to right', async () => {
    fetchMock.mockResolvedValueOnce(reply(5)).mockResolvedValueOnce(reply(25))
    const { press, user, value } = openCalculator()

    expect(screen.getByRole('button', { name: 'Standard', pressed: true })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Power' })).toBeNull()
    await user.keyboard('2+3^')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(value()).toBe('3')

    await press('Advanced')
    expect(screen.getByRole('button', { name: 'Power' }).textContent?.trim()).toBe('xʸ')
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
    expect(screen.getByText('2 ^')).toBeTruthy()
    expect(value()).toBe('3')

    await user.keyboard('=')
    expect(requestBody()).toEqual({ operation: 'power', a: 2, b: 3 })
    expect(screen.getByText('Calculating…')).toBeTruthy()
    await press('Advanced')
    expect(screen.getByRole('button', { name: 'Advanced', pressed: true })).toBeTruthy()
    expect(screen.getByText('Calculating…')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)

    await act(async () => response.resolve(reply(8)))
    expect(value()).toBe('8')
    await press('Standard')
    expect(value()).toBe('8')
  })
})
