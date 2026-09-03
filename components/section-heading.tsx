import { cn } from '@/lib/utils'

export function SectionHeading({
  kicker,
  title,
  description,
  align = 'left',
  tone = 'light',
  className,
}: {
  kicker?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: 'left' | 'center'
  tone?: 'light' | 'dark'
  className?: string
}) {
  const dark = tone === 'dark'
  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {kicker && (
        <p
          className={cn(
            'text-kicker flex items-center gap-3',
            dark ? 'text-navy-foreground/60' : 'text-muted-foreground',
          )}
        >
          <span className="h-px w-8 bg-electric" aria-hidden />
          {kicker}
        </p>
      )}
      <h2
        className={cn(
          'max-w-3xl text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em] sm:text-4xl lg:text-5xl',
          dark ? 'text-navy-foreground' : 'text-foreground',
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'max-w-xl text-pretty text-base leading-relaxed lg:text-lg',
            dark ? 'text-navy-foreground/70' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
