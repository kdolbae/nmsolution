import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowDown, ArrowRight, Camera, Check, ChevronDown, MapPin, MessageSquareText, Smartphone } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { SectionHeading } from '@/components/section-heading'
import { PhotoQuoteForm } from '@/components/photo-quote-form'
import { KakaoChatButton } from '@/components/contact-widgets'
import { TrackLink } from '@/components/track-link'
import type { SettingsContent } from '@/lib/content/defaults'
import { jsonLdScript, siteUrl } from '@/lib/site'
import { WORK_LANDINGS, type WorkLanding } from '@/lib/work-landings'

/**
 * 작업별 검색광고 랜딩 — /services/welding · piping · steel · panel · equipment.
 * app/services/[slug]/page.tsx 가 주소가 작업 랜딩이면 이 화면을 그린다.
 * (/work/<키> 는 현장 팀 업무 지시서 링크라 쓰지 않는다.)
 *
 * 검색한 작업이 첫 화면 제목에 그대로 보이고, 바로 아래에 그 작업의 실제 현장 사진이 나온다.
 * 구성은 /leak 와 같다(첫 화면 → 사진 견적 폼 → 작업 범위 → 현장 사진 → 순서 → FAQ → 마지막 권유).
 * 내용은 lib/work-landings.ts 에 있다.
 */

/** /services/<작업> 의 검색 결과 · 공유 미리보기 정보 */
export function workLandingMetadata(w: WorkLanding): Metadata {
  const path = `/services/${w.slug}`
  return {
    title: w.title,
    description: w.description,
    keywords: w.keywords,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      siteName: '엔엠솔루션 NM SOLUTION',
      title: w.title,
      description: w.description,
      url: path,
      images: [{ url: w.hero.src, width: 1000, height: 750, alt: w.hero.label }],
    },
    twitter: { card: 'summary_large_image', title: w.title, description: w.description, images: [w.hero.src] },
  }
}

const STEPS = [
  { n: '01', title: '사진 보내기', description: '이 페이지에서 바로 찍어 보내거나, 카카오톡 · 문자로 보내주세요.' },
  { n: '02', title: '출장 전 견적 안내', description: '사진을 보고 연락드려 작업 방법과 예상 금액을 먼저 말씀드립니다.' },
  { n: '03', title: '현장 확인 · 일정', description: '동의하시면 방문해 실측하고, 공장 가동 일정에 맞춰 작업일을 잡습니다.' },
  { n: '04', title: '시공 · 마무리', description: '작업 전 · 후 사진과 항목별 내역서를 드립니다.' },
]

export function WorkLandingView({ w, settings }: { w: WorkLanding; settings: SettingsContent }) {
  const url = siteUrl()
  const path = `/services/${w.slug}`
  const tel = `tel:${settings.phoneMobile}`
  const from = `work_${w.slug}`
  const others = WORK_LANDINGS.filter((o) => o.slug !== w.slug)

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: w.category,
      serviceType: w.category,
      url: `${url}${path}`,
      description: w.description,
      image: `${url}${w.hero.src}`,
      provider: { '@id': `${url}/#organization` },
      areaServed: [
        { '@type': 'AdministrativeArea', name: '경기도' },
        { '@type': 'AdministrativeArea', name: '충청남도' },
        { '@type': 'AdministrativeArea', name: '충청북도' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: w.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]

  return (
    <PageShell settings={settings}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* Hero — 검색한 작업을 첫 줄에, 그 작업의 실제 현장 사진을 옆(모바일은 아래)에 */}
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 pb-10 pt-5 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
          <div className="flex flex-col gap-6 lg:col-span-7 lg:justify-center">
            <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
              <span className="h-px w-8 bg-electric" aria-hidden />
              {w.kicker}
            </p>
            <h1 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              {w.headline[0]}
              <br />
              <span className="text-electric">{w.headline[1]}</span>
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-navy-foreground/80 lg:text-lg">{w.lead}</p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <TrackLink
                href={tel}
                channel="call_mobile"
                from={`${from}_hero`}
                className="group inline-flex h-14 items-center justify-between gap-6 bg-electric px-6 text-electric-foreground transition-colors hover:bg-background hover:text-navy"
              >
                <span className="flex items-center gap-2 text-base font-semibold">
                  <Smartphone className="size-5" />
                  바로 전화
                </span>
                <span className="font-mono text-lg font-bold tracking-tight">{settings.phoneMobile}</span>
              </TrackLink>
              <TrackLink
                href="#photo"
                channel="quote_open"
                from={`${from}_hero`}
                className="inline-flex h-14 items-center justify-between gap-6 border border-navy-foreground/30 px-6 transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Camera className="size-4" />
                  사진 보내고 견적 받기
                </span>
                <ArrowDown className="size-4" />
              </TrackLink>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-navy-foreground/70">
              {w.badges.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-electric" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative order-first aspect-[16/9] overflow-hidden bg-charcoal sm:aspect-[4/3] lg:order-none lg:col-span-5 lg:aspect-auto lg:min-h-[420px]">
            <Image src={w.hero.src} alt={w.hero.label} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            <span className="absolute bottom-0 left-0 bg-navy px-3 py-2 text-sm font-semibold">
              {w.hero.label} · 엔엠솔루션 현장
            </span>
          </div>
        </div>
      </section>

      {/* 실제 현장 사진 — 스크롤 한 번에 '이 회사가 이 일을 한다'가 보이게 폼보다 먼저 */}
      <section className="bg-background py-14 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:px-8">
          <SectionHeading kicker="Our Work" title="저희가 직접 한 현장입니다." />
          <ul className="grid grid-cols-2 gap-px bg-border lg:grid-cols-3">
            {w.photos.map((p) => (
              <li key={p.src} className="flex flex-col bg-background">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image src={p.src} alt={p.label} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
                </div>
                <p className="px-1 py-3 text-xs font-medium sm:text-sm">{p.label}</p>
              </li>
            ))}
          </ul>
          <p className="-mt-4 text-xs text-muted-foreground">엔엠솔루션 실제 작업 사진입니다.</p>
        </div>
      </section>

      {/* 사진 견적 폼 */}
      <section id="photo" className="scroll-mt-24 bg-secondary py-12 lg:scroll-mt-32 lg:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 lg:grid-cols-12 lg:gap-x-16 lg:gap-y-8 lg:px-8">
          <div className="lg:col-span-4">
            <SectionHeading
              kicker="Photo Quote"
              title="사진 보내고 견적 받기"
              description="현장 사진과 위치만 보내주세요. 확인하고 연락드려 출장 전에 작업 방법과 예상 금액부터 말씀드립니다."
            />
          </div>
          <div className="bg-background p-5 ring-1 ring-border sm:p-8 lg:col-span-8 lg:row-span-2 lg:p-10">
            <PhotoQuoteForm
              phoneMobile={settings.phoneMobile}
              from={from}
              category={w.category}
              options={w.jobs}
              optionsTitle="어떤 작업인가요?"
              photoHint={w.photoHint}
              photoLabel="현장 사진"
              locationPlaceholder="평택시 포승읍 ○○공단"
              messagePlaceholder={w.messagePlaceholder}
            />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4">
            <p className="text-sm font-semibold">카카오톡 · 문자로 보내셔도 됩니다</p>
            <KakaoChatButton
              kakaoUrl={settings.kakaoUrl}
              className="inline-flex h-12 w-full items-center justify-between border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-foreground"
            />
            <TrackLink
              href={`sms:${settings.phoneMobile}`}
              channel="call_sms"
              from={`${from}_form`}
              className="inline-flex h-12 w-full items-center justify-between border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-foreground"
            >
              <span className="flex items-center gap-2">
                <MessageSquareText className="size-4 text-electric" />
                문자로 사진 보내기
              </span>
              <span className="font-mono">{settings.phoneMobile}</span>
            </TrackLink>
          </div>
        </div>
      </section>

      {/* 작업 범위 */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:px-8">
          <SectionHeading kicker="What We Do" title="이런 작업을 합니다." />
          <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
            {w.scope.map((s) => (
              <li key={s.title} className="flex flex-col gap-3 bg-background p-6 lg:p-8">
                <p className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <Check className="size-5 text-electric" />
                  {s.title}
                </p>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground lg:text-base">{s.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 진행 순서 */}
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-16 lg:px-8 lg:py-24">
          <SectionHeading tone="dark" kicker="How It Works" title="사진 → 견적 → 현장 확인 → 시공" />
          <ol className="grid grid-cols-1 gap-px bg-navy-foreground/15 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-3 bg-navy p-6">
                <span className="font-mono text-xs text-electric">STEP {s.n}</span>
                <p className="text-xl font-bold tracking-tight">{s.title}</p>
                <p className="text-sm leading-relaxed text-navy-foreground/70">{s.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 지역 */}
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
          <p className="flex shrink-0 items-center gap-2 text-sm font-bold">
            <MapPin className="size-5 text-electric" strokeWidth={1.75} />
            방문 지역
          </p>
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">평택 고덕</span>에서 출발해 경기 남부 · 충청권 공장을 직접
            방문합니다. 위치를 알려주시면 가능한 일정을 바로 말씀드립니다.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="lg:col-span-4">
            <SectionHeading kicker="FAQ" title="자주 묻는 질문" />
          </div>
          <ul className="flex flex-col divide-y divide-border border-y border-border lg:col-span-8">
            {w.faq.map((f) => (
              <li key={f.q}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-semibold lg:text-lg [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-6 text-pretty text-sm leading-relaxed text-muted-foreground lg:text-base">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 다른 작업 — 한 공장에서 여러 일이 같이 나오므로 옆 작업으로 이어지게 */}
      <section className="border-t border-border bg-secondary py-12 lg:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:px-8">
          <p className="text-kicker text-muted-foreground">같이 맡길 수 있는 작업</p>
          <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/services/${o.slug}`}
                  className="flex h-full items-center justify-between gap-4 bg-background p-5 text-sm font-semibold transition-colors hover:text-electric"
                >
                  {o.category}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 마지막 권유 */}
      <section className="bg-navy py-16 text-navy-foreground lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <h2 className="text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em] sm:text-4xl lg:text-5xl">
            사진 몇 장이면
            <br />
            견적부터 드립니다.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <TrackLink
              href={tel}
              channel="call_mobile"
              from={`${from}_bottom`}
              className="inline-flex h-14 items-center justify-center gap-3 bg-electric px-7 text-electric-foreground transition-colors hover:bg-background hover:text-navy"
            >
              <Smartphone className="size-4" />
              <span className="font-mono text-lg font-bold">{settings.phoneMobile}</span>
            </TrackLink>
            <TrackLink
              href="#photo"
              channel="quote_open"
              from={`${from}_bottom`}
              className="inline-flex h-14 items-center justify-center gap-2 border border-navy-foreground/30 px-7 text-base font-semibold transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
            >
              <Camera className="size-5" />
              사진 보내고 견적 받기
            </TrackLink>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
