'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Layers, User, Images, Settings, Download, ExternalLink, LogOut, LayoutDashboard, Building2, Inbox, BarChart3, Search, KeyRound, Activity, X, Calculator, BookOpen, Database, SlidersHorizontal, GitCompareArrows } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { BOARD_ADS_URL, BOARD_STATS_URL } from '@/lib/board-urls'
import { ADMIN_MARK_COOKIE } from '@/components/admin-fab'
import { LogoImage } from '@/components/brand'
import { ADMIN_MENU_EVENT } from '@/components/admin/top-bar'


type NavLink = { href: string; label: string; icon: typeof Home; external?: boolean; module?: string }

/** 사이트·업체 관리 (로컬 관리자 전용) */
const LINKS: NavLink[] = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/clients', label: '업체 관리', icon: Building2, module: 'clients' },
  { href: BOARD_STATS_URL, label: '마케팅 상황판', icon: BarChart3, external: true, module: 'site' },
  { href: BOARD_ADS_URL, label: '검색광고 상황판', icon: Search, external: true, module: 'site' },
  { href: '/admin/stats', label: '자체 방문 기록', icon: Activity, module: 'site' },
  { href: '/admin/quotes', label: '견적 문의', icon: Inbox, module: 'quotes' },
  { href: '/admin/home', label: '메인 페이지', icon: Home, module: 'site' },
  { href: '/admin/services', label: '사업소개', icon: Layers, module: 'site' },
  { href: '/admin/about', label: '회사소개', icon: User, module: 'site' },
  { href: '/admin/projects', label: '시공사례', icon: Images, module: 'site' },
  { href: '/admin/settings', label: '사이트 설정', icon: Settings, module: 'site' },
]

/** 견적·공사 묶음 (모듈 menu.modules.est) */
const EST_LINKS: NavLink[] = [
  { href: '/admin/est', label: '견적 현황', icon: Calculator },
  { href: '/admin/est/ledger', label: '견적 대장', icon: BookOpen },
  { href: '/admin/est/masters', label: '마스터', icon: Database },
  { href: '/admin/est/settings', label: '기준 설정', icon: SlidersHorizontal },
  { href: '/admin/est/variance', label: '갱신 후보', icon: GitCompareArrows },
]

const ACCOUNT_LINK: NavLink = { href: '/admin/account', label: '계정 · 비밀번호', icon: KeyRound }

/** 경로가 메뉴 항목에 해당하는지. /admin/est 는 하위 메뉴(대장·마스터 등)가 따로 있으므로 그것들은 빼고 판단 */
function isActive(href: string, pathname: string) {
  if (href === '/admin') return pathname === '/admin'
  if (href === '/admin/est') return pathname === '/admin/est' || (pathname.startsWith('/admin/est/') && !EST_LINKS.some((l) => l.href !== '/admin/est' && pathname.startsWith(l.href)))
  return pathname.startsWith(href)
}

export function AdminSidebar({
  userName,
  via = 'local',
  siteAdmin = true,
  modules = {},
}: {
  userName: string
  /** local: better-auth 로그인, sso: SBworks 로 들어온 직원 */
  via?: 'local' | 'sso'
  /** 사이트·업체 관리 메뉴까지 보이는지(로컬 관리자) */
  siteAdmin?: boolean
  /** 설정 menu.modules (false 인 모듈은 숨김) */
  modules?: Record<string, boolean>
}) {
  const pathname = usePathname()
  const router = useRouter()

  // 사이트 화면에 관리자 버튼(components/admin-fab.tsx)을 띄우기 위한 표시. 권한은 버튼이 세션으로 다시 확인한다
  useEffect(() => {
    document.cookie = `${ADMIN_MARK_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
  }, [])

  const signOut = async () => {
    document.cookie = `${ADMIN_MARK_COOKIE}=; Path=/; Max-Age=0`
    await authClient.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const [open, setOpen] = useState(false)

  // 상단바(components/admin/top-bar.tsx)의 햄버거가 서랍을 연다
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(ADMIN_MENU_EVENT, onOpen)
    return () => window.removeEventListener(ADMIN_MENU_EVENT, onOpen)
  }, [])

  const on = (l: NavLink) => !l.module || modules[l.module] !== false
  const siteLinks = siteAdmin ? LINKS.filter(on) : []
  const estLinks = modules.est === false ? [] : EST_LINKS

  // 메뉴에서 페이지를 고르면 모바일 서랍을 닫는다
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const renderLink = (l: NavLink) => {
    if (l.external)
      return (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <l.icon className="size-4" strokeWidth={1.75} />
          {l.label}
          <ExternalLink className="ml-auto size-3.5 opacity-50" strokeWidth={1.75} />
        </a>
      )
    const active = isActive(l.href, pathname)
    return (
      <Link
        key={l.href}
        href={l.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
          active ? 'bg-navy text-navy-foreground' : 'text-foreground/75 hover:bg-secondary hover:text-foreground',
        )}
      >
        <l.icon className="size-4" strokeWidth={1.75} />
        {l.label}
      </Link>
    )
  }

  const body = (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="관리자 메뉴">
        {siteLinks.map(renderLink)}

        {estLinks.length > 0 && (
          <>
            <p className={cn('px-3 pb-1 text-xs font-semibold text-muted-foreground', siteLinks.length > 0 && 'mt-4')}>견적·공사</p>
            {estLinks.map(renderLink)}
          </>
        )}

        <div className="mt-2">{renderLink(ACCOUNT_LINK)}</div>

        {siteAdmin && (
          <>
        <div className="my-3 border-t border-border" />

        <a
          href="/api/admin/export"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Download className="size-4" strokeWidth={1.75} />
          코드 다운로드
        </a>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ExternalLink className="size-4" strokeWidth={1.75} />
          사이트 보기
        </Link>
          </>
        )}
      </nav>

      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <span className="truncate text-sm text-muted-foreground">{userName}</span>
        {via === 'sso' ? (
          <form method="post" action="/api/sso/logout">
            <button type="submit" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <LogOut className="size-3.5" />
              로그아웃
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            로그아웃
          </button>
        )}
      </div>
    </>
  )

  return (
    <>
      <aside className="sticky top-[var(--sb-topbar-h)] hidden h-[calc(100svh-var(--sb-topbar-h))] w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <LogoImage className="h-7" />
          <span className="text-kicker text-electric">Admin</span>
        </div>
        {body}
      </aside>

      {/* 모바일: 상단바 햄버거(ADMIN_MENU_EVENT)로 여는 서랍 메뉴 */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="관리자 메뉴">
          <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <LogoImage className="h-6" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="-mr-2 inline-flex size-10 items-center justify-center text-foreground"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            {body}
          </aside>
        </div>
      )}
    </>
  )
}
