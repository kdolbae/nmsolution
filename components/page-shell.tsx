import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { FloatingContact, MobileContactBar } from './contact-widgets'
import type { SettingsContent } from '@/lib/content/defaults'

/** 내부 페이지 공통 레이아웃 (흰 헤더 + 푸터 + 상담 위젯) */
export function PageShell({ settings, children }: { settings: SettingsContent; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader solidByDefault showProjects={settings.showProjects} />
      <main className="pt-16 lg:pt-[7.5rem]">{children}</main>
      <SiteFooter settings={settings} />
      <FloatingContact phone={settings.phoneMain} kakaoUrl={settings.kakaoUrl} />
      <MobileContactBar phone={settings.phoneMain} kakaoUrl={settings.kakaoUrl} />
    </>
  )
}

export function PageHero({
  kicker,
  title,
  description,
}: {
  kicker: string
  title: React.ReactNode
  description?: string
}) {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-16 lg:px-8 lg:py-24">
        <p className="text-kicker flex items-center gap-3 text-muted-foreground">
          <span className="h-px w-8 bg-electric" aria-hidden />
          {kicker}
        </p>
        <h1 className="max-w-4xl text-balance text-4xl font-black leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground lg:text-lg">{description}</p>
        )}
      </div>
    </section>
  )
}
