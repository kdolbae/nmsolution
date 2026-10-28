'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addQuote, renameQuote } from '@/app/actions/clients'
import { won } from '@/lib/clients/quote'

type QuoteItem = { id: number; label: string; number: string; supply: number; finalizedVersion: number | null; main: boolean }

/**
 * 한 업체의 견적서 목록 (본 견적 + 추가 견적, kevin 2026-10-28 "업체 별 공정(추가 공정), 견적서 추가가 가능해야 함").
 * 견적서마다 제안서·견적서·버전 기록·최종본 확정이 따로다. 계약·매출은 SBworks 엔엠솔루션 메뉴에서 견적서별로 만든다.
 */
export function QuoteSet({ currentId, quotes }: { currentId: number; quotes: QuoteItem[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [copy, setCopy] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const current = quotes.find((q) => q.id === currentId)
  const [name, setName] = useState(current?.label ?? '')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  const add = () => {
    setError('')
    start(async () => {
      try {
        const res = await addQuote(currentId, label, copy)
        setAdding(false)
        setLabel('')
        router.push(`/admin/clients/${res.id}?tab=quote`)
      } catch (e) {
        setError(e instanceof Error ? e.message : '만들지 못했습니다.')
      }
    })
  }
  const rename = () => {
    setError('')
    start(async () => {
      try {
        await renameQuote(currentId, name)
        setRenaming(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : '저장하지 못했습니다.')
      }
    })
  }
  const total = quotes.reduce((s, q) => s + q.supply, 0)

  return (
    <section className="mb-5 bg-background p-4 ring-1 ring-border" aria-label="견적서 목록">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold">견적서 {quotes.length}개</h2>
        {quotes.length > 1 && <span className="text-xs text-muted-foreground">합계 공급가 {won(total)}원</span>}
        <span className="ml-auto flex gap-2">
          {current && !renaming && (
            <button type="button" onClick={() => { setName(current.label); setRenaming(true) }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Pencil className="size-3.5" /> 이 견적서 이름
            </button>
          )}
          <Button size="sm" variant="outline" className="rounded-none" onClick={() => setAdding((v) => !v)}>
            <Plus /> 견적서 추가
          </Button>
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {quotes.map((q) => (
          <li key={q.id}>
            <Link
              href={`/admin/clients/${q.id}?tab=quote`}
              aria-current={q.id === currentId ? 'page' : undefined}
              className={`inline-flex items-center gap-2 border px-3 py-1.5 text-sm ${q.id === currentId ? 'border-navy bg-navy text-white' : 'border-border hover:bg-secondary'}`}
            >
              <span className="font-semibold">{q.label}</span>
              <span className={`text-xs ${q.id === currentId ? 'text-white/80' : 'text-muted-foreground'}`}>{q.number}</span>
              <span className="font-mono text-xs tabular-nums">{q.supply ? `${won(q.supply)}원` : '—'}</span>
              {q.finalizedVersion && <span className="text-[10px] font-semibold">최종 v{q.finalizedVersion}</span>}
            </Link>
          </li>
        ))}
      </ul>
      {renaming && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={current?.main ? '본 견적' : '추가 견적'} className="h-8 min-w-60 flex-1 border border-input bg-background px-2 text-sm" />
          <Button size="sm" className="rounded-none" disabled={pending} onClick={rename}>{pending && <Loader2 className="animate-spin" />}저장</Button>
          <Button size="sm" variant="ghost" className="rounded-none" onClick={() => setRenaming(false)}>취소</Button>
        </div>
      )}
      {adding && (
        <div className="mt-3 flex flex-col gap-2 bg-secondary/40 p-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            새 견적서 이름
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} placeholder="예: 추가 공정 - 배관 보온" className="h-9 border border-input bg-background px-2 text-sm font-normal" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} />
            지금 보고 있는 견적서({current?.label})를 복사해 시작
          </label>
          <p className="text-xs text-muted-foreground">기업정보는 이 업체 것을 그대로 쓰고, 견적서·버전 기록·최종본 확정은 따로입니다. 업체용 링크에는 아직 본 견적만 나옵니다.</p>
          <div className="flex gap-2">
            <Button size="sm" className="rounded-none" disabled={pending || !label.trim()} onClick={add}>{pending && <Loader2 className="animate-spin" />}만들기</Button>
            <Button size="sm" variant="ghost" className="rounded-none" onClick={() => setAdding(false)}>취소</Button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  )
}
