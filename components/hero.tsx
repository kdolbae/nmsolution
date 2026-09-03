import Image from 'next/image'
import { ArrowRight, ArrowDown } from 'lucide-react'

const TICKER = ['공장 개보수', '누수 피해복구', '단열 · 결로 · 곰팡이', '나노 · UV 코팅', '코팅제 판매', '시공 교육']

export function Hero() {
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
      <div
        className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/20"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/30 to-transparent" aria-hidden />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-28 pt-32 lg:px-8 lg:pb-24">
        <p className="text-kicker mb-6 flex items-center gap-3 text-navy-foreground/70">
          <span className="h-px w-8 bg-electric" aria-hidden />
          Building &amp; Space Solution
        </p>
        <h1 className="max-w-4xl text-balance text-5xl font-black leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-8xl">
          공간의 문제를
          <br />
          해결합니다.
        </h1>
        <p className="mt-8 max-w-2xl text-pretty text-base leading-relaxed text-navy-foreground/80 sm:text-lg lg:text-xl">
          공장 개보수부터 누수 피해복구, 단열·곰팡이, 나노·UV 코팅까지{' '}
          <br className="hidden sm:block" />
          엔엠솔루션이 현장에 필요한 해결책을 제공합니다.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href="#contact"
            className="group inline-flex h-14 items-center justify-center gap-3 bg-electric px-7 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
          >
            견적 상담
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#services"
            className="inline-flex h-14 items-center justify-center gap-3 border border-navy-foreground/30 px-7 text-base font-semibold text-navy-foreground transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
          >
            사업분야 보기
            <ArrowDown className="size-4" />
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 border-t border-navy-foreground/15 pt-8 sm:grid-cols-3 lg:mt-20">
          <Stat value="ONE" label="하나의 회사, 통합 시공" />
          <Stat value="06" label="사업 영역" />
          <Stat value="B2B · B2C" label="공장부터 아파트까지" />
        </div>
      </div>

      {/* Ticker */}
      <div className="absolute inset-x-0 bottom-0 hidden border-t border-navy-foreground/15 bg-navy/60 backdrop-blur lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-0 divide-x divide-navy-foreground/15 px-8">
          {TICKER.map((t, i) => (
            <div key={t} className="flex flex-1 items-center gap-3 py-4 pl-5 first:pl-0">
              <span className="font-mono text-[11px] text-electric">0{i + 1}</span>
              <span className="text-sm font-medium text-navy-foreground/80">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-2xl font-semibold tracking-tight lg:text-3xl">{value}</span>
      <span className="text-sm text-navy-foreground/60">{label}</span>
    </div>
  )
}
