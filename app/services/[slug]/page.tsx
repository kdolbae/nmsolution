import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Phone, Smartphone } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { getContent } from '@/lib/content/get'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const services = await getContent('services')
  const item = services.items.find((s) => s.slug === slug)
  if (!item) return { title: '사업소개 | 엔엠솔루션' }
  return { title: `${item.name} | 엔엠솔루션 NM SOLUTION`, description: item.summary }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [services, settings] = await Promise.all([getContent('services'), getContent('settings')])
  const idx = services.items.findIndex((s) => s.slug === slug)
  if (idx === -1) notFound()
  const item = services.items[idx]
  const others = services.items.filter((s) => s.slug !== slug)

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
              <a
                href={`tel:${settings.phoneMobile}`}
                className="flex items-center justify-between border border-electric bg-electric/10 px-5 py-4 transition-colors hover:bg-electric/20"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Smartphone className="size-4 text-electric" />
                  담당자 직통
                </span>
                <span className="font-mono text-xl font-bold">{settings.phoneMobile}</span>
              </a>
              <a
                href={`tel:${settings.phoneMain}`}
                className="flex items-center justify-between border border-navy-foreground/25 px-5 py-4 transition-colors hover:bg-navy-foreground/10"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-electric" />
                  대표전화
                </span>
                <span className="font-mono text-xl font-bold">{settings.phoneMain}</span>
              </a>
              <Link
                href="/#quote"
                className="group inline-flex h-12 items-center justify-between bg-electric px-5 text-sm font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
              >
                견적 문의
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
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
    </PageShell>
  )
}
