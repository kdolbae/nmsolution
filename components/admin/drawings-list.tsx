'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Eye, PencilRuler } from 'lucide-react'
import { Section, Field } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { createDrawingAction } from '@/app/actions/drawings'

type Item = {
  id: number
  title: string
  clientName: string | null
  clientSlug: string | null
  showOnPortal: boolean
  rev: number
  summary: string
  updatedAt: string
  updatedBy: string
}

/** 배관 도면 목록 + 새 도면(빈 도면 / 다른 도면 복사 / 도면 JSON 붙여넣기) */
export function DrawingsList({ drawings, clients }: { drawings: Item[]; clients: Array<{ id: number; name: string }> }) {
  const router = useRouter()
  const [adding, setAdding] = useState(drawings.length === 0)
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [start, setStart] = useState('')
  const [json, setJson] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError('')
    startTransition(async () => {
      const res = await createDrawingAction({
        title,
        clientId: clientId ? Number(clientId) : null,
        from: start && start !== 'json' ? Number(start) : null,
        json: start === 'json' ? json : '',
      })
      if (!res.ok) return setError(res.error)
      router.push(`/admin/drawings/${res.id}`)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {adding ? (
        <Section title="새 배관 도면" description="빈 도면에서 시작하거나, 이미 있는 도면(업체 페이지에 나간 도면 포함)을 복사해 시작합니다.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="도면 이름 *" value={title} onChange={setTitle} placeholder="예: 칠러 열교환기 배관 현황" />
            <label className="flex flex-col gap-2 text-sm font-medium">
              업체
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-9 border border-input bg-background px-2 text-sm">
                <option value="">업체 없음 (내부용)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            시작
            <select value={start} onChange={(e) => setStart(e.target.value)} className="h-9 border border-input bg-background px-2 text-sm">
              <option value="">빈 도면</option>
              {drawings.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                  {d.clientName ? ` (${d.clientName})` : ''} 복사
                </option>
              ))}
              <option value="json">도면 JSON 붙여넣기 (Claude 보드에서 옮길 때)</option>
            </select>
          </label>
          {start === 'json' && (
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={6}
              placeholder='{"nodes": {...}, "lines": [...]}'
              className="border border-input bg-background p-2 font-mono text-xs"
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={pending || !title.trim()} className="rounded-none">
              {pending && <Loader2 className="animate-spin" />}
              도면 만들기
            </Button>
            {drawings.length > 0 && (
              <Button variant="outline" className="rounded-none" onClick={() => setAdding(false)}>
                취소
              </Button>
            )}
          </div>
        </Section>
      ) : (
        <div>
          <Button className="rounded-none" onClick={() => setAdding(true)}>
            <Plus /> 새 도면
          </Button>
        </div>
      )}

      {drawings.length > 0 && (
        <ul className="divide-y divide-border bg-background ring-1 ring-border">
          {drawings.map((d) => (
            <li key={d.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <Link href={`/admin/drawings/${d.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-base font-bold hover:text-electric">{d.title}</span>
                  {d.showOnPortal && d.clientSlug && (
                    <span className="shrink-0 bg-navy px-1.5 py-0.5 text-[10px] font-semibold text-white">업체 페이지 표시 중</span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[d.clientName ?? '업체 없음', `버전 ${d.rev}`, d.summary, `수정 ${d.updatedAt.slice(0, 10)}${d.updatedBy ? ` ${d.updatedBy}` : ''}`]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </Link>
              <div className="flex gap-2">
                <Link href={`/admin/drawings/${d.id}`} className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-sm hover:bg-secondary">
                  <PencilRuler className="size-4" strokeWidth={1.75} /> 열기
                </Link>
                {d.showOnPortal && d.clientSlug && (
                  <a
                    href={`/drawing-board/board.html?mode=view&id=${d.id}&slug=${d.clientSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-sm hover:bg-secondary"
                  >
                    <Eye className="size-4" strokeWidth={1.75} /> 업체 화면
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
