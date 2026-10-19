'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/** S3 프로젝트 탭(경로로 현재 탭을 고름) */
export function ProjectTabs({ id, badges }: { id: number; badges?: Partial<Record<string, number>> }) {
  const path = usePathname()
  const base = `/admin/est/${id}`
  const items = [
    { key: '', label: '개요' },
    { key: 'site', label: '현장 확인' },
    { key: 'v', label: '견적(판)' },
    { key: 'discuss', label: '토의' },
    { key: 'approval', label: '결재' },
    { key: 'exec', label: '실행' },
    { key: 'settle', label: '정산' },
    { key: 'log', label: '기록' },
  ]
  const rest = path.startsWith(base) ? path.slice(base.length).replace(/^\//, '') : ''
  const current = rest.split('/')[0] ?? ''
  return (
    <nav className="-mx-4 flex overflow-x-auto border-b border-border px-4 lg:mx-0 lg:px-0" aria-label="견적 건 탭">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.key ? `${base}/${t.key}` : base}
          aria-current={t.key === current ? 'page' : undefined}
          className={cn(
            'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            t.key === current ? 'border-electric text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
          {badges?.[t.key] ? <span className="bg-electric px-1 font-mono text-[11px] text-electric-foreground">{badges[t.key]}</span> : null}
        </Link>
      ))}
    </nav>
  )
}
