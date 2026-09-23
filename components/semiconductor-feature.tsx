import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { MultilineText } from './multiline-text'
import type { ServiceItem } from '@/lib/content/defaults'

/**
 * 공장 개보수의 세부 분야(반도체 공장 설비) 블록.
 * 메인 페이지 개보수 범위 섹션 안에 들어가며, 사업소개의 공장 개보수(factory) 항목 값을 그대로 쓴다.
 */
export function SemiconductorFeature({ item }: { item: ServiceItem }) {
  const areas = item.areas ?? []
  if (areas.length === 0) return null

  return (
    <div className="mt-16 bg-navy px-5 py-12 text-navy-foreground sm:px-8 lg:mt-20 lg:px-12 lg:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
            <span className="h-px w-8 bg-electric" aria-hidden />
            Semiconductor Fab
          </p>
          {item.areasTitle && (
            <h3 className="text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em] sm:text-4xl">
              <MultilineText text={item.areasTitle} />
            </h3>
          )}
          {item.areasDescription && (
            <p className="text-pretty text-sm leading-relaxed text-navy-foreground/75 lg:text-base">
              {item.areasDescription}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#quote"
              className="group inline-flex h-12 items-center justify-center gap-3 bg-electric px-6 text-sm font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
            >
              반도체 설비 상담
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              href={`/services/${item.slug}`}
              className="group inline-flex h-12 items-center justify-center gap-3 border border-navy-foreground/30 px-6 text-sm font-semibold transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
            >
              자세히 보기
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {item.areasImage && (
          <div className="relative aspect-[4/3] overflow-hidden lg:col-span-7">
            <Image
              src={item.areasImage}
              alt="반도체 공장 크린룸 예시 이미지"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>

      <ul className="mt-12 grid grid-cols-2 gap-px bg-navy-foreground/10 md:grid-cols-3 lg:grid-cols-6">
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
            <div className="flex flex-col gap-2 p-4">
              <h4 className="text-base font-bold tracking-tight">{a.title}</h4>
              <p className="line-clamp-3 text-xs leading-relaxed text-navy-foreground/65 lg:text-[13px]">{a.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs text-navy-foreground/45">이미지는 작업 범위를 설명하기 위한 3D 예시입니다.</p>
    </div>
  )
}
