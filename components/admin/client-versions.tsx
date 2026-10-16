'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Eye, History, Loader2, Lock, Printer } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { finalizeClientVersion } from '@/app/actions/clients'
import { quoteDocument, won, type Quote, type QuoteRecipient } from '@/lib/clients/quote'
import { withBrandFont } from '@/lib/clients/proposal'

export type VersionRow = {
  no: number
  change: 'init' | 'proposal' | 'quote' | 'system'
  summary: string
  by: string
  /** ISO */
  at: string
  supply: number
}

export type Finalized = { version: number; at: string; by: string } | null

/** 2026-10-16 14:20 (한국 시각) */
export function fmtAt(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
}

const CHANGE_LABEL: Record<VersionRow['change'], string> = {
  init: '처음',
  proposal: '제안서',
  quote: '견적서',
  system: '자동',
}

/** 최종본 확정 안내 띠 */
export function LockBanner({ finalized }: { finalized: NonNullable<Finalized> }) {
  return (
    <div className="flex items-center gap-2 bg-navy px-4 py-3 text-sm text-white">
      <Lock className="size-4 shrink-0" />
      <span>
        v{finalized.version}을 최종본으로 확정함 ({fmtAt(finalized.at)}
        {finalized.by && ` · ${finalized.by}`}). 제안서·견적서는 더 고칠 수 없습니다. 고칠 일이 생기면 업체 목록의 업체 추가에서 이 업체 것을 복사해 새 견적으로 시작하세요.
      </span>
    </div>
  )
}

/**
 * 버전 기록: 저장할 때마다 한 줄. 보기·PDF, 두 버전을 골라 비교, 최종본 확정.
 * 화면 위쪽 문서는 늘 최신본이고, 지난 버전을 고르면 ?v=N 으로 그 버전을 읽기 전용으로 보여 준다.
 */
export function VersionHistory({
  clientId,
  versions,
  finalized,
  viewing,
}: {
  clientId: number
  versions: VersionRow[]
  finalized: Finalized
  /** 지금 보고 있는 지난 버전 (최신본을 보고 있으면 null) */
  viewing: number | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(viewing !== null)
  const [picked, setPicked] = useState<number[]>([])
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const latest = versions[0]?.no ?? 0
  const shown = open ? versions : versions.slice(0, 3)

  const toggle = (no: number) =>
    setPicked((p) => (p.includes(no) ? p.filter((x) => x !== no) : [...p.slice(-1), no]))

  const compareHref = useMemo(() => {
    const [a, b] = [...picked].sort((x, y) => x - y)
    return a && b ? `/admin/clients/${clientId}/compare?a=${a}&b=${b}` : null
  }, [picked, clientId])

  const finalize = () => {
    if (!confirm(`최신본 v${latest}을 최종본으로 확정할까요?\n확정하면 이 업체의 제안서·견적서는 더 고칠 수 없습니다. 되돌릴 수 없습니다.`)) return
    startTransition(async () => {
      const res = await finalizeClientVersion(clientId)
      if (!res.ok) setMessage(res.error)
      router.refresh()
    })
  }

  return (
    <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-2">
        <History className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">버전 기록</h2>
        <span className="text-xs text-muted-foreground">저장할 때마다 한 벌씩 남습니다. 두 개를 체크하면 나란히 비교합니다.</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {compareHref ? (
            <Link href={compareHref} className={cn(buttonVariants({ size: 'sm' }), 'rounded-none')}>
              <ArrowLeftRight /> v{Math.min(...picked)} ↔ v{Math.max(...picked)} 비교
            </Link>
          ) : (
            <Button size="sm" variant="outline" className="rounded-none" disabled>
              <ArrowLeftRight /> 두 버전 체크 후 비교
            </Button>
          )}
          {!finalized && (
            <Button size="sm" variant="outline" className="rounded-none" onClick={finalize} disabled={pending || !latest}>
              {pending ? <Loader2 className="animate-spin" /> : <Lock />} 최신본 v{latest} 최종본 확정
            </Button>
          )}
        </div>
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-secondary text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-2 py-2" />
              <th className="w-36 px-2 py-2 text-left font-medium">버전</th>
              <th className="w-36 px-2 py-2 text-left font-medium">저장 시각</th>
              <th className="px-2 py-2 text-left font-medium">바뀐 내용</th>
              <th className="w-32 px-2 py-2 text-right font-medium">공급가액</th>
              <th className="w-24 px-2 py-2 text-left font-medium">저장한 사람</th>
              <th className="w-40 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {shown.map((v, i) => {
              const prev = versions[versions.indexOf(v) + 1]
              const diff = prev ? v.supply - prev.supply : 0
              const isViewing = viewing === v.no || (viewing === null && v.no === latest)
              return (
                <tr key={v.no} className={cn('border-t border-border', isViewing && 'bg-electric/5')}>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" aria-label={`v${v.no} 비교에 넣기`} checked={picked.includes(v.no)} onChange={() => toggle(v.no)} />
                  </td>
                  <td className="px-2 py-2 font-semibold whitespace-nowrap">
                    v{v.no}
                    {i === 0 && v.no === latest && <span className="ml-1.5 bg-electric px-1.5 py-0.5 text-[10px] font-semibold text-white">최신</span>}
                    {finalized?.version === v.no && <span className="ml-1.5 bg-navy px-1.5 py-0.5 text-[10px] font-semibold text-white">최종본</span>}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-muted-foreground">{fmtAt(v.at)}</td>
                  <td className="px-2 py-2">
                    <span className="mr-1.5 text-xs text-muted-foreground">[{CHANGE_LABEL[v.change]}]</span>
                    {v.summary}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {won(v.supply)}
                    {diff !== 0 && (
                      <span className={cn('block text-xs', diff > 0 ? 'text-orange-600' : 'text-electric')}>
                        {diff > 0 ? '+' : '−'}
                        {won(Math.abs(diff))}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{v.by || '-'}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {isViewing ? (
                        <span className="px-2 text-xs text-muted-foreground">보는 중</span>
                      ) : (
                        <Link
                          href={v.no === latest ? `/admin/clients/${clientId}` : `/admin/clients/${clientId}?v=${v.no}`}
                          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-none')}
                        >
                          <Eye /> 보기
                        </Link>
                      )}
                      <a
                        href={`/api/admin/clients/${clientId}/print?docs=both&version=${v.no}`}
                        target="_blank"
                        rel="noreferrer"
                        title="제안서 + 견적서 인쇄 창 (PDF 로 저장)"
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-none')}
                      >
                        <Printer /> PDF
                      </a>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {versions.length > 3 && (
        <button type="button" className="self-start text-xs text-muted-foreground underline" onClick={() => setOpen((v) => !v)}>
          {open ? '최근 3개만 보기' : `지난 버전 ${versions.length - 3}개 더 보기`}
        </button>
      )}
    </section>
  )
}

/** 지난 버전 읽기 전용 보기 */
export function VersionView({
  clientId,
  client,
  version,
  tab,
}: {
  clientId: number
  client: QuoteRecipient
  version: { no: number; at: string; summary: string; proposalHtml: string; quote: Quote }
  tab: 'proposal' | 'quote'
}) {
  const proposal = useMemo(() => (version.proposalHtml ? withBrandFont(version.proposalHtml) : ''), [version.proposalHtml])
  const quote = useMemo(() => quoteDocument(version.quote, client), [version.quote, client])
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 border border-orange-300 bg-orange-50 px-4 py-3 text-sm">
        <Eye className="size-4 text-orange-600" />
        <span>
          <b>v{version.no}</b> ({fmtAt(version.at)}) 을 보는 중입니다. 지난 버전은 읽기 전용입니다.
        </span>
        <Link href={`/admin/clients/${clientId}?tab=${tab}`} className={cn(buttonVariants({ size: 'sm' }), 'ml-auto rounded-none')}>
          최신본으로 돌아가기
        </Link>
      </div>
      {tab === 'proposal' ? (
        proposal ? (
          <iframe srcDoc={proposal} title={`제안서 v${version.no}`} className="h-[80vh] w-full border border-border bg-white" />
        ) : (
          <p className="border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">이 버전에는 제안서가 없습니다.</p>
        )
      ) : (
        <iframe srcDoc={quote} title={`견적서 v${version.no}`} className="h-[1400px] w-full border border-border bg-white" />
      )}
    </div>
  )
}
