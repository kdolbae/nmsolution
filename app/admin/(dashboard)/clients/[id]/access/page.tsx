import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getClient } from '@/lib/clients/table'
import { listAccess, type AccessRow } from '@/lib/clients/access-log'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: '접속 기록',
  robots: { index: false, follow: false },
}

const KIND: Record<AccessRow['kind'], string> = {
  login_page: '로그인 화면',
  login_ok: '로그인 성공',
  login_fail: '비밀번호 틀림',
  view: '열람',
  share_view: '임시 링크 열람',
  pdf: 'PDF 다운로드',
  portal_view: '포털 열람',
  portal_print: '포털 인쇄',
  quote_open: '견적서 열기',
}

const kst = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso))

const dur = (s: number | null | undefined) => {
  if (!s) return '-'
  const m = Math.floor(s / 60)
  return m ? `${m}분 ${s % 60}초` : `${s}초`
}

/** 업체 페이지 접속·행동 기록 (어드민 전용). 업체 화면에서는 '기록' 버튼으로만 들어온다 */
export default async function AdminClientAccessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ admin?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const client = await getClient(Number(id))
  if (!client) notFound()
  const all = await listAccess(client.id)
  const showAdmin = sp.admin === '1'
  const rows = showAdmin ? all : all.filter((r) => !r.isAdmin)
  const outside = all.filter((r) => !r.isAdmin)
  const views = outside.filter((r) => r.kind === 'view' || r.kind === 'share_view' || r.kind === 'portal_view')
  const stats = [
    ['열람', `${views.length}회`],
    ['마지막 열람', views[0] ? kst(views[0].at) : '-'],
    ['총 머문 시간', dur(views.reduce((a, r) => a + (r.seconds ?? 0), 0))],
    ['PDF·인쇄', `${outside.filter((r) => r.kind === 'pdf' || r.kind === 'portal_print').length}회`],
    ['비밀번호 틀림', `${outside.filter((r) => r.kind === 'login_fail').length}회`],
    ['IP 수', `${new Set(outside.map((r) => r.ip).filter(Boolean)).size}곳`],
  ]

  return (
    <>
      <Link href={`/admin/clients/${client.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {client.name}
      </Link>
      <div className="flex flex-col gap-5 bg-background p-5 ring-1 ring-border lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{client.name} 접속 기록</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {client.portalSlug ? `nm-solution.co.kr/${client.portalSlug}` : '업체용 링크 없음'} · 시각은 한국 시간 · 최근 300건
            </p>
          </div>
          <Link
            href={showAdmin ? `/admin/clients/${client.id}/access` : `/admin/clients/${client.id}/access?admin=1`}
            className="border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            {showAdmin ? '관리자 접속 숨기기' : '관리자 접속도 보기'}
          </Link>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-border ring-1 ring-border sm:grid-cols-3 lg:grid-cols-6">
          {stats.map(([k, v]) => (
            <div key={k} className="bg-background p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-sm font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 기록이 없음.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {rows.map((r) => (
              <li key={r.id} className={r.isAdmin ? 'opacity-50' : ''}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                    <span className="w-36 shrink-0 font-mono text-xs tabular-nums">{kst(r.at)}</span>
                    <span className="w-28 shrink-0 font-medium">
                      {KIND[r.kind] ?? r.kind}
                      {r.isAdmin && <span className="ml-1 text-[10px] text-muted-foreground">관리자</span>}
                    </span>
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{r.seconds != null ? `${dur(r.seconds)} · ${r.scroll ?? 0}%` : ''}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {[r.details?.member, r.device, r.place, r.ip].filter(Boolean).join(' · ')}
                    </span>
                  </summary>
                  <Detail r={r} />
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function Detail({ r }: { r: AccessRow }) {
  const d = r.details ?? {}
  const sections = Object.entries(d.sections ?? {}).sort((a, b) => b[1] - a[1])
  const timeline = [...(d.clicks ?? []).map((c) => ({ ...c, k: '클릭' })), ...(d.events ?? []).map((e) => ({ ...e, k: '' }))].sort((a, b) => a.t - b.t)
  return (
    <div className="grid gap-4 pb-4 pl-1 text-xs sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <p className="font-semibold">접속 정보</p>
        <p>
          IP {r.ip ?? '-'} · {r.place ?? '-'}
        </p>
        <p>{r.device ?? '-'}</p>
        {r.referrer && <p className="break-all">들어온 곳 {r.referrer}</p>}
        {d.screen && <p>화면 {[d.screen, d.lang, d.tz].filter(Boolean).join(' · ')}</p>}
        {d.docs && <p>인쇄 범위 {d.docs}</p>}
        {sections.length > 0 && (
          <>
            <p className="mt-2 font-semibold">구간별 머문 시간</p>
            {sections.slice(0, 20).map(([k, s]) => (
              <p key={k} className="flex justify-between gap-3">
                <span className="truncate">{k}</span>
                <span className="shrink-0 tabular-nums">{dur(s)}</span>
              </p>
            ))}
          </>
        )}
      </div>
      {timeline.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">행동 순서 (열고 나서 경과)</p>
          {timeline.slice(0, 200).map((e, i) => (
            <p key={i} className="flex gap-3">
              <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{dur(e.t)}</span>
              <span className="break-all">{e.k ? `${e.k} ${e.label}` : e.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
