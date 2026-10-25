import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowRight, Check, Phone, Smartphone } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { QuoteForm } from '@/components/quote-form'
import { TrackLink } from '@/components/track-link'
import { MultilineText } from '@/components/multiline-text'
import { getContent } from '@/lib/content/get'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const services = await getContent('services')
  const item = services.items.find((s) => s.slug === slug)
  if (!item) return { title: '사업소개' }
  // 제목 뒤 회사명은 layout의 title.template이 붙인다
  return { title: item.name, description: item.summary, alternates: { canonical: `/services/${slug}` } }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [services, settings] = await Promise.all([getContent('services'), getContent('settings')])
  const idx = services.items.findIndex((s) => s.slug === slug)
  if (idx === -1) notFound()
  const item = services.items[idx]
  const others = services.items.filter((s) => s.slug !== slug)
  // 광고 랜딩에서 어떤 버튼·폼으로 연락이 오는지 보려고 남긴다
  const from = `service_${slug}`
  // 공장 개보수 견적폼은 설비 이전·배관 항목을 미리 골라 둔다
  const initialCategories = slug === 'factory' ? ['설비 이전 · 수리', '배관 · 탱크 · 용접'] : []

  return (
    <PageShell settings={settings}>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy text-navy-foreground">
        <Image src={item.image} alt={item.name} fill priority sizes="100vw" className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/30" aria-hidden />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-5 py-20 lg:px-8 lg:py-28">
          <Link
            href="/services"
            className="inline-flex w-fit items-center gap-2 text-sm text-navy-foreground/70 transition-colors hover:text-navy-foreground"
          >
            <ArrowLeft className="size-4" />
            사업소개
          </Link>
          <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
            <span className="h-px w-8 bg-electric" aria-hidden />
            {item.en}
          </p>
          <h1 className="max-w-3xl text-balance text-4xl font-black leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            {item.name}
          </h1>
          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-navy-foreground/80">{item.summary}</p>
          {/* 광고로 들어온 사람이 첫 화면에서 바로 연락할 수 있게 */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <TrackLink
              href="#quote"
              channel="quote_scroll"
              from={from}
              className="group inline-flex h-14 items-center justify-between gap-6 bg-electric px-6 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy sm:w-auto"
            >
              견적 받기
              <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
            </TrackLink>
            <TrackLink
              href={`tel:${settings.phoneMain}`}
              channel="call_main"
              from={from}
              className="inline-flex h-14 items-center justify-between gap-6 border border-navy-foreground/40 px-6 transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Phone className="size-4 text-electric" />
                대표전화
              </span>
              <span className="font-mono text-lg font-bold">{settings.phoneMain}</span>
            </TrackLink>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="flex flex-col gap-10 lg:col-span-7">
            <div className="flex flex-col gap-4">
              <h2 className="text-kicker text-muted-foreground">Overview</h2>
              <p className="text-pretty text-base leading-relaxed text-foreground/85 lg:text-lg">{item.description}</p>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-kicker text-muted-foreground">What We Do</h2>
              <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
                {item.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 bg-background p-4 sm:last:odd:col-span-2"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-electric" />
                    <span className="text-sm font-medium">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {item.targets.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-kicker text-muted-foreground">For</h2>
                <ul className="flex flex-wrap gap-2">
                  {item.targets.map((t) => (
                    <li key={t} className="border border-border px-3 py-1.5 text-sm text-foreground/80">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4 lg:col-span-5">
            <div className="flex flex-col gap-5 bg-navy p-7 text-navy-foreground">
              <p className="text-kicker text-navy-foreground/60">Contact</p>
              <p className="text-2xl font-bold tracking-tight">현장 상황을 알려주세요.</p>
              <p className="text-sm leading-relaxed text-navy-foreground/75">
                사진 몇 장과 위치만 보내주시면 담당자가 당일 회신드립니다.
              </p>
              <TrackLink
                href={`tel:${settings.phoneMain}`}
                channel="call_main"
                from={from}
                className="flex items-center justify-between border border-electric bg-electric/10 px-5 py-4 transition-colors hover:bg-electric/20"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Phone className="size-4 text-electric" />
                  대표전화
                </span>
                <span className="font-mono text-xl font-bold">{settings.phoneMain}</span>
              </TrackLink>
              <TrackLink
                href={`tel:${settings.phoneMobile}`}
                channel="call_mobile"
                from={from}
                className="flex items-center justify-between border border-navy-foreground/25 px-5 py-4 transition-colors hover:bg-navy-foreground/10"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Smartphone className="size-4 text-electric" />
                  담당자 직통
                </span>
                <span className="font-mono text-xl font-bold">{settings.phoneMobile}</span>
              </TrackLink>
              <a
                href="#quote"
                className="group inline-flex h-12 items-center justify-between bg-electric px-5 text-sm font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
              >
                견적 문의
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </div>

            <div className="flex flex-col gap-3 border border-border p-6">
              <p className="text-kicker text-muted-foreground">Other Solutions</p>
              <ul className="flex flex-col divide-y divide-border">
                {others.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/services/${s.slug}`}
                      className="flex items-center justify-between py-3 text-sm font-medium transition-colors hover:text-electric"
                    >
                      {s.name}
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* 세부 분야 (areas가 있는 사업만) */}
      {item.areas && item.areas.length > 0 && (
        <section className="border-t border-border bg-secondary py-16 lg:py-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:px-8">
            <div className="flex max-w-3xl flex-col gap-3">
              <h2 className="text-kicker text-muted-foreground">Areas</h2>
              <p className="text-2xl font-bold tracking-tight lg:text-3xl">
                <MultilineText text={item.areasTitle || '세부 분야'} />
              </p>
              {item.areasDescription && (
                <p className="text-pretty text-base leading-relaxed text-muted-foreground">{item.areasDescription}</p>
              )}
            </div>
            <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
              {item.areas.map((a, i) => (
                <li key={a.title} className="flex flex-col bg-background">
                  {a.image && (
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <Image
                        src={a.image}
                        alt={a.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                      <span className="absolute left-4 top-4 bg-background/90 px-2 py-1 font-mono text-[11px] font-semibold">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2 p-6">
                    <h3 className="text-lg font-bold tracking-tight">{a.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{a.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">이미지는 작업 범위를 설명하기 위한 예시입니다.</p>
          </div>
        </section>
      )}

      {/* 견적폼: 홈으로 보내지 않고 이 페이지에서 바로 받는다 */}
      <section className="border-t border-border bg-navy py-16 text-navy-foreground lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div id="quote" className="scroll-mt-28 bg-background p-6 text-foreground sm:p-10 lg:p-14">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="flex flex-col gap-5 lg:col-span-4">
                <p className="text-kicker flex items-center gap-3 text-muted-foreground">
                  <span className="h-px w-8 bg-electric" aria-hidden />
                  Request a Quote
                </p>
                <h2 className="text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em]">
                  {item.name} 견적,
                  <br />
                  남겨만 주세요.
                </h2>
                <p className="text-pretty text-base leading-relaxed text-muted-foreground">
                  성함과 연락처, 어떤 설비·배관인지 한 줄이면 됩니다. 당일 연락드려 현장 진단 일정을 잡습니다.
                </p>
              </div>
              <div className="lg:col-span-8">
                <QuoteForm phoneMobile={settings.phoneMobile} initialCategories={initialCategories} from={from} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
