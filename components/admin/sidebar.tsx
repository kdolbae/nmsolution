'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ExternalLink, LogOut, Building2, Inbox, KeyRound, Menu, X, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { ADMIN_MARK_COOKIE } from '@/components/admin-fab'
import { LogoImage } from '@/components/brand'


// 홈페이지 내용·견적 문의·업체 접속 기록·발주서는 N-CMS(sbworks.bond)로 옮겼다(kevin 2026-11-10·11).
// 업체 관리(견적·업무지시서·자재·적산·명함)만 N-CMS 1차-b 까지 여기 남긴다.
const NCMS = 'https://sbworks.bond'
const LINKS: Array<{ href: string; label: string; icon: typeof Home; external?: boolean }> = [
  { href: '/admin/clients', label: '업체 관리', icon: Building2 },
  { href: '/admin/account', label: '계정 · 비밀번호', icon: KeyRound },
  { href: `${NCMS}/homepage`, label: '홈페이지 내용 (N-CMS)', icon: Home, external: true },
  { href: `${NCMS}/inbox`, label: '견적 문의 (N-CMS)', icon: Inbox, external: true },
  { href: `${NCMS}/orders`, label: '발주서 (N-CMS)', icon: ClipboardList, external: true },
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
          const active = pathname.startsWith(l.href)
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
