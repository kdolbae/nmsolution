/**
 * 견적 화면 공용 작은 부품(서버·클라이언트 모두에서 씀). 색은 토큰 클래스만, 모서리 rounded-none(DESIGN_SYSTEM).
 */
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const inputCls =
  'h-10 w-full rounded-none border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60'
export const selectCls = inputCls + ' pr-8'
export const textareaCls =
  'w-full rounded-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60'

type BtnVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-navy text-navy-foreground hover:bg-navy/90',
  accent: 'bg-electric text-electric-foreground hover:bg-electric/90',
  outline: 'border border-border bg-background text-foreground hover:bg-secondary',
  ghost: 'text-foreground/75 hover:bg-secondary hover:text-foreground',
  danger: 'border border-destructive/40 bg-background text-destructive hover:bg-destructive/5',
}

export function btnCls(variant: BtnVariant = 'outline', size: 'sm' | 'md' | 'lg' = 'md') {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-none font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    size === 'sm' ? 'h-8 px-2.5 text-xs' : size === 'lg' ? 'h-12 px-5 text-base' : 'h-10 px-4 text-sm',
    BTN[variant],
  )
}

export function Btn({
  variant = 'outline',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  return <button type="button" className={cn(btnCls(variant, size), className)} {...props} />
}

export function LinkBtn({ href, variant = 'outline', size = 'md', className, children }: { href: string; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(btnCls(variant, size), className)}>
      {children}
    </Link>
  )
}

type Tone = 'neutral' | 'navy' | 'accent' | 'ok' | 'warn' | 'danger' | 'muted'
const TONE: Record<Tone, string> = {
  neutral: 'border-border bg-secondary text-foreground',
  navy: 'border-navy bg-navy text-navy-foreground',
  accent: 'border-electric/40 bg-electric/10 text-electric',
  ok: 'border-[color:var(--sb-ok)]/40 bg-[color:var(--sb-ok)]/10 text-[color:var(--sb-ok)]',
  warn: 'border-[color:var(--sb-warn)]/40 bg-[color:var(--sb-warn)]/10 text-[color:var(--sb-warn)]',
  danger: 'border-destructive/40 bg-destructive/5 text-destructive',
  muted: 'border-border bg-background text-muted-foreground',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap', TONE[tone], className)}>{children}</span>
}

/** "샘플" 표식(기준값·마스터가 아직 실자료가 아님) */
export function SampleBadge() {
  return <Badge tone="warn">샘플</Badge>
}

export const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{won(value)}</span>
}

export function Card({ title, description, actions, className, children }: { title?: string; description?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('bg-background p-4 ring-1 ring-border lg:p-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title && <h2 className="text-base font-bold tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>
}

export function ErrorLine({ error }: { error: string | null | undefined }) {
  if (!error) return null
  return (
    <p role="alert" className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  )
}

export function FieldRow({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

/** 표: 좁은 화면에서 가로 스크롤은 표 상자 안에서만 */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">{children}</div>
}
export const thCls = 'border-b border-border px-2 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap'
export const tdCls = 'border-b border-border px-2 py-2 align-top'

export function Tabs({ items, current }: { items: { href: string; label: string; key: string; badge?: number }[]; current: string }) {
  return (
    <nav className="-mx-4 flex overflow-x-auto border-b border-border px-4 lg:mx-0 lg:px-0" aria-label="탭">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? 'page' : undefined}
          className={cn(
            'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            t.key === current ? 'border-electric text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
          {t.badge ? <span className="bg-electric px-1 font-mono text-[11px] text-electric-foreground">{t.badge}</span> : null}
        </Link>
      ))}
    </nav>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-lg font-semibold tabular-nums', tone === 'danger' && 'text-destructive', tone === 'warn' && 'text-[color:var(--sb-warn)]', tone === 'ok' && 'text-[color:var(--sb-ok)]')}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}
