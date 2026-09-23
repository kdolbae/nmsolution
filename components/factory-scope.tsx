import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { SectionHeading } from './section-heading'
import { MultilineText } from './multiline-text'
import { SemiconductorFeature } from './semiconductor-feature'
import type { HomeContent, ServiceItem } from '@/lib/content/defaults'

export function FactoryScope({ content, factory }: { content: HomeContent['scope']; factory?: ServiceItem }) {
  return (
    <section id="scope" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            kicker={content.kicker}
            title={<MultilineText text={content.title} />}
            description={content.description}
          />
          <a
            href="#quote"
            className="group inline-flex h-12 w-fit items-center gap-3 border border-foreground/20 px-6 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            현장 진단 요청
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((s) => (
            <li key={s.n} className="group flex flex-col bg-background">
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                {s.image ? (
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : null}
                <span className="absolute left-4 top-4 bg-navy px-2 py-1 font-mono text-[11px] font-semibold text-navy-foreground">
                  {s.n}
                </span>
              </div>
              <div className="flex flex-col gap-3 p-6">
                <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* 반도체 공장 설비: 공장 개보수의 세부 분야로 같은 섹션 안에 보여준다 */}
        {factory && <SemiconductorFeature item={factory} />}

        {content.extras.length > 0 && (
          <div className="mt-12 border-t border-border pt-10">
            <p className="text-kicker flex items-center gap-3 text-muted-foreground">
              <span className="h-px w-8 bg-electric" aria-hidden />
              All Work Items
            </p>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed lg:text-lg">
              부위별로 업체를 따로 찾지 않아도 됩니다. 공장 안에서 필요한 작업은 아래 항목까지 모두 직접
              진행합니다.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="전체 작업 항목">
              {content.extras.map((k) => (
                <li key={k} className="border border-border px-3 py-1.5 text-sm text-foreground/80">
                  {k}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
