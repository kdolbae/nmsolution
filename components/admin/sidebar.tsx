'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Layers, User, Images, Settings, Download, ExternalLink, LogOut, LayoutDashboard, Building2, Inbox, BarChart3, Search, KeyRound, Activity, Menu, X, PencilRuler } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { BOARD_ADS_URL, BOARD_STATS_URL } from '@/lib/board-urls'
import { ADMIN_MARK_COOKIE } from '@/components/admin-fab'
import { LogoImage } from '@/components/brand'


const LINKS: Array<{ href: string; label: string; icon: typeof Home; external?: boolean }> = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/clients', label: '업체 관리', icon: Building2 },
  { href: '/admin/drawings', label: '배관 도면 작성', icon: PencilRuler },
  { href: BOARD_STATS_URL, label: '마케팅 상황판', icon: BarChart3, external: true },
  { href: BOARD_ADS_URL, label: '검색광고 상황판', icon: Search, external: true },
  { href: '/admin/stats', label: '자체 방문 기록', icon: Activity },
  { href: '/admin/quotes', label: '견적 문의', icon: Inbox },
  { href: '/admin/home', label: '메인 페이지', icon: Home },
  { href: '/admin/services', label: '사업소개', icon: Layers },
  { href: '/admin/about', label: '회사소개', icon: User },
  { href: '/admin/projects', label: '시공사례', icon: Images },
  { href: '/admin/settings', label: '사이트 설정', icon: Settings },
  { href: '/admin/account', label: '계정 · 비밀번호', icon: KeyRound },
]

export function AdminSidebar({ userName }: { userName: string }) {
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

  const body = (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="관리자 메뉴">
        {LINKS.map((l) => {
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
          const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href)
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
        })}

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
      </nav>

      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <span className="truncate text-sm text-muted-foreground">{userName}</span>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          로그아웃
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <LogoImage className="h-7" />
          <span className="text-kicker text-electric">Admin</span>
        </div>
        {body}
      </aside>

      {/* 모바일: 상단 바 + 햄버거 버튼으로 여는 서랍 메뉴 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <LogoImage className="h-6" />
          <span className="text-kicker text-electric">Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          className="-mr-2 inline-flex size-10 items-center justify-center text-foreground"
        >
          <Menu className="size-6" strokeWidth={1.75} />
        </button>
      </header>

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
