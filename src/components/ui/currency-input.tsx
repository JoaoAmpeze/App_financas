import * as React from 'react'
import { Input } from '@/components/ui/input'
import { maskCurrencyInput, formatCurrencyInput, maskedToNumber } from '@/lib/currencyMask'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (value: number) => void
  /** Exibe prefixo "R$ " no campo (default: true) */
  showPrefix?: boolean
}

function toDisplay(str: string, showPrefix: boolean): string {
  const s = str.trim()
  if (showPrefix && s) return `R$ ${s}`
  return s
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, showPrefix = true, className, placeholder = '0,00', ...props }, ref) => {
    const [displayStr, setDisplayStr] = React.useState(() =>
      value ? formatCurrencyInput(value) : ''
    )

    // Sincroniza com o value quando ele muda de fora (ex.: reset do formulário)
    const prevValueRef = React.useRef(value)
    React.useEffect(() => {
      if (prevValueRef.current !== value) {
        prevValueRef.current = value
        setDisplayStr(value ? formatCurrencyInput(value) : '')
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const withoutPrefix = showPrefix ? raw.replace(/^R\$\s?/, '').trim() : raw
      const masked = maskCurrencyInput(withoutPrefix)
      setDisplayStr(masked)
      const num = maskedToNumber(masked)
      prevValueRef.current = num
      onChange(num)
    }

    const displayValue = toDisplay(displayStr, showPrefix)

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(className)}
        {...props}
      />
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
