import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { SectionHeading } from './section-heading'

const SERVICES = [
  { no: '01', en: 'INDUSTRIAL', ko: '공장 개보수', img: '/images/industrial.png', href: '#industrial' },
  { no: '02', en: 'RECOVERY', ko: '누수 피해복구', img: '/images/recovery-after.png', href: '#recovery' },
  { no: '03', en: 'INSULATION', ko: '단열 · 결로 · 곰팡이', img: '/images/insulation.png', href: '#insulation' },
  { no: '04', en: 'COATING', ko: '나노 · UV 코팅', img: '/images/coating.png', href: '#coating' },
  { no: '05', en: 'PRODUCTS', ko: '전문 코팅 제품', img: '/images/products.png', href: '#products' },
  { no: '06', en: 'ACADEMY', ko: '시공 교육', img: '/images/academy.png', href: '#academy' },
]

export function Services() {
  return (
    <section id="services" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            kicker="Services"
            title={
              <>
                ONE COMPANY.
                <br />
                MULTIPLE SOLUTIONS.
              </>
            }
          />
          <p className="max-w-sm text-pretty text-base leading-relaxed text-muted-foreground">
            공장은 개선하고, 피해 현장은 복구하고, 단열 문제는 해결하고, 표면은 보호하며, 전문 제품과 기술을 공급하고
            교육합니다.
          </p>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <li key={s.no} className="bg-background">
              <a href={s.href} className="group relative block overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={s.img}
                    alt={s.ko}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-navy/0 transition-colors duration-500 group-hover:bg-navy/40"
                    aria-hidden
                  />
                  <span className="absolute left-5 top-5 font-mono text-xs font-medium text-navy-foreground mix-blend-difference">
                    {s.no}
                  </span>
                  <span className="absolute right-5 top-5 flex size-9 translate-y-2 items-center justify-center bg-electric text-electric-foreground opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="flex items-end justify-between gap-4 px-5 py-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-kicker text-electric">{s.en}</span>
                    <span className="text-xl font-bold tracking-tight">{s.ko}</span>
                  </div>
                  <span className="h-px w-10 bg-border transition-[width,background-color] duration-300 group-hover:w-16 group-hover:bg-electric" aria-hidden />
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
