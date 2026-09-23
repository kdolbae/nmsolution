import Link from 'next/link'
import { cn } from '@/lib/utils'

export const COMPANY = {
  name: '엔엠솔루션 (NM SOLUTION)',
  ceo: '김성배',
  address: '경기도 평택시 고덕동 도시지원로 121 지식공장아이타워 906호',
  phoneMain: '1800-5901',
  phoneMobile: '010-2369-3691',
  telMain: 'tel:1800-5901',
  telMobile: 'tel:010-2369-3691',
}

/** 메인 내비게이션 — 공장 개보수 중심 */
export const NAV_ITEMS: { label: string; href: string; hideWhen?: 'projectsHidden' }[] = [
  { label: '개보수 범위', href: '/#scope' },
  { label: '작업 사진', href: '/#works' },
  { label: '진행 프로세스', href: '/#process' },
  { label: '시공사례', href: '/#projects', hideWhen: 'projectsHidden' },
  { label: '사업소개', href: '/services' },
  { label: '회사소개', href: '/about' },
  { label: '고객문의', href: '/#contact' },
]

/** 헤더 배너에 노출되는 기타 사업분야 (사업소개 상세 페이지로 이동) */
export const OTHER_SERVICES = [
  { label: '반도체 공장 설비', href: '/services/semiconductor' },
  { label: '누수 피해복구', href: '/services/recovery' },
  { label: '단열 · 결로 · 곰팡이', href: '/services/insulation' },
  { label: '나노 · UV 코팅', href: '/services/coating' },
  { label: '코팅제 판매', href: '/services/products' },
  { label: '시공 교육', href: '/services/academy' },
]

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)} aria-label="NM SOLUTION 홈">
      <span className="flex h-7 w-7 items-center justify-center bg-navy text-navy-foreground" aria-hidden>
        <span className="font-mono text-[11px] font-bold leading-none tracking-tight">NM</span>
      </span>
      <span className="font-mono text-sm font-semibold uppercase tracking-[0.18em]">NM Solution</span>
    </Link>
  )
}
