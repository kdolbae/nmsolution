import Link from 'next/link'
import { PageHeader } from '@/components/admin/form'
import { listAllAccess } from '@/lib/clients/access-log'

export const dynamic = 'force-dynamic'
export const metadata = { title: '접속 기록 전체', robots: { index: false, follow: false } }

const KIND: Record<string, string> = {
  login_page: '로그인 화면',
  login_ok: '로그인 성공',
  login_fail: '비밀번호 틀림',
  view: '열람',
  share_view: '임시 링크 열람',
  pdf: 'PDF 다운로드',
  portal_view: '포털 열람',
  portal_print: '포털 인쇄',
  portal_file: '포털 서류 내려받기',
  quote_open: '견적서 열기',
  send_view: '지난 견적 열람',
  compare: '견적 비교',
}

const kst = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

/**
 * 전 업체 접속 기록 한 화면(어드민 전용). 업체에 연결되지 않은 기록(주소가 업체 관리에 없는 페이지 등)도 여기에는 나오므로,
 * 기록이 어딘가로 새고 있는지 여기서 확인한다. 업체별 상세는 업체 화면의 '기록'.
 */
export default async function AdminAccessAllPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const sp = await searchParams
  const rows = await listAllAccess(300)
  const showAll = sp.all === '1'
  const shown = showAll ? rows : rows.filter((r) => !r.isAdmin && !r.details?.bot)
  const orphan = rows.filter((r) => r.clientId == null)
  return (
    <>
      <PageHeader title="접속 기록 전체" description="모든 업체 페이지·포털의 최근 300건. 업체별 행동 상세는 업체 화면의 「기록」에서 봄.">
        <Link href={showAll ? '/admin/access' : '/admin/access?all=1'} className="border border-border px-2 py-1 text-xs hover:bg-muted">
          {showAll ? '관리자·로봇 접속 숨기기' : `관리자·로봇 접속도 보기 (${rows.length - shown.length}건)`}
        </Link>
      </PageHeader>
      {orphan.length > 0 && (
        <p className="mb-4 border border-destructive/40 bg-background px-4 py-2 text-sm text-destructive">
          업체에 연결되지 않은 기록 {orphan.length}건이 있음. 업체 관리에 주소가 등록되지 않은 페이지에서 온 기록이니 업체 주소를 확인해야 함.
        </p>
      )}
      <div className="bg-background ring-1 ring-border">
        {shown.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">아직 기록이 없음.</p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm ${r.isAdmin || r.details?.bot ? 'opacity-50' : ''}`}>
                <span className="w-32 shrink-0 font-mono text-xs tabular-nums">{kst(r.at)}</span>
                <span className="w-40 shrink-0 truncate font-medium">
                  {r.clientId ? (
                    <Link href={`/admin/clients/${r.clientId}/access`} className="hover:underline">
                      {r.clientName ?? `업체 ${r.clientId}`}
                    </Link>
                  ) : (
                    <span className="text-destructive">업체 미연결{r.slug ? ` (/${r.slug})` : ''}</span>
                  )}
                </span>
                <span className="w-28 shrink-0">
                  {KIND[r.kind] ?? r.kind}
                  {r.isAdmin && <span className="ml-1 text-[10px] text-muted-foreground">관리자</span>}
                  {r.details?.bot && <span className="ml-1 text-[10px] text-muted-foreground">로봇</span>}
                </span>
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{r.seconds != null ? `${r.seconds}초 · ${r.scroll ?? 0}%` : ''}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {[r.details?.send, r.details?.member, r.device, r.place, r.ip].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
