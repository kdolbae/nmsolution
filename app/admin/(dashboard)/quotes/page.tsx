import { PageHeader } from '@/components/admin/form'
import { QuotesManager } from '@/components/admin/quotes-manager'
import { db } from '@/lib/db'
import { quoteRequests } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { photoIdsByQuote } from '@/lib/quote-photos'
import { ensureQuoteRequests } from '@/lib/quote-table'
import { notifyStatus } from '@/lib/notify/inquiry'

export const dynamic = 'force-dynamic'

async function getQuotes() {
  try {
    await ensureQuoteRequests()
    return await db.select().from(quoteRequests).orderBy(desc(quoteRequests.createdAt))
  } catch (e) {
    console.error('[admin] 견적 문의 조회 실패', e)
    return []
  }
}

export default async function AdminQuotesPage({ searchParams }: { searchParams: Promise<{ kakao?: string }> }) {
  const [quotes, photos, notify, sp] = await Promise.all([getQuotes(), photoIdsByQuote(), notifyStatus(), searchParams])
  const newCount = quotes.filter((q) => q.status === 'new').length

  return (
    <>
      <PageHeader
        title="견적 문의"
        description={
          newCount > 0
            ? `확인하지 않은 문의가 ${newCount}건 있습니다.`
            : '홈페이지 문의 폼으로 접수된 내역입니다.'
        }
      />
      <NotifyStatus status={notify} result={sp.kakao} />
      <QuotesManager quotes={quotes} photos={photos} />
    </>
  )
}

/** 문의가 들어오면 어디로 알림이 가는지. 꺼진 것은 무엇을 넣으면 켜지는지 적는다 */
function NotifyStatus({ status, result }: { status: Awaited<ReturnType<typeof notifyStatus>>; result?: string }) {
  const Row = ({ on, name, children }: { on: boolean; name: string; children: React.ReactNode }) => (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className={on ? 'font-semibold text-electric' : 'font-semibold text-muted-foreground'}>{on ? '● 켜짐' : '○ 꺼짐'}</span>
      <span className="font-semibold">{name}</span>
      <span className="text-muted-foreground">{children}</span>
    </li>
  )
  return (
    <section className="mb-6 bg-background p-5 text-sm ring-1 ring-border">
      <h2 className="mb-3 font-bold">문의 알림</h2>
      {result === 'on' && <p className="mb-3 text-electric">카카오톡 알림이 연결되었습니다.</p>}
      {result === 'fail' && <p className="mb-3 text-destructive">카카오톡 연결에 실패했습니다. 앱 설정(Redirect URI·동의항목)을 확인하고 다시 눌러 주세요.</p>}
      <ul className="flex flex-col gap-2">
        <Row on={status.telegram} name="텔레그램">{status.telegram ? '봇으로 바로 옵니다.' : 'TELEGRAM_BOT_TOKEN 을 넣으면 켜집니다.'}</Row>
        <Row on={!!status.kakao} name="카카오톡 (나에게 보내기)">
          {!status.kakaoKey ? (
            'Vercel 에 KAKAO_REST_API_KEY 를 넣으면 연결 버튼이 생깁니다.'
          ) : status.kakao ? (
            <>
              {status.kakao.nickname || '관리자'} 카카오톡으로 옵니다.{' '}
              <a href="/api/admin/kakao/connect?off=1" className="underline">
                연결 끊기
              </a>
            </>
          ) : (
            <a href="/api/admin/kakao/connect" className="font-semibold text-navy underline">
              카카오톡 알림 연결하기
            </a>
          )}
        </Row>
        <Row on={status.mail} name="메일">
          {status.mail ? `${status.mailTo || '관리자 계정 메일'}로 보냅니다.` : 'RESEND_API_KEY 를 넣으면 켜집니다.'}
        </Row>
      </ul>
    </section>
  )
}
