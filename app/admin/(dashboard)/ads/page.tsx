import { PageHeader } from '@/components/admin/form'

export const dynamic = 'force-dynamic'

/** 검색광고 상황판 — 광고 도구가 매일 만드는 네이버 광고 성과표를 그대로 보여 준다 (/api/admin/ads-board). */
export default function AdsBoardPage() {
  return (
    <>
      <PageHeader
        title="검색광고 상황판"
        description="네이버 검색광고의 노출·클릭·광고비·순위를 매일 아침 모아 만든 표입니다. 방문·문의는 '마케팅 상황판'에서 봅니다."
      >
        <a href="/api/admin/ads-board" target="_blank" className="bg-background px-3 py-2 text-sm font-medium ring-1 ring-border hover:bg-secondary">
          새 창으로 크게 보기
        </a>
      </PageHeader>
      <iframe src="/api/admin/ads-board" title="검색광고 상황판" className="h-[80vh] w-full bg-background ring-1 ring-border" />
    </>
  )
}
