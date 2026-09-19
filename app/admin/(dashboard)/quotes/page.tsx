import { PageHeader } from '@/components/admin/form'
import { QuotesManager } from '@/components/admin/quotes-manager'
import { db } from '@/lib/db'
import { quoteRequests } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function getQuotes() {
  try {
    return await db.select().from(quoteRequests).orderBy(desc(quoteRequests.createdAt))
  } catch (e) {
    console.error('[admin] 견적 문의 조회 실패', e)
    return []
  }
}

export default async function AdminQuotesPage() {
  const quotes = await getQuotes()
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
      <QuotesManager quotes={quotes} />
    </>
  )
}
