'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo, NAV_ITEMS } from './brand'

export function SiteHeader() {
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

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled || open
          ? 'border-b border-border bg-background/95 text-foreground backdrop-blur'
          : 'border-b border-transparent bg-transparent text-navy-foreground',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:h-20 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-9 lg:flex" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium tracking-tight opacity-80 transition-opacity hover:opacity-100"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className={cn(
              'hidden h-10 items-center px-5 text-sm font-semibold transition-colors lg:inline-flex',
              scrolled || open
                ? 'bg-navy text-navy-foreground hover:bg-electric'
                : 'bg-background text-navy hover:bg-electric hover:text-electric-foreground',
            )}
          >
            견적 문의
          </a>
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
          'lg:hidden overflow-hidden bg-background text-foreground transition-[max-height] duration-300 ease-out',
          open ? 'max-h-[calc(100dvh-4rem)]' : 'max-h-0',
        )}
      >
        <nav className="flex flex-col px-5 pb-8 pt-2" aria-label="모바일 메뉴">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-border py-4 text-lg font-medium"
            >
              {item.label}
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex h-12 items-center justify-center bg-navy text-sm font-semibold text-navy-foreground"
          >
            견적 문의
          </a>
        </nav>
      </div>
    </header>
  )
}
