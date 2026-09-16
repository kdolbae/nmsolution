import Link from 'next/link'
import { Logo, NAV_ITEMS, OTHER_SERVICES } from './brand'
import type { SettingsContent } from '@/lib/content/defaults'

export function SiteFooter({ settings }: { settings: SettingsContent }) {
  const nav = NAV_ITEMS.filter((n) => !(n.hideWhen === 'projectsHidden' && !settings.showProjects))

  return (
    <footer className="border-t border-border bg-background pb-28 pt-16 lg:pb-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Logo />
            <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
              Factory Renovation Specialist.
              <br />
              공장 개보수, 빠르게 그리고 정확하게. 평택 고덕을 기반으로 경기·충청권 현장을 직접 방문합니다.
            </p>
          </div>

          <nav className="lg:col-span-3" aria-label="푸터 메뉴">
            <p className="text-kicker mb-5 text-muted-foreground">Menu</p>
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-sm font-medium hover:text-electric">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-kicker mb-4 mt-8 text-muted-foreground">Other Solutions</p>
            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {OTHER_SERVICES.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="text-sm text-muted-foreground hover:text-electric">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <p className="text-kicker mb-5 text-muted-foreground">Company</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              <dt className="text-muted-foreground">상호</dt>
              <dd>{settings.companyName}</dd>
              <dt className="text-muted-foreground">대표</dt>
              <dd>{settings.ceo}</dd>
              <dt className="text-muted-foreground">주소</dt>
              <dd>{settings.address}</dd>
              <dt className="text-muted-foreground">담당자 직통</dt>
              <dd>
                <a
                  href={`tel:${settings.phoneMobile}`}
                  className="font-mono font-semibold text-electric hover:text-foreground"
                >
                  {settings.phoneMobile}
                </a>
              </dd>
              <dt className="text-muted-foreground">대표전화</dt>
              <dd>
                <a href={`tel:${settings.phoneMain}`} className="font-mono hover:text-electric">
                  {settings.phoneMain}
                </a>
              </dd>
            </dl>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono">© 2026 NM SOLUTION. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/admin" className="hover:text-foreground">
              관리자
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
