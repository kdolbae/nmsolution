import { PageHeader } from '@/components/admin/form'
import { FlagTable } from '@/components/est/settle-view'
import { Card, Empty, Tabs } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { listVarianceFlags } from '@/lib/est/data'

export const dynamic = 'force-dynamic'
export const metadata = { title: '마스터 갱신 후보 | NM SOLUTION 관리자' }

/** S15 마스터 갱신 후보(대표): 전 프로젝트 정산에서 나온 단가 차이. 적용 = 견적단가 새 줄(source variance) */
export default async function Variance({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'new' } = await searchParams
  const s = await estPageSession()
  if (s?.estRole !== 'ceo') return <Empty>마스터 갱신 후보는 대표만 처리할 수 있음</Empty>
  const flags = await listVarianceFlags(tab === 'all' ? null : 'new')
  return (
    <>
      <PageHeader title="마스터 갱신 후보" description="정산 마감 때 견적단가와 실단가 차이가 기준 % 이상인 품목" />
      <Tabs
        items={[
          { key: 'new', label: '처리 전', href: '/admin/est/variance' },
          { key: 'all', label: '전체', href: '/admin/est/variance?tab=all' },
        ]}
        current={tab}
      />
      <div className="mt-5">
        <Card>
          <FlagTable flags={flags} isCeo showProject />
        </Card>
      </div>
    </>
  )
}
