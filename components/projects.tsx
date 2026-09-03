'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionHeading } from './section-heading'

const FILTERS = ['전체', '지붕 · 판넬', '외벽', '바닥', '단열 · 내부'] as const
type Filter = (typeof FILTERS)[number]

const PROJECTS: {
  title: string
  cat: Exclude<Filter, '전체'>
  loc: string
  img: string
  year: string
  duration: string
}[] = [
  { title: '식품공장 지붕 판넬 전면 교체', cat: '지붕 · 판넬', loc: '경기 화성', img: '/images/project-roof.png', year: '2025', duration: '가동 중 · 12일' },
  { title: '물류창고 외벽 판넬 보강 · 도장', cat: '외벽', loc: '경기 평택', img: '/images/factory-wall.png', year: '2025', duration: '9일' },
  { title: '자동차 부품공장 에폭시 바닥 재시공', cat: '바닥', loc: '충남 아산', img: '/images/factory-floor.png', year: '2025', duration: '주말 · 3회' },
  { title: '제조공장 내부 단열 보강', cat: '단열 · 내부', loc: '충남 천안', img: '/images/industrial.png', year: '2024', duration: '가동 중 · 15일' },
  { title: '전자부품 공장 외관 리뉴얼', cat: '외벽', loc: '경기 안성', img: '/images/hero-factory.png', year: '2024', duration: '21일' },
  { title: '포장공장 지붕 누수 구간 보수', cat: '지붕 · 판넬', loc: '경기 용인', img: '/images/factory-survey.png', year: '2024', duration: '긴급 · 2일' },
]

export function Projects() {
  const [active, setActive] = useState<Filter>('전체')
  const list = active === '전체' ? PROJECTS : PROJECTS.filter((p) => p.cat === active)

  return (
    <section id="projects" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            kicker="Factory Projects"
            title="현장이 증명합니다."
            description="공장 개보수 시공사례입니다. 작업 범위와 소요 기간을 함께 확인하세요."
          />
          <div className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0" role="tablist" aria-label="시공사례 필터">
            <div className="flex w-max gap-1 border-b border-border">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={active === f}
                  onClick={() => setActive(f)}
                  className={cn(
                    '-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    active === f
                      ? 'border-electric text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <li key={p.title}>
              <a href="#projects" className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={p.img}
                    alt={p.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground">
                    {p.cat}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 pt-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold tracking-tight">{p.title}</h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      {p.loc} · {p.year} · <span className="text-electric">{p.duration}</span>
                    </p>
                  </div>
                  <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-electric" />
                </div>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex justify-center">
          <a
            href="#projects"
            className="inline-flex h-12 items-center gap-3 border border-foreground/20 px-6 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            시공사례 전체 보기
          </a>
        </div>
      </div>
    </section>
  )
}
