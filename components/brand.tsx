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

export const NAV_ITEMS = [
  { label: '사업분야', href: '#services' },
  { label: '시공사례', href: '#projects' },
  { label: '제품', href: '#products' },
  { label: '교육', href: '#academy' },
  { label: '회사소개', href: '#why' },
  { label: '고객문의', href: '#contact' },
]

export function Logo({ className }: { className?: string }) {
  return (
    <a href="#top" className={cn('flex items-center gap-2.5', className)} aria-label="NM SOLUTION 홈">
      <span className="flex h-7 w-7 items-center justify-center bg-navy text-navy-foreground" aria-hidden>
        <span className="font-mono text-[11px] font-bold leading-none tracking-tight">NM</span>
      </span>
      <span className="font-mono text-sm font-semibold uppercase tracking-[0.18em]">NM Solution</span>
    </a>
  )
}
