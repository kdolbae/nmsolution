import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { SectionHeading } from './section-heading'
import type { ServiceItem } from '@/lib/content/defaults'

/** 메인 페이지의 반도체 공장 설비 섹션. 사업소개의 semiconductor 항목을 그대로 쓴다. */
export function SemiconductorFeature({ item }: { item: ServiceItem }) {
  const areas = item.areas ?? []

  return (
    <section id="semiconductor" className="bg-navy py-24 text-navy-foreground lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="flex flex-col gap-8 lg:col-span-5">
            <SectionHeading
              tone="dark"
              kicker={item.en}
              title={
                <>
                  반도체 공장 설비까지,
                  <br />
                  한 팀이 맡습니다.
                </>
              }
              description={item.summary}
            />
            <p className="text-pretty text-sm leading-relaxed text-navy-foreground/70 lg:text-base">{item.description}</p>
            <ul className="flex flex-wrap gap-2" aria-label="반도체 공장 설비 작업">
              {item.targets.map((t) => (
                <li key={t} className="border border-navy-foreground/20 px-3 py-1.5 text-sm text-navy-foreground/85">
                  {t}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/services/${item.slug}`}
                className="group inline-flex h-12 items-center justify-center gap-3 bg-electric px-6 text-sm font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
              >
                반도체 설비 자세히 보기
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#quote"
                className="group inline-flex h-12 items-center justify-center gap-3 border border-navy-foreground/30 px-6 text-sm font-semibold transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
              >
                현장 진단 요청
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden lg:col-span-7">
            <Image
              src={item.image}
              alt={`${item.name} 예시 이미지`}
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        {areas.length > 0 && (
          <ul className="mt-16 grid grid-cols-2 gap-px bg-navy-foreground/10 md:grid-cols-3 lg:mt-20 lg:grid-cols-6">
            {areas.map((a, i) => (
              <li key={a.title} className="group flex flex-col bg-navy">
                <div className="relative aspect-[4/3] overflow-hidden bg-navy-foreground/5">
                  {a.image && (
                    <Image
                      src={a.image}
                      alt={a.title}
                      fill
                      sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  )}
                  <span className="absolute left-3 top-3 bg-electric px-1.5 py-0.5 font-mono text-[11px] font-semibold text-electric-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4 lg:p-5">
                  <h3 className="text-base font-bold tracking-tight lg:text-lg">{a.title}</h3>
                  <p className="line-clamp-3 text-xs leading-relaxed text-navy-foreground/65 lg:text-[13px]">
                    {a.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs text-navy-foreground/45">이미지는 작업 범위를 설명하기 위한 3D 예시입니다.</p>
      </div>
    </section>
  )
}
