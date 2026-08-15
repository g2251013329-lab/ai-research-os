import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-fg hover:brightness-110',
  accent:
    'bg-accent text-white hover:bg-accent-dark',
  secondary:
    'border border-border bg-surface text-foreground hover:bg-surface-hover',
  ghost:
    'text-foreground/60 hover:bg-surface-hover hover:text-foreground',
  destructive:
    'bg-danger text-white hover:brightness-110',
}

const SIZES: Record<string, string> = {
  sm: 'px-2 py-1 text-[12px] rounded-md',
  md: 'px-3 py-1.5 text-[13px] rounded-lg',
  icon: 'p-1.5 rounded-md',
}

export default function Button({
  variant = 'accent',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: keyof typeof SIZES
  children: ReactNode
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
