import { ExternalLink } from 'lucide-react'
import { AdsRefreshButton } from '@/components/admin/ads-refresh'
import { PageHeader } from '@/components/admin/form'
import { ADS, isPaid } from '@/lib/ads'
import { db } from '@/lib/db'
import { quoteRequests } from '@/lib/db/schema'
import { desc, gte } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const DAYS = 30

type Row = {
  createdAt: Date
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
}

async function recentQuotes(): Promise<Row[]> {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)
  try {
    return await db
      .select({
        createdAt: quoteRequests.createdAt,
        utmSource: quoteRequests.utmSource,
        utmMedium: quoteRequests.utmMedium,
        utmCampaign: quoteRequests.utmCampaign,
        utmTerm: quoteRequests.utmTerm,
        utmContent: quoteRequests.utmContent,
      })
      .from(quoteRequests)
      .where(gte(quoteRequests.createdAt, since))
      .orderBy(desc(quoteRequests.createdAt))
  } catch (e) {
    // 유입 출처 열이 아직 없는 DB (sql/005 미실행) 에서도 페이지는 떠야 한다.
    console.error('[admin] 광고 유입 조회 실패', e)
    return []
  }
}

export default async function AdminAdsPage() {
  const rows = await recentQuotes()
  const paid = rows.filter((r) => isPaid(r.utmSource, r.utmMedium))
  const naver = paid.filter((r) => r.utmSource === 'naver')
  const noKeyword = paid.filter((r) => !r.utmTerm).length

  const byKeyword = new Map<string, { count: number; last: Date; group: string }>()
  for (const r of paid) {
    const key = r.utmTerm || '(키워드 미확인)'
    const cur = byKeyword.get(key)
    if (cur) cur.count += 1
    else byKeyword.set(key, { count: 1, last: r.createdAt, group: r.utmContent || r.utmCampaign || '' })
  }
  const keywords = [...byKeyword.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 20)

  return (
    <>
      <PageHeader
        title="광고"
        description={`네이버 검색광고 상황판과 접속 정보입니다. 아래 표는 최근 ${DAYS}일 견적 문의를 유입 출처별로 묶은 것입니다.`}
      />

      <div className="mb-6 grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
        <Stat label={`광고 문의 (${DAYS}일)`} value={`${paid.length}건`} sub={`전체 문의 ${rows.length}건 중`} />
        <Stat
          label="네이버 검색광고"
          value={`${naver.length}건`}
          sub={paid.length > 0 ? `광고 문의의 ${Math.round((naver.length / paid.length) * 100)}%` : '아직 집행 전입니다'}
        />
        <Stat
          label="키워드 미확인"
          value={`${noKeyword}건`}
          sub={noKeyword > 0 ? '네이버 자동 추적이 꺼져 있을 수 있습니다' : '모든 광고 문의에 키워드가 남았습니다'}
        />
      </div>

      <section className="mb-6 bg-background p-6 ring-1 ring-border lg:p-8">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">문의를 가져온 키워드</h2>
          <p className="text-sm text-muted-foreground">
            최근 {DAYS}일. 광고비는 상황판에서 보고, 이 표는 그 돈이 실제로 문의로 이어졌는지를 봅니다.
          </p>
        </div>
        {keywords.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 광고로 들어온 문의가 없습니다. 광고를 켠 뒤 첫 문의가 접수되면 여기에 쌓입니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 font-medium text-muted-foreground">키워드</th>
                <th className="py-2 font-medium text-muted-foreground">광고그룹</th>
                <th className="py-2 text-right font-medium text-muted-foreground">문의</th>
                <th className="py-2 text-right font-medium text-muted-foreground">마지막</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map(([kw, v]) => (
                <tr key={kw} className="border-b border-border/60">
                  <td className="py-2 font-medium">{kw}</td>
                  <td className="py-2 text-muted-foreground">{v.group || '—'}</td>
                  <td className="py-2 text-right tabular-nums">{v.count}건</td>
                  <td className="py-2 text-right text-muted-foreground tabular-nums">
                    {v.last.toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-6 bg-background p-6 ring-1 ring-border lg:p-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold tracking-tight">광고 상황판</h2>
            <p className="text-sm text-muted-foreground">
              광고비 · 노출 · 클릭 · 순위. {ADS.refreshedAt}에 전날치가 들어옵니다.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Out href={ADS.dashboardUrl}>새 창으로 열기</Out>
            <AdsRefreshButton />
          </div>
        </div>
        <iframe
          src={ADS.dashboardUrl}
          title="엔엠솔루션 광고 상황판"
          className="h-[70svh] w-full border border-border bg-secondary"
          loading="lazy"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          화면이 비어 보이면 위의 &lsquo;새 창으로 열기&rsquo;를 쓰세요. 상황판은 별도 주소에 올라가 있어
          브라우저가 끼워 넣기를 막을 수 있습니다.
        </p>
      </section>

      <section className="mb-6 bg-background p-6 ring-1 ring-border lg:p-8">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">접속 정보</h2>
          <p className="text-sm text-muted-foreground">
            엔엠솔루션 광고계정은 나노마스터와 완전히 따로입니다. 아이디·비밀번호와 API 키는 여기 적지 않습니다.
          </p>
        </div>
        <dl className="flex flex-col gap-px bg-border">
          <Info term="엔엠솔루션 상황판" href={ADS.dashboardUrl} desc="이 페이지에 끼워 넣은 것과 같습니다" />
          <Info term="나노마스터 상황판" href={ADS.nanomasterDashboardUrl} desc="같은 도구, 다른 광고계정" />
          <Info term="네이버 검색광고" href={ADS.naverSearchAdUrl} desc="캠페인·키워드·입찰가 관리. 계정 전환은 오른쪽 위에서" />
          <Info term="수집 수동 실행" href={ADS.workflowUrl} desc="아침 수집을 기다리지 않고 지금 갱신할 때" />
          <Info term="자동 운영 도구" href={ADS.toolRepoUrl} desc="수집 · 리포트 · 입찰 조정안" />
        </dl>
      </section>
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1 bg-background p-6">
      <span className="text-kicker text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tracking-tight tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  )
}

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold hover:text-electric"
    >
      {children}
      <ExternalLink className="size-4" strokeWidth={1.75} />
    </a>
  )
}

function Info({ term, href, desc }: { term: string; href: string; desc: string }) {
  return (
    <div className="flex flex-col gap-1 bg-background py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-sm font-semibold">{term}</dt>
        <dd className="text-xs text-muted-foreground">{desc}</dd>
      </div>
      <Out href={href}>열기</Out>
    </div>
  )
}
