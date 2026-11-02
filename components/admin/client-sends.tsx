'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, FileDown, Loader2, MonitorSmartphone, Pin, PinOff, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { won } from '@/lib/clients/quote'
import { cancelSend, confirmSend, savePortalHidden, savePortalVersion, saveQuoteCodes, undoCancelSend } from '@/app/actions/client-sends'
import { WORK_CODES, cleanClientCode, quoteCodeNumber } from '@/lib/clients/quote-code'
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
 * 고객 화면 (관리자 전용, 2026-11-02 kevin 정정).
 * - 기본: 업체 페이지·포털은 내부 최신 버전을 자동으로 보여 준다(저장하면 바로 반영).
 * - 버전 하나를 '고정'하면 그 버전만 보이고 최신 작업본은 고객에게 안 보인다. 풀면 다시 최신 자동.
 * - 공개를 끄면 '준비 중'만 보인다.
 * - 발송 기록은 고객에게 실제로 보낸 사실(버전·견적번호·날짜)을 남기는 장부. 고객 화면은 안 바뀐다.
 * '확정'(잠금)은 계약 시점에 버전 기록 칸에서 누른다.
 */
export function ClientSends({
  clientId,
  portalSlug,
  sends,
  versions,
  codes,
  portalHidden,
  portalVersion,
  quoteDate,
  quoteNumber,
}: {
  clientId: number
  portalSlug: string
  /** 발송 견적번호 재료: 업체 영문 이니셜, 공종 코드 */
  codes: { code: string; work: string }
  /** 업체 페이지 공개를 껐는지 */
  portalHidden: boolean
  /** 고객 화면에 고정한 버전. null 이면 최신 자동 */
  portalVersion: number | null
  /** 지금 견적서의 견적일·번호 (다음 발송 견적번호 미리보기) */
  quoteDate: string
  quoteNumber: string
  sends: SendRow[]
  /** 내부 버전 번호 (최신이 먼저) */
  versions: { no: number; summary: string; supply: number }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const latestVersion = versions[0]?.no ?? 0
  // 고정한 버전이 지워졌으면 최신으로 보인다(lib/clients/exposure.ts 와 같은 규칙)
  const pinnedRow = portalVersion !== null ? versions.find((v) => v.no === portalVersion) : undefined
  const shownVersion = pinnedRow ? pinnedRow.no : latestVersion
  const shownRow = versions.find((v) => v.no === shownVersion)
  const pinned = !!pinnedRow
  const [pick, setPick] = useState(shownVersion)
  const [code, setCode] = useState(codes.code)
  const [work, setWork] = useState(codes.work)
  const codeDirty = code !== codes.code || work !== codes.work
  const nextNumber =
    cleanClientCode(code).length >= 2 && work
      ? `${quoteCodeNumber(cleanClientCode(code), work, { number: quoteNumber, date: quoteDate })}${sends.length ? `-R${sends.length}` : ''}`
      : ''

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okMsg: string) =>
    startTransition(async () => {
      const r = await fn()
      setMessage(r.ok ? okMsg : r.error)
      router.refresh()
    })

  const pin = () => {
    const v = versions.find((x) => x.no === pick)
    if (!v) return
    if (!confirm(`고객 화면을 v${v.no} (공급가 ${won(v.supply)}원)으로 고정할까요?\n고정하면 이후 저장하는 최신 버전은 고객에게 보이지 않습니다.`)) return
    run(() => savePortalVersion(clientId, v.no), `고객 화면을 v${v.no}으로 고정했습니다.`)
  }
  const unpin = () => run(() => savePortalVersion(clientId, null), '고객 화면을 최신 자동으로 돌렸습니다.')

  const togglePortal = () => {
    const next = !portalHidden
    if (next && !confirm("업체 페이지 공개를 끌까요?\n업체에는 견적 없이 '준비 중'만 보입니다.")) return
    run(() => savePortalHidden(clientId, next), next ? '업체 페이지 공개를 껐습니다.' : '업체 페이지를 다시 공개했습니다.')
  }

  const saveCodes = () => run(() => saveQuoteCodes(clientId, code, work), '업체 코드·공종을 저장했습니다.')

  const record = () => {
    const v = versions.find((x) => x.no === pick)
    if (!v) return
    if (codeDirty) return setMessage('업체 코드·공종을 먼저 저장해 주세요.')
    if (!nextNumber) return setMessage('발송 견적번호에 쓸 업체 코드(영문 이니셜)와 공종을 먼저 정해 주세요.')
    const note = prompt(
      `내부 v${v.no} (공급가 ${won(v.supply)}원)을 고객에게 보냈다고 기록할까요?\n발송 견적번호는 ${nextNumber} 형식으로 붙습니다. 기록만 남고 고객 화면은 바뀌지 않습니다.\n\n메모(관리자만 봄, 비워도 됨):`,
      '',
    )
    if (note === null) return
    startTransition(async () => {
      const r = await confirmSend(clientId, v.no, note)
      setMessage(r.ok ? `발송 기록 ${r.number} 를 남겼습니다.` : r.error)
      router.refresh()
    })
  }
  const cancel = (s: SendRow) => {
    if (!confirm(`${s.number} 발송 기록을 취소로 표시할까요?\n기록과 견적번호는 남습니다.`)) return
    run(() => cancelSend(clientId, s.no), `${s.number} 를 취소로 표시했습니다.`)
  }
  const undo = (s: SendRow) => run(() => undoCancelSend(clientId, s.no), `${s.number} 취소 표시를 되돌렸습니다.`)

  return (
    <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-2">
        <MonitorSmartphone className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">고객 화면</h2>
        <span className="text-xs text-muted-foreground">
          업체 페이지{portalSlug ? ` (/${portalSlug})` : ''}·포털에는 기본으로 내부 최신 버전이 바로 보입니다. 특정 버전으로 고정할 수 있습니다.
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-none" onClick={togglePortal} disabled={pending}>
            {portalHidden ? <Eye /> : <EyeOff />} {portalHidden ? '공개하기' : '공개 끄기'}
          </Button>
          <a
            href={`/api/admin/clients/${clientId}/preview`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 bg-navy px-3 text-xs font-medium text-white hover:opacity-90"
          >
            <MonitorSmartphone className="size-3.5" /> 고객 페이지 미리보기
          </a>
        </div>
      </div>

      <p className="text-sm">
        {portalHidden ? (
          <span className="font-semibold text-amber-700">업체 페이지 비공개 · 업체에는 &lsquo;준비 중&rsquo;만 보입니다.</span>
        ) : shownRow ? (
          <>
            지금 고객 화면: <b>v{shownRow.no}</b> ({won(shownRow.supply)}원){' '}
            {pinned ? (
              <span className="bg-navy px-1.5 py-0.5 text-[10px] font-semibold text-white">고정</span>
            ) : (
              <span className="bg-electric px-1.5 py-0.5 text-[10px] font-semibold text-white">최신 자동</span>
            )}
            {pinned && latestVersion > shownRow.no && (
              <span className="ml-2 text-amber-700">내부 최신 v{latestVersion}은 고정 때문에 고객에게 안 보입니다.</span>
            )}
          </>
        ) : (
          <span className="text-amber-700">아직 저장한 버전이 없어 업체 페이지에는 &lsquo;준비 중&rsquo;만 보입니다.</span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select
          value={pick}
          onChange={(e) => setPick(Number(e.target.value))}
          className="h-8 border border-border bg-background px-2 text-xs"
          aria-label="버전 고르기"
        >
          {versions.slice(0, 30).map((v) => (
            <option key={v.no} value={v.no}>
              v{v.no}
              {v.no === latestVersion ? ' (최신)' : ''} · {won(v.supply)}원
            </option>
          ))}
        </select>
        <a
          href={`/api/admin/clients/${clientId}/preview?v=${pick}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1 border border-border px-2.5 text-xs hover:bg-muted"
        >
          <Eye className="size-3.5" /> v{pick} 미리보기
        </a>
        <Button size="sm" variant="outline" className="rounded-none" onClick={pin} disabled={pending || !pick || (pinned && pick === shownVersion)}>
          {pending ? <Loader2 className="animate-spin" /> : <Pin />} v{pick}으로 고정
        </Button>
        {pinned && (
          <Button size="sm" variant="outline" className="rounded-none" onClick={unpin} disabled={pending}>
            <PinOff /> 최신 자동으로
          </Button>
        )}
        <Button size="sm" variant="ghost" className="rounded-none" onClick={record} disabled={pending || !pick}>
          <Send /> v{pick} 발송 기록 남기기
        </Button>
        <button type="button" className="text-muted-foreground underline" onClick={() => setLogOpen((v) => !v)}>
          {logOpen ? '발송 기록 접기' : `발송 기록 ${sends.length}건·견적번호 설정`}
        </button>
      </div>

      {logOpen && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5">
              업체 코드
              <input
                value={code}
                onChange={(e) => setCode(cleanClientCode(e.target.value))}
                placeholder="ATK"
                className="h-8 w-20 border border-border bg-background px-2 font-mono uppercase"
              />
            </label>
            <label className="flex items-center gap-1.5">
              공종
              <select value={work} onChange={(e) => setWork(e.target.value)} className="h-8 border border-border bg-background px-2">
                <option value="">고르기</option>
                {WORK_CODES.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            </label>
            {codeDirty && (
              <Button size="sm" variant="outline" className="rounded-none" onClick={saveCodes} disabled={pending}>
                저장
              </Button>
            )}
            <span className="text-muted-foreground">
              다음 발송 견적번호: <b className="font-mono text-foreground">{nextNumber || '업체 코드·공종을 정하면 나옴'}</b>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">발송 기록은 고객에게 보낸 사실을 남기는 장부입니다. 고객 화면은 위 노출 설정(최신 자동·고정)으로만 바뀝니다.</p>
          {sends.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border text-left">
                    <th className="py-1.5 pr-3 font-medium">차수</th>
                    <th className="py-1.5 pr-3 font-medium">발송 견적번호</th>
                    <th className="py-1.5 pr-3 font-medium">발송일</th>
                    <th className="py-1.5 pr-3 font-medium">내부 버전</th>
                    <th className="py-1.5 pr-3 text-right font-medium">공급가</th>
                    <th className="py-1.5 pr-3 font-medium">상태</th>
                    <th className="py-1.5 pr-3 font-medium">메모</th>
                    <th className="py-1.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {sends.map((s) => (
                    <tr key={s.no} className={`border-b border-border ${s.withdrawnAt ? 'text-muted-foreground' : ''}`}>
                      <td className="py-2 pr-3 tabular-nums">{s.no}차</td>
                      <td className="py-2 pr-3 font-semibold">{s.number}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtAt(s.sentAt)}</td>
                      <td className="py-2 pr-3 tabular-nums">v{s.version ?? '-'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{won(s.supply)}</td>
                      <td className="py-2 pr-3 text-xs">{s.withdrawnAt ? '취소' : '보냄'}</td>
                      <td className="max-w-64 truncate py-2 pr-3 text-xs" title={s.note}>
                        {s.note}
                        {s.sentBy && <span className="ml-1 text-muted-foreground">· {s.sentBy}</span>}
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        <a href={`/api/admin/clients/${clientId}/sends/${s.no}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                          <Eye className="size-3.5" /> 보낸 내용
                        </a>
                        <a href={`/api/admin/clients/${clientId}/sends/${s.no}?pdf=1`} className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                          <FileDown className="size-3.5" /> PDF
                        </a>
                        {s.withdrawnAt ? (
                          <button type="button" onClick={() => undo(s)} disabled={pending} className="inline-flex items-center gap-1 px-1.5 text-xs hover:underline">
                            취소 되돌리기
                          </button>
                        ) : (
                          <button type="button" onClick={() => cancel(s)} disabled={pending} className="inline-flex items-center gap-1 px-1.5 text-xs text-destructive hover:underline">
                            취소 표시
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </section>
  )
}
