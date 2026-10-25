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

          {/* 다른 사업부: 2026-10-25 사업주 요청으로 사진 카드 대신 한 줄 목록으로만 남긴다 (메뉴·푸터에서는 뺐다) */}
          <p className="text-kicker mb-4 mt-16 text-muted-foreground">Other Divisions</p>
          <p className="mb-5 text-sm text-muted-foreground">(주)엔엠솔루션이 함께 운영하는 사업부입니다.</p>
          <ul className="flex flex-wrap gap-2">
            {others.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className={cn(
                    'group inline-flex items-center gap-1.5 border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-electric hover:text-electric',
                  )}
                >
                  {s.name}
                  <ArrowUpRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-electric" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  )
}
