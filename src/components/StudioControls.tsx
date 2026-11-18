import React from 'react'

interface SwitchRowProps {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export const SwitchRow: React.FC<SwitchRowProps> = ({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}) => (
  <label className={`st-switch-row ${disabled ? 'is-disabled' : ''}`}>
    <span className="min-w-0">
      <span className="text-strong block text-sm font-semibold">{label}</span>
      {description && (
        <span className="text-muted mt-0.5 block text-xs leading-relaxed">
          {description}
        </span>
      )}
    </span>
    <input
      type="checkbox"
      role="switch"
      className="st-switch"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
)

interface RangeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  min: number
  max: number
  value: number
  onValueChange: (value: number) => void
}

export const RangeInput: React.FC<RangeInputProps> = ({
  min,
  max,
  value,
  onValueChange,
  className = '',
  ...rest
}) => {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <input
      {...rest}
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
      className={`st-range ${className}`}
      style={{ '--fill': `${fill}%` } as React.CSSProperties}
    />
  )
}
