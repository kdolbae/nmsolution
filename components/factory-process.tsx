import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const STEPS = [
  {
    n: 'STEP 1',
    time: '당일',
    t: '문의 · 회신',
    d: '전화, 카카오톡, 견적 폼 어디로든. 접수 당일 담당자가 직접 회신합니다.',
  },
  {
    n: 'STEP 2',
    time: '1 – 2일',
    t: '현장 진단',
    d: '도면과 사진만으로 판단하지 않습니다. 현장을 보고 원인과 범위를 함께 확인합니다.',
  },
  {
    n: 'STEP 3',
    time: '진단 후 48H',
    t: '견적 · 일정 확정',
    d: '작업 범위, 자재, 기간, 비용을 항목별로 정리해 드립니다. 애매한 표현은 남기지 않습니다.',
  },
  {
    n: 'STEP 4',
    time: '공정 맞춤',
    t: '구간별 시공',
    d: '생산 일정에 맞춰 구간을 나눠 진행합니다. 가동 중 시공, 주말·야간 시공도 협의 가능합니다.',
  },
  {
    n: 'STEP 5',
    time: '완료 후',
    t: '점검 · 사후관리',
    d: '완료 후 함께 점검하고, 시공 부위별 관리 포인트를 정리해 전달합니다.',
  },
]

export function FactoryProcess() {
  return (
    <section id="process" className="relative isolate overflow-hidden bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-5 py-24 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-32">
        <div className="flex flex-col gap-7 lg:col-span-5">
          <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
            <span className="h-px w-8 bg-electric" aria-hidden />
            How We Work
          </p>
          <h2 className="text-balance text-4xl font-black leading-[1.08] tracking-[-0.03em] lg:text-5xl xl:text-6xl">
            빨라야 할 때는 빠르게,
            <br />
            정확해야 할 때는
            <br />
            한 번 더 확인합니다.
          </h2>
          <p className="text-pretty text-base leading-relaxed text-navy-foreground/75 lg:text-lg">
            공장의 시간은 곧 비용입니다. 불필요한 대기 없이 움직이되, 진단과 견적은 대충 넘기지 않습니다.
            고객이 어디까지 진행됐는지 항상 알 수 있게 소통합니다.
          </p>

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
            href="#contact"
            className="group inline-flex h-12 w-fit items-center gap-3 bg-electric px-6 text-sm font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
          >
            지금 문의하기
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <ol className="flex flex-col divide-y divide-navy-foreground/15 border-y border-navy-foreground/15 lg:col-span-7">
          {STEPS.map((s) => (
            <li key={s.n} className="group grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-7 sm:grid-cols-[7rem_10rem_1fr] sm:items-baseline lg:py-8">
              <span className="font-mono text-xs text-electric">{s.n}</span>
              <span className="font-mono text-xs text-navy-foreground/50 sm:justify-self-start">{s.time}</span>
              <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                <h3 className="text-2xl font-bold tracking-tight">{s.t}</h3>
                <p className="text-sm leading-relaxed text-navy-foreground/70 lg:text-base">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
