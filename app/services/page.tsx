import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { PageHero, PageShell } from '@/components/page-shell'
import { MultilineText } from '@/components/multiline-text'
import { getContent } from '@/lib/content/get'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '사업소개',
  description: '공장 개보수를 중심으로 누수 피해복구, 단열·곰팡이, 나노·UV 코팅, 코팅제 판매, 시공 교육까지.',
  alternates: { canonical: '/services' },
}

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([getContent('services'), getContent('settings')])
  const [primary, ...others] = services.items

  return (
    <PageShell settings={settings}>
      <PageHero
        kicker={services.kicker}
        title={<MultilineText text={services.title} />}
        description={services.description}
      />

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          {/* Primary: 공장 개보수 */}
          {primary && (
            <Link
              href={`/services/${primary.slug}`}
              className="group grid grid-cols-1 overflow-hidden bg-navy text-navy-foreground lg:grid-cols-12"
            >
              <div className="relative aspect-[16/9] lg:col-span-7 lg:aspect-auto lg:min-h-[420px]">
                <Image
                  src={primary.image}
                  alt={primary.name}
                  fill
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-between gap-8 p-8 lg:col-span-5 lg:p-12">
                <div className="flex flex-col gap-4">
                  <span className="text-kicker text-electric">Core Business · {primary.en}</span>
                  <h2 className="text-3xl font-black tracking-tight lg:text-4xl">{primary.name}</h2>
                  <p className="text-pretty text-base leading-relaxed text-navy-foreground/75">{primary.summary}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  자세히 보기
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </Link>
          )}

          {/* Others */}
          <p className="text-kicker mb-6 mt-16 text-muted-foreground">Other Solutions</p>
          <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {others.map((s, i) => (
              <li key={s.slug} className="bg-background">
                <Link href={`/services/${s.slug}`} className="group flex h-full flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <Image
                      src={s.image}
                      alt={s.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <span className="absolute left-4 top-4 bg-background/90 px-2 py-1 font-mono text-[11px] font-semibold">
                      0{i + 2}
                    </span>
                  </div>
                  <div className={cn('flex flex-1 flex-col gap-3 p-6')}>
                    <span className="text-kicker text-electric">{s.en}</span>
                    <h3 className="text-xl font-bold tracking-tight">{s.name}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold">
                      자세히 보기
                      <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-electric" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  )
}
