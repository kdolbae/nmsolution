'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPANY, Logo, NAV_ITEMS, OTHER_SERVICES } from './brand'

type Props = {
  /** true면 스크롤 전에도 흰 배경 (내부 페이지용) */
  solidByDefault?: boolean
  showProjects?: boolean
}

export function SiteHeader({ solidByDefault = false, showProjects = true }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const solid = solidByDefault || scrolled || open
  const nav = NAV_ITEMS.filter((n) => !(n.hideWhen === 'projectsHidden' && !showProjects))

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* 기타 사업분야 배너 */}
      <div
        className={cn(
          'hidden border-b transition-all duration-300 lg:block',
          scrolled
            ? 'max-h-0 overflow-hidden border-transparent opacity-0'
            : 'max-h-10 border-navy-foreground/10 bg-charcoal text-charcoal-foreground opacity-100',
        )}
        aria-label="기타 사업분야"
      >
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <Link href="/services" className="text-kicker text-charcoal-foreground/50 transition-colors hover:text-electric">
              Other Solutions
            </Link>
            <nav className="flex items-center gap-5" aria-label="기타 사업분야 메뉴">
              {OTHER_SERVICES.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="text-xs font-medium text-charcoal-foreground/75 transition-colors hover:text-electric"
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={COMPANY.telMain}
              className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wide text-charcoal-foreground/80 hover:text-electric"
            >
              <span className="text-charcoal-foreground/45">대표</span>
              {COMPANY.phoneMain}
            </a>
            <span className="h-3 w-px bg-charcoal-foreground/20" aria-hidden />
            <a
              href={COMPANY.telMobile}
              className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wide text-electric hover:text-charcoal-foreground"
            >
              <span className="text-charcoal-foreground/45">직통</span>
              {COMPANY.phoneMobile}
            </a>
          </div>
        </div>
      </div>

      {/* 메인 헤더 */}
      <div
        className={cn(
          'transition-colors duration-300',
          solid
            ? 'border-b border-border bg-background/95 text-foreground backdrop-blur'
            : 'border-b border-transparent bg-transparent text-navy-foreground',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:h-20 lg:px-8">
          <div className="flex items-center gap-4">
            <Logo />
            <span
              className={cn(
                'hidden items-center gap-2 border-l pl-4 text-xs font-semibold tracking-tight md:flex',
                solid ? 'border-border text-muted-foreground' : 'border-navy-foreground/20 text-navy-foreground/70',
              )}
            >
              <span className="size-1.5 bg-electric" aria-hidden />
              공장 개보수 전문
            </span>
          </div>

          <nav className="hidden items-center gap-9 lg:flex" aria-label="주요 메뉴">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium tracking-tight opacity-80 transition-opacity hover:opacity-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/#contact"
              className={cn(
                'hidden h-10 items-center px-5 text-sm font-semibold transition-colors lg:inline-flex',
                solid
                  ? 'bg-navy text-navy-foreground hover:bg-electric'
                  : 'bg-electric text-electric-foreground hover:bg-background hover:text-navy',
              )}
            >
              빠른 견적
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div
          id="mobile-nav"
          className={cn(
            'lg:hidden overflow-y-auto bg-background text-foreground transition-[max-height] duration-300 ease-out',
            open ? 'max-h-[calc(100dvh-4rem)]' : 'max-h-0',
          )}
        >
          <nav className="flex flex-col px-5 pb-8 pt-2" aria-label="모바일 메뉴">
            {nav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-border py-4 text-lg font-medium"
              >
                {item.label}
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </Link>
            ))}

            <p className="text-kicker mt-8 text-muted-foreground">Other Solutions</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {OTHER_SERVICES.map((s) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between bg-secondary px-3 py-3 text-sm font-medium"
                  >
                    {s.label}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/#contact"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex h-12 items-center justify-center bg-navy text-sm font-semibold text-navy-foreground"
            >
              빠른 견적
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
