'use client'

import { useState } from 'react'
import { ArrowUpRight, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionHeading } from './section-heading'
import { PROJECT_CATEGORIES } from '@/lib/content/defaults'
import type { Project } from '@/lib/db/schema'

const FILTERS = ['전체', ...PROJECT_CATEGORIES] as const
type Filter = (typeof FILTERS)[number]

export function Projects({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<Filter>('전체')
  const list = active === '전체' ? projects : projects.filter((p) => p.category === active)
  const usedFilters = FILTERS.filter((f) => f === '전체' || projects.some((p) => p.category === f))

  return (
    <section id="projects" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            kicker="Factory Projects"
            title="현장이 증명합니다."
            description="공장 개보수 시공사례입니다. 작업 범위와 소요 기간을 함께 확인하세요."
          />
          {usedFilters.length > 2 && (
            <div className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0" role="tablist" aria-label="시공사례 필터">
              <div className="flex w-max gap-1 border-b border-border">
                {usedFilters.map((f) => (
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
          )}
        </div>

        {list.length === 0 ? (
          <p className="mt-12 border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
            등록된 시공사례가 없습니다.
          </p>
        ) : (
          <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <li key={p.id} className="group">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {p.imageUrl ? (
                    // 외부 URL도 허용하기 위해 일반 img 사용
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <ImageOff className="size-6" />
                    </div>
                  )}
                  <span className="absolute left-4 top-4 bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground">
                    {p.category}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 pt-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold tracking-tight">{p.title}</h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      {[p.location, p.year].filter(Boolean).join(' · ')}
                      {p.duration && (
                        <>
                          {' · '}
                          <span className="text-electric">{p.duration}</span>
                        </>
                      )}
                    </p>
                    {p.description && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-electric" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
