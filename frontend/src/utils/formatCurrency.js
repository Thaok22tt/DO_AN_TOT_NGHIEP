export const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    style: 'currency',
  }).format(Number(value) || 0)
}

export const sanitizeIntegerInput = (value) => {
  const text = String(value ?? '').trim()
  // Only treat as a decimal float when there are at most 2 trailing zeros (DECIMAL 12,2 from DB).
  // "55.000" must NOT match here — it is Vietnamese thousand-separator notation for 55,000.
  if (/^\d+\.0{1,2}$/.test(text)) return String(Math.trunc(Number(text)))

  return text.replace(/\D/g, '')
}

export const sanitizeDecimalInput = (value) => {
  const normalized = String(value ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '')
  const [integer = '', ...decimalParts] = normalized.split('.')
  const decimal = decimalParts.join('')

  return decimalParts.length > 0 ? `${integer}.${decimal}` : integer
}

export const formatCurrencyInput = (value) => {
  const text = String(value ?? '').trim()
  const decimalValue = text.match(/^\d+\.\d{1,2}$/) ? String(Math.trunc(Number(text))) : text
  const digits = sanitizeIntegerInput(decimalValue)

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export const parseCurrency = (value) => {
  const text = String(value ?? '').trim()
  if (/^\d+\.\d{1,2}$/.test(text)) return Math.trunc(Number(text)) || 0

  return Number(sanitizeIntegerInput(text)) || 0
}
