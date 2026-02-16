/**
 * Máscara de valor em reais (BRL): formata e parseia strings no padrão 1.234,56
 */

/** Formata um número para exibição em reais (ex: 1234.56 → "1.234,56", 0 → "0,00") */
export function formatCurrencyInput(value: number): string {
  const fixed = value.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots},${decPart}`
}

/**
 * Converte string digitada (ex: "1.234,56" ou "1234,56") em número.
 * Aceita apenas dígitos e uma vírgula como separador decimal.
 */
export function parseCurrencyInput(str: string): number {
  const cleaned = str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '.') return 0
  const num = parseFloat(cleaned)
  return Number.isNaN(num) ? 0 : num
}

/**
 * Aplica máscara enquanto o usuário digita: só permite dígitos e uma vírgula.
 * Retorna o valor já formatado para exibição (ex: "1.234,56").
 */
export function maskCurrencyInput(raw: string): string {
  const onlyDigitsAndComma = raw.replace(/[^\d,]/g, '')
  const parts = onlyDigitsAndComma.split(',')
  if (parts.length > 2) {
    parts.length = 2
  }
  const intPart = (parts[0] ?? '').replace(/\D/g, '')
  const decPart = (parts[1] ?? '').replace(/\D/g, '').slice(0, 2)
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (decPart.length === 0 && !onlyDigitsAndComma.endsWith(',')) {
    return intFormatted || ''
  }
  return `${intFormatted},${decPart}`
}

/**
 * Dado o valor já mascarado (ex: "1.234,56"), retorna o número correspondente.
 */
export function maskedToNumber(masked: string): number {
  return parseCurrencyInput(masked)
}
