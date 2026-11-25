const numericText = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

export function formatClipboardNumber(value: number): string {
  return Object.is(value, -0) ? '-0' : String(value)
}

export function parseClipboardEntry(text: string): string | null {
  const entry = text.trim()
  if (!numericText.test(entry)) return null

  const value = Number(entry)
  return Number.isFinite(value) ? formatClipboardNumber(value) : null
}

export function editableDecimal(entry: string): string {
  if (!entry.includes('e')) return entry

  // Pasted scientific notation stays compact until its digits are edited.
  const sign = entry.startsWith('-') ? '-' : ''
  const [coefficient, exponent] = entry.slice(sign.length).split('e')
  const [whole, fraction = ''] = coefficient.split('.')
  const digits = whole + fraction
  const decimalPoint = whole.length + Number(exponent)

  if (decimalPoint <= 0) return sign + '0.' + '0'.repeat(-decimalPoint) + digits
  if (decimalPoint >= digits.length) return sign + digits + '0'.repeat(decimalPoint - digits.length)
  return sign + digits.slice(0, decimalPoint) + '.' + digits.slice(decimalPoint)
}
