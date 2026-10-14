import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LOGO_COLORS, logoSvg, type LogoVariant } from '@/lib/brand-logo'

export const COMPANY = {
  name: '엔엠솔루션 (NM SOLUTION)',
  ceo: '김성배',
  bizNumber: '736-88-01988',
  address: '경기도 평택시 고덕동 도시지원로 121 지식공장아이타워 906호',
  phoneMain: '1800-5901',
  phoneMobile: '010-2369-3691',
  telMain: 'tel:1800-5901',
  telMobile: 'tel:010-2369-3691',
}

/** 메인 내비게이션 — 공장 개보수 중심 */
export const NAV_ITEMS: { label: string; href: string; hideWhen?: 'projectsHidden' | 'galleryHidden' }[] = [
  { label: '개보수 범위', href: '/#scope' },
  { label: '작업 사진', href: '/#works', hideWhen: 'galleryHidden' },
  { label: '진행 프로세스', href: '/#process' },
  { label: '시공사례', href: '/#projects', hideWhen: 'projectsHidden' },
  { label: '사업소개', href: '/services' },
  { label: '회사소개', href: '/about' },
  { label: '고객문의', href: '/#contact' },
]

/** 헤더 배너에 노출되는 기타 사업분야 (사업소개 상세 페이지로 이동) */
export const OTHER_SERVICES = [
  { label: '누수 피해복구', href: '/services/recovery' },
  { label: '단열 · 결로 · 곰팡이', href: '/services/insulation' },
  { label: '나노 · UV 코팅', href: '/services/coating' },
  { label: '코팅제 판매', href: '/services/products' },
  { label: '시공 교육', href: '/services/academy' },
]

/** 공식 로고(lib/brand-logo.ts). inverted 는 어두운 배경용(회색 부분을 흰색으로) */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn('flex items-center', className)} aria-label="엔엠솔루션 홈">
      <LogoImage className="h-7 lg:h-8" inverted={inverted} />
    </Link>
  )
}

export function LogoImage({
  className,
  inverted = false,
  variant = 'horizontal',
}: {
  className?: string
  inverted?: boolean
  variant?: LogoVariant
}) {
  return (
    <span
      className={cn('inline-block shrink-0 [&>svg]:h-full [&>svg]:w-auto', className)}
      style={{ color: inverted ? '#FFFFFF' : LOGO_COLORS.ink }}
      dangerouslySetInnerHTML={{ __html: logoSvg(variant, { ink: 'currentColor' }) }}
    />
  )
}
