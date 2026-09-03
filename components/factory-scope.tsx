import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { SectionHeading } from './section-heading'

const SCOPE = [
  {
    n: '01',
    t: '지붕 · 판넬',
    d: '노후 판넬 교체, 누수 지붕 보수, 채광창·환기구 정비. 생산 라인 위에서 가장 먼저 문제가 생기는 곳입니다.',
    img: '/images/project-roof.png',
    alt: '새 판넬로 교체된 공장 지붕',
  },
  {
    n: '02',
    t: '외벽',
    d: '샌드위치 판넬 교체 및 보강, 외벽 도장, 실링 보수로 단열과 외관을 동시에 회복합니다.',
    img: '/images/factory-wall.png',
    alt: '신규 판넬 시공된 공장 외벽',
  },
  {
    n: '03',
    t: '바닥',
    d: '에폭시·우레탄 바닥 시공, 균열 보수, 라인 마킹. 지게차 동선과 공정 하중을 고려해 설계합니다.',
    img: '/images/factory-floor.png',
    alt: '에폭시 시공된 공장 바닥',
  },
  {
    n: '04',
    t: '단열 · 내부',
    d: '내부 단열 보강, 천장·벽체 마감, 사무공간 개보수. 작업 환경과 에너지 비용을 함께 개선합니다.',
    img: '/images/industrial.png',
    alt: '단열 보강된 공장 내부',
  },
]

export function FactoryScope() {
  return (
    <section id="scope" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            kicker="Scope of Work"
            title={
              <>
                공장에서 생기는 문제,
                <br />
                범위와 상관없이 해결합니다.
              </>
            }
            description="지붕 한 구간의 누수부터 공장 전체 리뉴얼까지. 현장을 보고 필요한 만큼만 정확하게 제안합니다."
          />
          <a
            href="#contact"
            className="group inline-flex h-12 w-fit items-center gap-3 border border-foreground/20 px-6 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            현장 진단 요청
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {SCOPE.map((s) => (
            <li key={s.n} className="group flex flex-col bg-background">
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 bg-navy px-2 py-1 font-mono text-[11px] font-semibold text-navy-foreground">
                  {s.n}
                </span>
              </div>
              <div className="flex flex-col gap-3 p-6">
                <h3 className="text-xl font-bold tracking-tight">{s.t}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ul>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="추가 작업 항목">
          {['도장', '설비 · 배관', '전기 · 조명', '방수', '캐노피 · 증축', '사무실 인테리어'].map((k) => (
            <li key={k} className="border border-border px-3 py-1.5 text-sm text-foreground/80">
              {k}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
