import Link from 'next/link'
import { ArrowRight, Download, Eye, EyeOff } from 'lucide-react'
import { PageHeader } from '@/components/admin/form'
import { getAllProjects, getContent } from '@/lib/content/get'
import { db } from '@/lib/db'
import { quoteRequests, siteContent } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const CARDS = [
  { href: '/admin/quotes', title: '견적 문의', d: '홈페이지 폼으로 접수된 문의 확인 · 상태 관리' },
  { href: '/admin/home', title: '메인 페이지', d: '히어로 문구, 개보수 범위, 진행 프로세스, 회사 소개, 문의 문구' },
  { href: '/admin/services', title: '사업소개', d: '6개 사업분야의 소개 문구, 주요 작업, 대상 고객' },
  { href: '/admin/about', title: '회사소개', d: '대표 인사말, 대표 사진' },
  { href: '/admin/projects', title: '시공사례', d: '사례 추가 · 편집 · 노출 관리' },
  { href: '/admin/settings', title: '사이트 설정', d: '시공사례 메뉴 노출, 연락처, 회사 정보' },
]

export default async function AdminDashboard() {
  const [settings, projects, rows, newQuotes] = await Promise.all([
    getContent('settings'),
    getAllProjects(),
    db.select({ key: siteContent.key, updatedAt: siteContent.updatedAt }).from(siteContent),
    db
      .select({ id: quoteRequests.id })
      .from(quoteRequests)
      .where(eq(quoteRequests.status, 'new'))
      .catch(() => []),
  ])
  const lastUpdated = rows.reduce<Date | null>((acc, r) => (!acc || r.updatedAt > acc ? r.updatedAt : acc), null)

  return (
    <>
      <PageHeader title="대시보드" description="사이트의 모든 문구와 사례를 여기서 편집합니다. 저장하면 즉시 반영됩니다." />

      <div className="mb-6 grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
        <Stat
          label="새 견적 문의"
          value={`${newQuotes.length}건`}
          sub={newQuotes.length > 0 ? '확인이 필요합니다' : '확인하지 않은 문의 없음'}
        />
        <Stat label="시공사례" value={`${projects.length}건`} sub={`${projects.filter((p) => p.published).length}건 공개`} />
        <Stat
          label="시공사례 메뉴"
          value={settings.showProjects ? '노출 중' : '숨김'}
          sub={settings.showProjects ? '사이트에 표시됩니다' : '사례가 준비되면 설정에서 켜세요'}
          icon={settings.showProjects ? Eye : EyeOff}
        />
        <Stat
          label="마지막 수정"
          value={lastUpdated ? lastUpdated.toLocaleDateString('ko-KR') : '—'}
          sub={lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '아직 편집 내역 없음'}
        />
      </div>

      <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
        {CARDS.map((c) => (
          <li key={c.href} className="bg-background">
            <Link href={c.href} className="group flex h-full flex-col justify-between gap-6 p-6 transition-colors hover:bg-secondary">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-lg font-bold tracking-tight">{c.title}</h2>
                <p className="text-sm text-muted-foreground">{c.d}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                편집
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
        <li className="bg-navy text-navy-foreground">
          <a href="/api/admin/export" className="group flex h-full flex-col justify-between gap-6 p-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-bold tracking-tight">코드 다운로드</h2>
              <p className="text-sm text-navy-foreground/70">
                현재 소스코드 전체를 ZIP으로 받습니다. 다른 서버에 직접 배포할 때 사용하세요.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-electric">
              <Download className="size-4" />
              ZIP 다운로드
            </span>
          </a>
        </li>
      </ul>
    </>
  )
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string
  value: string
  sub: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col gap-1 bg-background p-6">
      <span className="text-kicker text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        {Icon && <Icon className="size-5 text-electric" />}
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  )
}
