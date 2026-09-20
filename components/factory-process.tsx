import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { MultilineText } from './multiline-text'
import type { HomeContent } from '@/lib/content/defaults'

export function FactoryProcess({ content }: { content: HomeContent['process'] }) {
  return (
    <section id="process" className="relative isolate overflow-hidden bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-5 py-24 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-32">
        <div className="flex flex-col gap-7 lg:col-span-5">
          <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
            <span className="h-px w-8 bg-electric" aria-hidden />
            {content.kicker}
          </p>
          <h2 className="text-balance text-4xl font-black leading-[1.08] tracking-[-0.03em] lg:text-5xl xl:text-6xl">
            <MultilineText text={content.title} />
          </h2>
          <p className="text-pretty text-base leading-relaxed text-navy-foreground/75 lg:text-lg">{content.description}</p>

          <div className="relative mt-2 aspect-[4/3] overflow-hidden bg-charcoal">
            <Image
              src="/images/factory-survey.png"
              alt="공장 지붕 구조를 점검하는 현장 담당자"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-navy/80 px-4 py-3 backdrop-blur">
              <span className="text-xs font-medium text-navy-foreground/80">현장 진단 중</span>
              <span className="font-mono text-[11px] text-electric">LIVE REPORT</span>
            </div>
          </div>

          <a
            href="#quote"
            className="group inline-flex h-12 w-fit items-center gap-3 bg-electric px-6 text-sm font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
          >
            지금 문의하기
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <ol className="flex flex-col divide-y divide-navy-foreground/15 border-y border-navy-foreground/15 lg:col-span-7">
          {content.steps.map((s) => (
            <li
              key={s.n}
              className="group grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-7 sm:grid-cols-[7rem_10rem_1fr] sm:items-baseline lg:py-8"
            >
              <span className="font-mono text-xs text-electric">{s.n}</span>
              <span className="font-mono text-xs text-navy-foreground/50 sm:justify-self-start">{s.time}</span>
              <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                <h3 className="text-2xl font-bold tracking-tight">{s.title}</h3>
                <p className="text-sm leading-relaxed text-navy-foreground/70 lg:text-base">{s.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
