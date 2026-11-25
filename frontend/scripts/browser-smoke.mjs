import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseURL = process.argv[2] ?? 'http://127.0.0.1:5173'
const apiURL = new URL('/api/calculate', baseURL).href
const browser = await chromium.launch({ timeout: 15_000 })

try {
  const page = await browser.newPage({ baseURL })
  page.setDefaultTimeout(10_000)
  await page.goto('/')
  const button = name => page.getByRole('button', { name, exact: true })
  const display = page.getByRole('status', { name: 'Calculator display' })
  const expectDisplay = value => display.and(page.getByText(value, { exact: true })).waitFor()

  async function pressCalculation(name, expectedRequest, expectedStatus = 200) {
    const [response] = await Promise.all([
      page.waitForResponse(reply => reply.url() === apiURL && reply.request().method() === 'POST'),
      button(name).click(),
    ])
    assert.deepEqual(response.request().postDataJSON(), expectedRequest)
    assert.equal(response.status(), expectedStatus)
    return response.json()
  }

  await button('1').click()
  await button('Divide').click()
  await button('3').click()
  const { result: quotient } = await pressCalculation('Multiply', { operation: 'divide', a: 1, b: 3 })
  assert.equal(quotient, 0.3333333333333333)
  await expectDisplay('0.333333333333')
  await button('3').click()
  assert.deepEqual(
    await pressCalculation('Equals', { operation: 'multiply', a: quotient, b: 3 }),
    { result: 1 },
  )
  await expectDisplay('1')
  console.log('PASS 1 ÷ 3 × 3 = 1, with the full quotient sent to Go')

  await button('Clear').click()
  await button('8').click()
  await button('Divide').click()
  await button('0').click()
  const { error } = await pressCalculation('Equals', { operation: 'divide', a: 8, b: 0 }, 422)
  assert.equal(error.code, 'DIVISION_BY_ZERO')
  const alert = page.getByRole('alert')
  await alert.and(page.getByText(error.message, { exact: true })).waitFor()
  await expectDisplay('0')

  await button('Backspace').click()
  await button('2').click()
  assert.deepEqual(
    await pressCalculation('Equals', { operation: 'divide', a: 8, b: 2 }),
    { result: 4 },
  )
  await expectDisplay('4')
  await alert.waitFor({ state: 'hidden' })
  console.log('PASS 8 ÷ 0 shows the Go error, then correcting the divisor to 2 gives 4')

  await button('Clear').click()
  await button('Advanced').click()
  for (const name of ['1', '5', '0', 'Divide', '0', 'Contextual percentage']) {
    await button(name).click()
  }
  await expectDisplay('0%')
  await button('Standard').click()
  await button('Contextual percentage').waitFor({ state: 'hidden' })
  await expectDisplay('0%')

  const { error: percentageError } = await pressCalculation(
    'Equals', { operation: 'divide', a: 150, b: 0, percentage: true }, 422,
  )
  assert.equal(percentageError.code, 'DIVISION_BY_ZERO')
  await alert.and(page.getByText(percentageError.message, { exact: true })).waitFor()
  await expectDisplay('0%')

  await button('Advanced').click()
  await page.getByRole('button', { name: 'Contextual percentage', pressed: true }).waitFor()
  await alert.waitFor()
  await button('2').click()
  await button('0').click()
  await expectDisplay('20%')
  assert.deepEqual(
    await pressCalculation('Equals', { operation: 'divide', a: 150, b: 20, percentage: true }),
    { result: 750 },
  )
  await expectDisplay('750')
  await alert.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Contextual percentage', pressed: false }).waitFor()
  console.log('PASS 150 ÷ 0% preserves the marker across modes and correcting the rate to 20% gives 750')
} finally {
  await browser.close()
}
