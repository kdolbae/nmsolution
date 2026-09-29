import { AdsRefreshButton } from '@/components/admin/ads-refresh'
import { PageHeader } from '@/components/admin/form'
import { isPaid } from '@/lib/ads'
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
    // 유입 출처 열이 아직 없는 DB (sql/006 미실행) 에서도 페이지는 떠야 한다.
    console.error('[admin] 광고 유입 조회 실패', e)
    return []
  }
}

/**
 * 검색광고 상황판 — 광고 도구가 매일 만드는 네이버 광고 성과표(/api/admin/ads-board)와,
 * 그 광고비가 실제로 문의로 이어졌는지 보는 유입 표를 한 화면에 둔다.
 */
export default async function AdsBoardPage() {
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
        title="검색광고 상황판"
        description="네이버 검색광고의 노출·클릭·광고비·순위를 매일 아침 모아 만든 표입니다. 방문·문의는 '마케팅 상황판'에서 봅니다."
      >
        <AdsRefreshButton />
        <a href="/api/admin/ads-board" target="_blank" className="bg-background px-3 py-2 text-sm font-medium ring-1 ring-border hover:bg-secondary">
          새 창으로 크게 보기
        </a>
      </PageHeader>

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
            최근 {DAYS}일. 광고비는 아래 상황판에서 보고, 이 표는 그 돈이 실제로 문의로 이어졌는지를 봅니다.
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

      <iframe src="/api/admin/ads-board" title="검색광고 상황판" className="h-[80vh] w-full bg-background ring-1 ring-border" />
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
