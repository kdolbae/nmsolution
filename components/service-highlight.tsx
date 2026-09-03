import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { SectionHeading } from './section-heading'

const HIGHLIGHTS = [
  {
    no: '01',
    en: 'INDUSTRIAL',
    title: '공장 개보수',
    copy: '가동을 멈추지 않고, 필요한 곳만 정확하게.',
    img: '/images/project-roof.png',
    href: '#industrial',
  },
  {
    no: '02',
    en: 'RECOVERY',
    title: '누수 피해복구',
    copy: '피해가 발생한 공간을 원래대로.',
    img: '/images/recovery-after.png',
    href: '#recovery',
  },
  {
    no: '03',
    en: 'INSULATION',
    title: '단열 · 곰팡이',
    copy: '지우는 것이 아니라, 다시 생기지 않게.',
    img: '/images/mold-after.png',
    href: '#insulation',
  },
]

export function ServiceHighlight() {
  return (
    <section className="bg-charcoal py-24 text-charcoal-foreground lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          tone="dark"
          kicker="Core Solutions"
          title="가장 많이 찾는 세 가지 해결책"
          description="엔엠솔루션의 핵심 사업 영역입니다. 산업 현장과 주거 공간, 문제의 원인부터 접근합니다."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => (
            <a
              key={h.no}
              href={h.href}
              className={`group relative flex flex-col justify-end overflow-hidden ${
                i === 0 ? 'min-h-[520px] lg:col-span-2 lg:row-span-2' : 'min-h-[360px]'
              } lg:min-h-[420px]`}
            >
              <Image
                src={h.img}
                alt={h.title}
                fill
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-charcoal/10"
                aria-hidden
              />
              <div className="relative flex flex-col gap-3 p-7 lg:p-9">
                <span className="font-mono text-xs text-charcoal-foreground/60">
                  {h.no} — {h.en}
                </span>
                <h3 className="text-3xl font-black tracking-tight lg:text-4xl">{h.title}</h3>
                <p className="text-base text-charcoal-foreground/75">{h.copy}</p>
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-electric">
                  자세히 보기
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
