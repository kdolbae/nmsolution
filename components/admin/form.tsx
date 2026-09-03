'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2, ChevronUp, ChevronDown, Loader2, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 bg-background p-6 ring-1 ring-border lg:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

export function Field({
  label,
  hint,
  value,
  onChange,
  multiline,
  rows = 3,
  placeholder,
  mono,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
  mono?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('rounded-none', mono && 'font-mono text-xs')}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('rounded-none', mono && 'font-mono text-xs')}
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** 문자열 배열 편집 (태그, 티커 등) */
export function StringListField({
  label,
  hint,
  values,
  onChange,
}: {
  label: string
  hint?: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={v}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
              className="rounded-none"
            />
            <IconBtn label="삭제" onClick={() => onChange(values.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </IconBtn>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit rounded-none" onClick={() => onChange([...values, ''])}>
          <Plus className="size-4" />
          항목 추가
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** 객체 배열 편집: 항목마다 render로 필드 구성 */
export function ListEditor<T>({
  items,
  onChange,
  render,
  create,
  title,
  addLabel = '항목 추가',
}: {
  items: T[]
  onChange: (v: T[]) => void
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode
  create: () => T
  title: (item: T, index: number) => string
  addLabel?: string
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-4 py-2">
            <span className="truncate text-sm font-semibold">
              <span className="mr-2 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
              {title(item, i) || '(제목 없음)'}
            </span>
            <div className="flex items-center gap-1">
              <IconBtn label="위로" onClick={() => move(i, -1)} disabled={i === 0}>
                <ChevronUp className="size-4" />
              </IconBtn>
              <IconBtn label="아래로" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                <ChevronDown className="size-4" />
              </IconBtn>
              <IconBtn label="삭제" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </IconBtn>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-4">
            {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit rounded-none" onClick={() => onChange([...items, create()])}>
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/** 저장/초기화 바 */
export function SaveBar({
  onSave,
  onReset,
  dirty,
}: {
  onSave: () => Promise<unknown>
  onReset?: () => Promise<unknown>
  dirty?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null)
      setSaved(false)
      try {
        await fn()
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 2500)
      } catch (e) {
        console.error('[admin-save]', e)
        setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
      }
    })

  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-8 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur lg:-mx-10 lg:px-10">
      <div className="flex items-center gap-3 text-sm">
        {error && <span className="text-destructive">{error}</span>}
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-electric">
            <Check className="size-4" />
            저장되었습니다
          </span>
        )}
        {!saved && !error && dirty && <span className="text-muted-foreground">저장되지 않은 변경사항이 있습니다</span>}
      </div>
      <div className="flex items-center gap-2">
        {onReset && (
          <Button
            type="button"
            variant="ghost"
            className="rounded-none"
            disabled={pending}
            onClick={() => {
              if (confirm('이 페이지의 내용을 기본값으로 되돌릴까요? 저장된 편집 내용이 삭제됩니다.')) run(onReset)
            }}
          >
            <RotateCcw className="size-4" />
            기본값으로
          </Button>
        )}
        <Button type="button" className="h-10 rounded-none px-6" disabled={pending} onClick={() => run(onSave)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          저장
        </Button>
      </div>
    </div>
  )
}
