'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ClipboardCheck, Bell, Menu, LogOut, User, Building2, Check } from 'lucide-react'
import { LogoImage } from '@/components/brand'
import { cn } from '@/lib/utils'

/** 모바일에서 상단바 햄버거가 사이드바 서랍을 여는 신호 */
export const ADMIN_MENU_EVENT = 'nm-admin-menu-open'

export type TopBarMembership = { tenantId: string; slug: string; name: string; roleCode: string; appUrl: string | null }

/**
 * 공통 상단바(기획서 §12.2, SBworks 와 같은 DOM·클래스 sb-topbar).
 * [로고 SBworks ▾사업부 전환기]            [결재 n] [알림] [사용자 ▾]
 * 사업부 전환기는 SSO 토큰의 memberships 로 그림. 본사 권한(hq)이 있으면 맨 아래 "본사 현황".
 */
export function TopBar({
  current,
  memberships,
  hq,
  sbworksUrl,
  userName,
  roleLabel,
  via,
  pending,
}: {
  current: { slug: string; name: string }
  memberships: TopBarMembership[]
  hq: boolean
  sbworksUrl: string
  userName: string
  roleLabel: string
  via: 'local' | 'sso'
  pending: number
}) {
  return (
    <header className="sb-topbar sticky top-0 z-40 flex h-[var(--sb-topbar-h)] items-center justify-between gap-3 bg-navy px-3 text-navy-foreground lg:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="메뉴 열기"
          onClick={() => window.dispatchEvent(new Event(ADMIN_MENU_EVENT))}
          className="-ml-1 inline-flex size-10 items-center justify-center text-navy-foreground lg:hidden"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <Link href="/admin" className="flex items-center gap-2" aria-label="관리자 홈">
          <LogoImage className="h-5 text-navy-foreground" />
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-navy-foreground/60 sm:inline">SBworks</span>
        </Link>
        <Switcher current={current} memberships={memberships} hq={hq} sbworksUrl={sbworksUrl} />
      </div>
      <div className="flex items-center gap-1">
        <Link
          href="/admin/est?tab=approval"
          className="relative inline-flex h-10 items-center gap-1.5 px-2 text-sm text-navy-foreground/80 hover:text-navy-foreground"
          aria-label={`결재 대기 ${pending}건`}
        >
          <ClipboardCheck className="size-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">결재</span>
          {pending > 0 && <span className="inline-flex min-w-5 items-center justify-center bg-electric px-1 font-mono text-[11px] text-electric-foreground">{pending}</span>}
        </Link>
        {/* 알림: 1단계는 자리만 */}
        <span className="hidden size-10 items-center justify-center text-navy-foreground/40 sm:inline-flex" aria-hidden>
          <Bell className="size-4" strokeWidth={1.75} />
        </span>
        <UserMenu userName={userName} roleLabel={roleLabel} via={via} />
      </div>
    </header>
  )
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

function Switcher({ current, memberships, hq, sbworksUrl }: { current: { slug: string; name: string }; memberships: TopBarMembership[]; hq: boolean; sbworksUrl: string }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  const others = memberships.filter((m) => m.slug !== current.slug)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-1 px-2 text-sm font-bold text-navy-foreground"
      >
        <span className="truncate">{current.name}</span>
        <ChevronDown className="size-4 opacity-70" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-50 mt-1 w-64 border border-border bg-background py-1 text-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
          <p className="px-3 py-2 text-xs text-muted-foreground">사업부 전환</p>
          <span className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
            {current.name}
            <Check className="size-4 text-electric" />
          </span>
          {others.map((m) => (
            <a
              key={m.tenantId}
              role="menuitem"
              href={m.appUrl || sbworksUrl}
              className="flex items-center justify-between px-3 py-2 text-sm hover:bg-secondary"
            >
              <span>{m.name}</span>
              <span className="text-xs text-muted-foreground">{m.roleCode}</span>
            </a>
          ))}
          {!others.length && <p className="px-3 py-2 text-xs text-muted-foreground">다른 사업부 소속 없음</p>}
          {hq && (
            <a role="menuitem" href={`${sbworksUrl}/hq`} className="mt-1 flex items-center gap-2 border-t border-border px-3 py-2 text-sm hover:bg-secondary">
              <Building2 className="size-4" strokeWidth={1.75} />
              본사 현황
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function UserMenu({ userName, roleLabel, via }: { userName: string; roleLabel: string; via: 'local' | 'sso' }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-1 px-2 text-sm text-navy-foreground"
      >
        <User className="size-4" strokeWidth={1.75} />
        <span className="hidden max-w-32 truncate sm:inline">{userName}</span>
        <ChevronDown className="size-4 opacity-70" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-60 border border-border bg-background py-1 text-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold">{userName}</p>
            <p className="text-xs text-muted-foreground">
              {roleLabel} · {via === 'sso' ? 'SBworks 로그인' : '로컬 로그인'}
            </p>
          </div>
          <Link role="menuitem" href="/admin/account" className="block px-3 py-2 text-sm hover:bg-secondary">
            내 계정
          </Link>
          {via === 'sso' ? (
            <>
              <form method="post" action="/api/sso/logout">
                <button type="submit" role="menuitem" className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary')}>
                  <LogOut className="size-4" strokeWidth={1.75} />
                  로그아웃
                </button>
              </form>
              <form method="post" action="/api/sso/logout?all=1">
                <button type="submit" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary">
                  <LogOut className="size-4" strokeWidth={1.75} />
                  모든 사업부에서 로그아웃
                </button>
              </form>
            </>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">로그아웃은 왼쪽 메뉴 아래에 있음</p>
          )}
        </div>
      )}
    </div>
  )
}
