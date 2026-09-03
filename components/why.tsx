import { Zap, BadgeCheck, Sparkles, Ear } from 'lucide-react'
import { SectionHeading } from './section-heading'

const ITEMS = [
  {
    icon: Zap,
    en: 'FAST',
    ko: '신속하게',
    d: '문의 당일 회신, 빠른 현장 방문. 공장이 기다리는 시간을 최소화합니다.',
  },
  {
    icon: BadgeCheck,
    en: 'PROFESSIONAL',
    ko: '전문적으로',
    d: '지붕·외벽·바닥·단열 각 공정의 기준을 알고, 원인부터 확인하고 시공합니다.',
  },
  {
    icon: Sparkles,
    en: 'FRESH',
    ko: '젊은 감각으로',
    d: '사진·영상 기반 진행 공유, 명확한 견적서, 깔끔한 마감. 일하는 방식이 다릅니다.',
  },
  {
    icon: Ear,
    en: 'CUSTOMER FIRST',
    ko: '고객 니즈에 충실하게',
    d: '우리가 하고 싶은 시공이 아니라, 현장에 필요한 시공을 제안합니다.',
  },
]

export function Why() {
  return (
    <section id="why" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              kicker="Why NM Solution"
              title={
                <>
                  공장 개보수 업체,
                  <br />
                  이렇게 일할 수도 있습니다.
                </>
              }
              description="엔엠솔루션은 평택 고덕을 기반으로 경기·충청권 공장을 직접 방문합니다. 오래된 관행 대신, 고객이 이해하고 납득하는 방식으로 진행합니다."
            />
          </div>
          <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:col-span-7">
            {ITEMS.map((it) => (
              <li key={it.en} className="flex flex-col gap-6 bg-secondary p-7 lg:p-8">
                <span className="flex size-11 items-center justify-center bg-navy text-navy-foreground">
                  <it.icon className="size-5" strokeWidth={1.75} />
                </span>
                <div className="flex flex-col gap-2">
                  <span className="text-kicker text-electric">{it.en}</span>
                  <h3 className="text-xl font-bold tracking-tight">{it.ko}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{it.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
