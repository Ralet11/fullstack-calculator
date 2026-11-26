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
  async function selectMode(name) {
    await button('Modes').click()
    await button(name).click()
  }

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
  await selectMode('Advanced')
  for (const name of ['1', '5', '0', 'Divide', '0', 'Contextual percentage']) {
    await button(name).click()
  }
  await expectDisplay('0%')
  await selectMode('Standard')
  await button('Contextual percentage').waitFor({ state: 'hidden' })
  await expectDisplay('0%')

  const { error: percentageError } = await pressCalculation(
    'Equals', { operation: 'divide', a: 150, b: 0, percentage: true }, 422,
  )
  assert.equal(percentageError.code, 'DIVISION_BY_ZERO')
  await alert.and(page.getByText(percentageError.message, { exact: true })).waitFor()
  await expectDisplay('0%')

  await selectMode('Advanced')
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

  await button('Percent of value').waitFor({ state: 'hidden' })
  await button('Clear').click()
  for (const name of ['1', '5', '0', 'Multiply', '2', '0', 'Contextual percentage']) {
    await button(name).click()
  }
  await expectDisplay('20%')
  assert.deepEqual(
    await pressCalculation('Equals', { operation: 'multiply', a: 150, b: 20, percentage: true }),
    { result: 30 },
  )
  await expectDisplay('30')
  console.log('PASS 150 × 20% = 30 using the single percentage key')

  await page.setViewportSize({ width: 375, height: 650 })
  const historyButton = button('History')
  await historyButton.click()
  const drawer = page.getByRole('dialog', { name: 'Recent calculations' })
  await drawer.waitFor()
  const entries = drawer.getByRole('listitem')
  assert.match(await entries.first().textContent(), /150 × 20%.*30/)
  assert.match(await entries.nth(1).textContent(), /150 ÷ 20%.*750/)
  await drawer.getByRole('button', { name: 'Close', exact: true }).and(page.locator(':focus')).waitFor()
  await page.keyboard.press('Tab')
  await drawer.getByRole('button', { name: 'Clear history', exact: true }).and(page.locator(':focus')).waitFor()
  await page.keyboard.press('Tab')
  await drawer.getByRole('button', { name: 'Close', exact: true }).and(page.locator(':focus')).waitFor()
  await page.keyboard.press('Escape')
  await drawer.waitFor({ state: 'hidden' })
  await historyButton.and(page.locator(':focus')).waitFor()
  await expectDisplay('30')
  console.log('PASS mobile history shows the latest live calculation, wraps Tab, and restores focus on Escape')

  await page.setViewportSize({ width: 1440, height: 900 })
  await display.focus()
  for (const name of ['Clear entry', 'Clear', 'Contextual percentage', 'Backspace', 'Power', 'Square root', 'Divide']) {
    await page.keyboard.press('Tab')
    await button(name).and(page.locator(':focus')).waitFor()
  }

  const info = button('Advanced help')
  const help = page.getByRole('complementary', { name: 'Advanced help' })
  const keypad = page.locator('[data-calculator-keys]')
  const beforeHelp = await keypad.boundingBox()
  await button('Power').hover()
  assert.equal(await help.count(), 0)
  assert.equal(await page.getByRole('tooltip').count(), 0)
  await info.focus()
  await page.keyboard.press('Enter')
  await help.getByText(/150 × 20% = 30/).waitFor()
  assert.equal(await info.getAttribute('aria-expanded'), 'true')
  const helpBox = await help.boundingBox()
  assert.ok(helpBox.x >= beforeHelp.x + beforeHelp.width)
  assert.ok(helpBox.x + helpBox.width <= page.viewportSize().width)
  assert.deepEqual(await keypad.boundingBox(), beforeHelp)
  await help.getByRole('button', { name: 'Close help' }).and(page.locator(':focus')).waitFor()
  await page.keyboard.press('Escape')
  await help.waitFor({ state: 'hidden' })
  await info.and(page.locator(':focus')).waitFor()
  await expectDisplay('30')

  const touch = await browser.newPage({ baseURL, viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true })
  try {
    await touch.goto('/')
    await touch.getByRole('button', { name: 'Modes' }).tap()
    await touch.getByRole('button', { name: 'Advanced', exact: true }).tap()
    const touchInfo = touch.getByRole('button', { name: 'Advanced help' })
    const touchHelp = touch.getByRole('dialog', { name: 'Advanced help' })
    const touchKeypad = touch.locator('[data-calculator-keys]')
    const touchDisplay = touch.getByRole('status', { name: 'Calculator display' })
    const before = await touchDisplay.boundingBox()
    const beforeKeypad = await touchKeypad.boundingBox()
    await touchInfo.tap()
    await touchHelp.getByText(/√9 = 3/).waitFor()
    assert.deepEqual(await touchDisplay.boundingBox(), before)
    assert.deepEqual(await touchKeypad.boundingBox(), beforeKeypad)
    assert.equal(await touch.evaluate(() => document.documentElement.scrollWidth), 320)
    await touchHelp.getByRole('button', { name: 'Close help' }).tap()
    await touchHelp.waitFor({ state: 'hidden' })
    await touchInfo.and(touch.locator(':focus')).waitFor()
  } finally {
    await touch.close()
  }
  console.log('PASS Advanced help docks on desktop and opens a mobile drawer without shifting the keypad')

  await button('Clear').click()
  await page.keyboard.press('9')
  await page.keyboard.press('9')
  await page.keyboard.press('=')
  await page.getByText('99 =', { exact: true }).waitFor()
  await expectDisplay('99')

  await button('Clear').click()
  for (const key of ['1', '6', '4', '+', '3', '3', '=']) await page.keyboard.press(key)
  await expectDisplay('197')
  await button('1').click()
  await button('0').click()
  const percentOfResult = await pressCalculation('Contextual percentage', { operation: 'percentage', a: 197, b: 10 })
  assert.deepEqual(percentOfResult, { result: 19.7 })
  await expectDisplay('19.7')
  await page.getByText('197 × 10% =', { exact: true }).waitFor()
  console.log('PASS standalone Equals retains the expression and a typed rate takes a percentage of the last result')

  await button('Clear').click()
  for (const name of ['8', 'Divide', '2']) await button(name).click()
  const equals = button('Equals')
  const focusedEquals = equals.and(page.locator(':focus-visible'))
  let releaseResponse
  const responseGate = new Promise(resolve => { releaseResponse = resolve })
  let submissions = 0
  const delayResponse = async route => {
    submissions++
    const response = await route.fetch()
    await responseGate
    await route.fulfill({ response })
  }
  await page.route(apiURL, delayResponse)
  try {
    await button('Decimal point').focus()
    await page.keyboard.press('Tab')
    await focusedEquals.waitFor()
    await page.keyboard.press('Space')
    await focusedEquals.and(page.locator('[aria-disabled="true"]')).waitFor()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await page.keyboard.press('=')
    await focusedEquals.and(page.locator('[aria-disabled="true"]')).waitFor()

    const received = page.waitForResponse(reply => reply.url() === apiURL && reply.request().method() === 'POST')
    releaseResponse()
    const response = await received
    assert.deepEqual(response.request().postDataJSON(), { operation: 'divide', a: 8, b: 2 })
    assert.equal(response.status(), 200)
    await expectDisplay('4')
    await focusedEquals.and(page.locator('[aria-disabled="false"]')).waitFor()
    assert.equal(submissions, 1)
    console.log('PASS Equals retains keyboard focus during the real API request and blocks repeated activation')
  } finally {
    releaseResponse()
    await page.unroute(apiURL, delayResponse)
  }
} finally {
  await browser.close()
}
