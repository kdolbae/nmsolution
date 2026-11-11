import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { MultilineText } from './multiline-text'
import type { ServiceItem } from '@/lib/content/defaults'

/**
 * 대형플랜트 설비 블록. 메인 개보수 범위 섹션에서 공장 개보수 카드와 반도체 설비 블록 사이에 들어간다.
 * 사업소개의 대형플랜트 설비(plant) 항목 값을 그대로 쓰며, areas는 '함께 개발 · 설계 · 실행' 단계로 보여 준다.
 */
export function PlantFeature({ item }: { item: ServiceItem }) {
  const steps = item.areas ?? []
  const hasImages = !!item.areasImage || steps.some((s) => s.image)

  return (
    <div className="mt-16 border border-border bg-secondary px-5 py-12 sm:px-8 lg:mt-20 lg:px-12 lg:py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <p className="text-kicker flex items-center gap-3 text-muted-foreground">
            <span className="h-px w-8 bg-electric" aria-hidden />
            {item.en}
          </p>
          <h3 className="text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em] sm:text-4xl">
            {item.name}
            <span className="mt-3 block text-xl font-bold leading-snug tracking-[-0.02em] text-foreground/80 sm:text-2xl">
              <MultilineText text={item.areasTitle || item.summary} />
            </span>
          </h3>
          {item.areasDescription && (
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground lg:text-base">
              {item.areasDescription}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#quote"
              className="group inline-flex h-12 items-center justify-center gap-3 bg-navy px-6 text-sm font-semibold text-navy-foreground transition-colors hover:bg-electric hover:text-electric-foreground"
            >
              플랜트 설비 상담
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              href={`/services/${item.slug}`}
              className="group inline-flex h-12 items-center justify-center gap-3 border border-foreground/20 px-6 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
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
              alt="대형 플랜트 설비 예시 이미지"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>

      {steps.length > 0 && (
        <ol className="mt-12 grid grid-cols-1 gap-px bg-border md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="group flex flex-col bg-background">
              {s.image && (
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
              )}
              <div className="flex gap-4 p-6">
                <span className="w-10 shrink-0 font-mono text-2xl font-bold leading-none text-electric lg:text-3xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-2">
                  <h4 className="text-lg font-bold tracking-tight">{s.title}</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {hasImages && <p className="mt-5 text-xs text-muted-foreground">이미지는 이해를 돕기 위한 예시입니다.</p>}
    </div>
  )
}
