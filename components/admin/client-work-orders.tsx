'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Eye, FileDown, Link2, Loader2, Pencil, Send, Sparkles, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fmtAt } from '@/components/admin/client-versions'
import { removeWorkOrder, saveWorkOrder, setWorkOrderState } from '@/app/actions/work-orders'

export type WorkOrderRow = {
  no: number
  number: string
  title: string
  status: 'draft' | 'issued'
  shareKey: string
  createdBy: string
  /** ISO */
  createdAt: string
  updatedAt: string
}

/**
 * 업무 지시서 (전 업체 공통, 프로젝트 단계의 마지막 칸).
 * 현장 자료(견적 품목·제안서·공정표·메모)로 Claude 가 초안을 만들고, 여기서 Markdown 으로 고친 뒤 발행하면 현장 팀 링크(/work/<키>)가 열린다.
 */
export function ClientWorkOrders({
  clientId,
  orders,
  editing,
  origin,
}: {
  clientId: number
  orders: WorkOrderRow[]
  /** 지금 편집 중인 지시서 (?wo=N) */
  editing: { no: number; number: string; markdown: string } | null
  /** 현장 팀 링크 주소 앞부분 (https://nm-solution.co.kr) */
  origin: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [baseNo, setBaseNo] = useState<number>(0)
  const [md, setMd] = useState(editing?.markdown ?? '')
  const dirty = editing ? md !== editing.markdown : false

  const generate = async () => {
    if (busy) return
    if (!confirm(`현장 자료로 업무 지시서 초안을 만들까요?${baseNo ? ` (직전 ${orders.find((o) => o.no === baseNo)?.number ?? ''} 를 바탕으로 고쳐 씀)` : ''}\n1~3분 걸립니다.`)) return
    setBusy(true)
    setMessage('Claude 가 현장 자료를 읽고 지시서를 쓰는 중… (1~3분)')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, baseNo: baseNo || undefined }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; no?: number; number?: string; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || '만들지 못했습니다.')
      setMessage(`${data.number} 초안을 만들었습니다. 내용을 확인하고 고친 뒤 발행하세요.`)
      setNote('')
      router.push(`/admin/clients/${clientId}?wo=${data.no}#work-orders`)
      router.refresh()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '만들지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const save = () => {
    if (!editing) return
    startTransition(async () => {
      const r = await saveWorkOrder(clientId, editing.no, md)
      setMessage(r.ok ? `${editing.number} 저장했습니다.` : r.error)
      router.refresh()
    })
  }
  const issue = (o: WorkOrderRow, status: 'draft' | 'issued') => {
    if (status === 'issued' && !confirm(`${o.number} 를 발행할까요?\n현장 팀 링크가 열리고, 열람·PDF 기록이 남습니다.`)) return
    startTransition(async () => {
      const r = await setWorkOrderState(clientId, o.no, status)
      setMessage(r.ok ? (status === 'issued' ? `${o.number} 발행했습니다. 현장 팀 링크를 복사해 보내세요.` : `${o.number} 를 초안으로 되돌렸습니다(링크 닫힘).`) : r.error)
      router.refresh()
    })
  }
  const remove = (o: WorkOrderRow) => {
    if (!confirm(`${o.number} 를 지울까요? 되돌릴 수 없습니다.`)) return
    startTransition(async () => {
      const r = await removeWorkOrder(clientId, o.no)
      setMessage(r.ok ? `${o.number} 를 지웠습니다.` : r.error)
      if (editing?.no === o.no) router.push(`/admin/clients/${clientId}#work-orders`)
      router.refresh()
    })
  }
  const copyLink = async (o: WorkOrderRow) => {
    const url = `${origin}/work/${o.shareKey}`
    try {
      await navigator.clipboard.writeText(url)
      setMessage(`현장 팀 링크를 복사했습니다: ${url}`)
    } catch {
      setMessage(url)
    }
  }

  return (
    <section id="work-orders" className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardList className="size-4 text-muted-foreground" />
        <h2 className="text-lg font-bold tracking-tight">업무 지시서</h2>
        <span className="text-xs text-muted-foreground">견적 품목·작업제안서·공정표·메모로 초안을 만들고, 고친 뒤 발행하면 현장 팀 링크가 열립니다. 금액은 안 들어갑니다.</span>
      </div>

      <div className="flex flex-col gap-2 border border-border p-3">
        <label className="text-xs font-semibold">현장 메모 (실측 결과·바뀐 치수·주의할 점, 다른 자료보다 우선)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="예) 11/3 실측: 골목 길이 14.2m, 옹벽 단차 230. 가스계량기 옆 화기 금지. 오전 10시 전 소음 작업 금지."
          className="w-full border border-border bg-background px-2 py-1.5 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          {orders.length > 0 && (
            <select value={baseNo} onChange={(e) => setBaseNo(Number(e.target.value))} className="h-8 border border-border bg-background px-2 text-xs" aria-label="바탕 지시서">
              <option value={0}>새로 작성</option>
              {orders.map((o) => (
                <option key={o.no} value={o.no}>
                  {o.number} 바탕으로 고쳐 쓰기
                </option>
              ))}
            </select>
          )}
          <Button size="sm" className="rounded-none" onClick={generate} disabled={busy || pending}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Claude 로 초안 만들기
          </Button>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="py-1.5 pr-3 font-medium">번호</th>
                <th className="py-1.5 pr-3 font-medium">제목</th>
                <th className="py-1.5 pr-3 font-medium">상태</th>
                <th className="py-1.5 pr-3 font-medium">갱신</th>
                <th className="py-1.5 pr-3 font-medium">작성</th>
                <th className="py-1.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.no} className={`border-b border-border ${editing?.no === o.no ? 'bg-electric/5' : ''}`}>
                  <td className="py-2 pr-3 font-semibold">{o.number}</td>
                  <td className="max-w-72 truncate py-2 pr-3" title={o.title}>
                    {o.title}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold text-white ${o.status === 'issued' ? 'bg-navy' : 'bg-amber-600'}`}>
                      {o.status === 'issued' ? '발행' : '초안'}
                    </span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-muted-foreground">{fmtAt(o.updatedAt)}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{o.createdBy || '-'}</td>
                  <td className="py-2 whitespace-nowrap">
                    <a href={`/admin/clients/${clientId}?wo=${o.no}#work-orders`} className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                      <Pencil className="size-3.5" /> 편집
                    </a>
                    <a href={`/api/admin/clients/${clientId}/work-orders/${o.no}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                      <Eye className="size-3.5" /> 보기
                    </a>
                    <a href={`/api/admin/clients/${clientId}/work-orders/${o.no}/pdf`} className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                      <FileDown className="size-3.5" /> PDF
                    </a>
                    {o.status === 'issued' ? (
                      <>
                        <button type="button" onClick={() => copyLink(o)} className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                          <Link2 className="size-3.5" /> 현장 팀 링크 복사
                        </button>
                        <button type="button" onClick={() => issue(o, 'draft')} disabled={pending} className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                          <Undo2 className="size-3.5" /> 초안으로
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => issue(o, 'issued')} disabled={pending} className="inline-flex items-center gap-1 px-1.5 text-xs font-semibold text-navy hover:underline">
                        <Send className="size-3.5" /> 발행
                      </button>
                    )}
                    <button type="button" onClick={() => remove(o)} disabled={pending} className="inline-flex items-center gap-1 px-1.5 text-xs text-destructive hover:underline">
                      <Trash2 className="size-3.5" /> 삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="flex flex-col gap-2 border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{editing.number} 편집</span>
            <span className="text-xs text-muted-foreground">Markdown. # 제목, ## 장, - 목록, | 표 |. 저장하면 보기·PDF·현장 팀 링크에 바로 반영.</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" className="rounded-none" onClick={save} disabled={pending || !dirty}>
                {pending ? <Loader2 className="animate-spin" /> : null} 저장
              </Button>
              <a href={`/admin/clients/${clientId}#work-orders`} className="inline-flex h-8 items-center border border-border px-2.5 text-xs hover:bg-muted">
                닫기
              </a>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <textarea value={md} onChange={(e) => setMd(e.target.value)} rows={28} spellCheck={false} className="w-full border border-border bg-background px-2 py-1.5 font-mono text-xs leading-relaxed" />
            <iframe
              key={editing.no + ':' + (dirty ? 'dirty' : 'clean')}
              src={`/api/admin/clients/${clientId}/work-orders/${editing.no}`}
              title={`${editing.number} 미리보기`}
              className="h-[640px] w-full border border-border bg-white"
            />
          </div>
          {dirty && <p className="text-xs text-amber-700">저장하지 않은 수정이 있습니다. 미리보기는 저장한 내용을 보여 줍니다.</p>}
        </div>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </section>
  )
}
