'use client'

import { useState } from 'react'
import { addComment, resolveComment } from '@/app/actions/est'
import { Badge, Btn, ErrorLine, selectCls, textareaCls } from './ui'
import { useAct } from './use-act'
import { cn } from '@/lib/utils'

type C = { id: number; estimateId: number; lineId: number | null; lineName: string | null; userName: string; body: string; resolvedAt: string | null; createdAt: string }

/** S7 판별 댓글(줄 핀)·해결 처리 */
export function Comments({ estimates, lines, comments }: { estimates: { id: number; label: string }[]; lines: Record<number, { id: number; name: string }[]>; comments: C[] }) {
  const { pending, error, run } = useAct()
  const [est, setEst] = useState(estimates.at(-1)?.id ?? 0)
  const [line, setLine] = useState('')
  const [body, setBody] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const list = comments.filter((c) => c.estimateId === est && (showResolved || !c.resolvedAt))
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {estimates.map((e) => (
          <button key={e.id} type="button" onClick={() => setEst(e.id)} className={cn('border px-3 py-1.5 text-sm', e.id === est ? 'border-navy bg-navy text-navy-foreground' : 'border-border bg-background')}>
            {e.label} <span className="font-mono text-xs opacity-70">{comments.filter((c) => c.estimateId === e.id && !c.resolvedAt).length}</span>
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1 text-xs">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          해결된 것도 보기
        </label>
      </div>
      <ul className="flex flex-col gap-2">
        {list.map((c) => (
          <li key={c.id} className={cn('flex flex-col gap-1 bg-background p-3 ring-1 ring-border', c.resolvedAt && 'opacity-60')}>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <b className="text-foreground">{c.userName}</b>
              {new Date(c.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
              {c.lineName && <Badge tone="accent">줄: {c.lineName}</Badge>}
              {c.resolvedAt && <Badge tone="ok">해결</Badge>}
            </span>
            <p className="whitespace-pre-wrap text-sm">{c.body}</p>
            <button type="button" disabled={pending} onClick={() => run(() => resolveComment(c.id, !c.resolvedAt))} className="w-fit text-xs font-medium text-electric hover:underline">
              {c.resolvedAt ? '다시 열기' : '해결 처리'}
            </button>
          </li>
        ))}
        {!list.length && <li className="text-sm text-muted-foreground">댓글 없음</li>}
      </ul>
      {est > 0 && (
        <div className="flex flex-col gap-2 bg-background p-3 ring-1 ring-border">
          <select className={selectCls} value={line} onChange={(e) => setLine(e.target.value)}>
            <option value="">(판 전체에 대한 댓글)</option>
            {(lines[est] ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                줄: {l.name}
              </option>
            ))}
          </select>
          <textarea className={textareaCls} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="의견" />
          <ErrorLine error={error} />
          <Btn variant="primary" className="w-fit" disabled={pending} onClick={() => run(() => addComment(est, body, line ? Number(line) : null), () => setBody(''))}>
            댓글 남기기
          </Btn>
        </div>
      )}
    </div>
  )
}
