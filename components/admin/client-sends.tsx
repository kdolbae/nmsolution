'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, FileDown, Loader2, Send, Undo2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { won } from '@/lib/clients/quote'
import { cancelSend, confirmSend, undoCancelSend } from '@/app/actions/client-sends'
import { fmtAt } from '@/components/admin/client-versions'

export type SendRow = {
  no: number
  number: string
  version: number | null
  title: string
  supply: number
  note: string
  /** ISO */
  sentAt: string
  sentBy: string
  withdrawnAt: string | null
}

/**
 * 고객 발송 이력 (관리자 전용). 내부 버전과 따로 관리한다.
 * 업체 페이지·포털은 여기 '발송' 된 것만 보여 주고, 취소한 발송본과 내부 작업본은 고객에게 안 보인다.
 */
export function ClientSends({
  clientId,
  portalSlug,
  sends,
  versions,
}: {
  clientId: number
  portalSlug: string
  sends: SendRow[]
  /** 내부 버전 번호 (최신이 먼저) */
  versions: { no: number; summary: string; supply: number }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const latestVersion = versions[0]?.no ?? 0
  const [pick, setPick] = useState(latestVersion)
  const live = sends.filter((s) => !s.withdrawnAt)
  const shown = live[0]
  const behind = shown && shown.version !== null && latestVersion > shown.version

  const send = () => {
    const v = versions.find((x) => x.no === pick)
    if (!v) return
    const note = prompt(
      `내부 v${v.no} (공급가 ${won(v.supply)}원)을 고객 발송본으로 확정할까요?\n확정하면 업체 페이지에 바로 최신 견적으로 보이고, 발송본은 나중에 고칠 수 없습니다.\n\n메모(관리자만 봄, 비워도 됨):`,
      '',
    )
    if (note === null) return
    startTransition(async () => {
      const r = await confirmSend(clientId, v.no, note)
      setMessage(r.ok ? `발송본 ${r.number} 로 확정했습니다.` : r.error)
      router.refresh()
    })
  }
  const cancel = (s: SendRow) => {
    if (!confirm(`${s.number} 발송본을 고객 화면에서 내릴까요?\n기록과 견적번호는 남고, 다시 되돌릴 수 있습니다.`)) return
    startTransition(async () => {
      const r = await cancelSend(clientId, s.no)
      setMessage(r.ok ? `${s.number} 를 고객 화면에서 내렸습니다.` : r.error)
      router.refresh()
    })
  }
  const undo = (s: SendRow) =>
    startTransition(async () => {
      const r = await undoCancelSend(clientId, s.no)
      setMessage(r.ok ? `${s.number} 를 다시 고객 화면에 올렸습니다.` : r.error)
      router.refresh()
    })

  return (
    <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-2">
        <Send className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">고객 발송 이력</h2>
        <span className="text-xs text-muted-foreground">
          업체 페이지{portalSlug ? ` (/${portalSlug})` : ''}에는 여기서 발송한 견적만 보입니다. 내부 버전은 고객에게 보이지 않습니다.
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(Number(e.target.value))}
            className="h-8 border border-border bg-background px-2 text-xs"
            aria-label="발송할 내부 버전"
          >
            {versions.slice(0, 30).map((v) => (
              <option key={v.no} value={v.no}>
                v{v.no}
                {v.no === latestVersion ? ' (최신)' : ''} · {won(v.supply)}원
              </option>
            ))}
          </select>
          <Button size="sm" className="rounded-none" onClick={send} disabled={pending || !pick}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />} 고객 발송본으로 확정
          </Button>
        </div>
      </div>

      <p className="text-sm">
        {shown ? (
          <>
            지금 고객 화면: <b>{shown.number}</b> ({fmtAt(shown.sentAt)} 발송, 내부 v{shown.version ?? '-'})
            {behind && <span className="ml-2 text-amber-700">내부 최신 v{latestVersion}은 아직 발송 전이라 고객에게 안 보입니다.</span>}
          </>
        ) : (
          <span className="text-amber-700">발송한 견적이 없어 업체 페이지에는 &lsquo;준비 중&rsquo;만 보입니다.</span>
        )}
      </p>

      {sends.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="py-1.5 pr-3 font-medium">차수</th>
                <th className="py-1.5 pr-3 font-medium">발송 견적번호</th>
                <th className="py-1.5 pr-3 font-medium">발송일</th>
                <th className="py-1.5 pr-3 font-medium">내부 버전</th>
                <th className="py-1.5 pr-3 text-right font-medium">공급가</th>
                <th className="py-1.5 pr-3 font-medium">메모</th>
                <th className="py-1.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {sends.map((s) => (
                <tr key={s.no} className={`border-b border-border ${s.withdrawnAt ? 'text-muted-foreground line-through decoration-muted-foreground/40' : ''}`}>
                  <td className="py-2 pr-3 tabular-nums">{s.no}차</td>
                  <td className="py-2 pr-3 font-semibold">
                    {s.number}
                    {s === shown && <span className="ml-1.5 bg-navy px-1.5 py-0.5 text-[10px] text-white no-underline">고객 최신</span>}
                    {s.withdrawnAt && <span className="ml-1.5 text-[10px] no-underline">발송 취소</span>}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{fmtAt(s.sentAt)}</td>
                  <td className="py-2 pr-3 tabular-nums">v{s.version ?? '-'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{won(s.supply)}</td>
                  <td className="max-w-64 truncate py-2 pr-3 text-xs" title={s.note}>
                    {s.note}
                    {s.sentBy && <span className="ml-1 text-muted-foreground">· {s.sentBy}</span>}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <a href={`/api/admin/clients/${clientId}/sends/${s.no}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                      <Eye className="size-3.5" /> 고객 화면
                    </a>
                    <a href={`/api/admin/clients/${clientId}/sends/${s.no}?pdf=1`} className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                      <FileDown className="size-3.5" /> PDF
                    </a>
                    {s.withdrawnAt ? (
                      <button type="button" onClick={() => undo(s)} disabled={pending} className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                        <Undo2 className="size-3.5" /> 되돌리기
                      </button>
                    ) : (
                      <button type="button" onClick={() => cancel(s)} disabled={pending} className="inline-flex items-center gap-1 px-1.5 text-xs text-destructive hover:underline">
                        <XCircle className="size-3.5" /> 발송 취소
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </section>
  )
}
