import Image from 'next/image'
import { ArrowRight, ArrowDown } from 'lucide-react'
import type { HomeContent } from '@/lib/content/defaults'

export function Hero({ content }: { content: HomeContent['hero'] }) {
  return (
    <section id="top" className="relative isolate min-h-[100svh] overflow-hidden bg-navy text-navy-foreground">
      <Image
        src="/images/hero-factory.png"
        alt="저녁 하늘 아래 정돈된 현대식 공장 외관"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/20" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/30 to-transparent" aria-hidden />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-28 pt-40 lg:px-8 lg:pb-24">
        <p className="text-kicker mb-6 flex items-center gap-3 text-navy-foreground/70">
          <span className="h-px w-8 bg-electric" aria-hidden />
          {content.kicker}
        </p>
        <h1 className="max-w-5xl text-balance text-5xl font-black leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl xl:text-[6.5rem]">
          {content.titleLine1}
          <br />
          <span className="text-electric">{content.titleHighlight1}</span> {content.titleMiddle}{' '}
          <span className="text-electric">{content.titleHighlight2}</span>
        </h1>
        <p className="mt-8 max-w-2xl text-pretty text-base leading-relaxed text-navy-foreground/80 sm:text-lg lg:text-xl">
          {content.description}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href="#quote"
            className="group inline-flex h-14 items-center justify-center gap-3 bg-electric px-7 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
          >
            {content.primaryCta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#scope"
            className="inline-flex h-14 items-center justify-center gap-3 border border-navy-foreground/30 px-7 text-base font-semibold text-navy-foreground transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
          >
            {content.secondaryCta}
            <ArrowDown className="size-4" />
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 border-t border-navy-foreground/15 pt-8 sm:grid-cols-3 lg:mt-20">
          {content.stats.map((s) => (
            <div key={s.value} className="flex flex-col gap-1">
              <span className="font-mono text-2xl font-semibold tracking-tight lg:text-3xl">{s.value}</span>
              <span className="text-sm text-navy-foreground/60">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 개보수 범위 티커 */}
      <div className="absolute inset-x-0 bottom-0 hidden border-t border-navy-foreground/15 bg-navy/60 backdrop-blur lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-0 divide-x divide-navy-foreground/15 px-8">
          {content.ticker.map((t, i) => (
            <a
              key={t}
              href="#scope"
              className="flex flex-1 items-center gap-3 py-4 pl-5 transition-colors first:pl-0 hover:text-electric"
            >
              <span className="font-mono text-[11px] text-electric">0{i + 1}</span>
              <span className="text-sm font-medium text-navy-foreground/80">{t}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
