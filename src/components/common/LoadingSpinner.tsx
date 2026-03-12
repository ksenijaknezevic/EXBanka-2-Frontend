interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'light' | 'dark'
  label?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

const colorClasses = {
  light: 'border-white/30 border-t-white',
  dark: 'border-gray-300 border-t-primary-700',
}

export default function LoadingSpinner({
  size = 'md',
  color = 'dark',
  label = 'Učitavanje...',
}: LoadingSpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center">
      <span
        className={[
          'rounded-full animate-spin',
          sizeClasses[size],
          colorClasses[color],
        ].join(' ')}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
