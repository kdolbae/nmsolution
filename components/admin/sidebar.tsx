'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Layers, User, Images, Settings, Download, ExternalLink, LogOut, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'

const LINKS = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/home', label: '메인 페이지', icon: Home },
  { href: '/admin/services', label: '사업소개', icon: Layers },
  { href: '/admin/about', label: '회사소개', icon: User },
  { href: '/admin/projects', label: '시공사례', icon: Images },
  { href: '/admin/settings', label: '사이트 설정', icon: Settings },
]

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const signOut = async () => {
    await authClient.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
        <span className="flex h-7 w-7 items-center justify-center bg-navy text-navy-foreground">
          <span className="font-mono text-[11px] font-bold leading-none">NM</span>
        </span>
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">NM Solution</span>
          <span className="text-kicker text-electric">Admin</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="관리자 메뉴">
        {LINKS.map((l) => {
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
    </aside>
  )
}
