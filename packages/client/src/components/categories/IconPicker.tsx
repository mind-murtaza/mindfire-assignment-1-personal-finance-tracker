import { useMemo } from 'react'
import type { HTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { ICONS, type IconKey } from '../../lib/utils/icons'

interface IconPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: IconKey
  onChange: (next: IconKey) => void
}

export default function IconPicker({ value, onChange, className, ...props }: IconPickerProps) {
  const options = useMemo(() => Object.keys(ICONS) as IconKey[], [])
  return (
    <div className={`grid grid-cols-6 gap-2 ${className ?? ''}`} {...props}>
      {options.map((k) => {
        const Cmp = ICONS[k]
        const selected = value === k
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`flex items-center justify-center h-10 rounded-md border ${selected ? 'border-primary-200 bg-primary-50' : 'border-neutral-200 hover:bg-neutral-50'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
            aria-pressed={selected}
            aria-label={k}
            title={k}
          >
            {selected ? <Check className="h-4 w-4 text-primary-600" /> : <Cmp className="h-4 w-4 text-neutral-700" />}
          </button>
        )
      })}
    </div>
  )
}


