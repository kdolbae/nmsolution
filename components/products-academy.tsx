import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'

const CARDS = [
  {
    id: 'products',
    en: 'PRODUCTS',
    ko: '전문 코팅 제품',
    d: '현장에서 검증한 나노 · UV · 항균 코팅제를 시공 업체와 개인에게 공급합니다.',
    img: '/images/products.png',
    alt: '무광 화이트와 네이비 컬러의 산업용 코팅제 용기',
  },
  {
    id: 'academy',
    en: 'ACADEMY',
    ko: '줄눈 · 나노코팅 · UV코팅 교육',
    d: '실제 현장 기준의 시공 교육. 기술뿐 아니라 견적과 고객 응대까지 다룹니다.',
    img: '/images/academy.png',
    alt: '타일 샘플 보드에 줄눈 시공을 실습하는 손',
  },
]

export function ProductsAcademy() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <p className="text-kicker mb-10 flex items-center gap-3 text-muted-foreground">
          <span className="h-px w-8 bg-electric" aria-hidden />
          Products &amp; Academy
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {CARDS.map((c) => (
            <a key={c.id} id={c.id} href={`#${c.id}`} className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden bg-charcoal text-charcoal-foreground lg:min-h-[520px]">
              <Image
                src={c.img}
                alt={c.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/50 to-transparent" aria-hidden />
              <div className="relative flex flex-col gap-3 p-7 lg:p-10">
                <span className="text-kicker text-electric">{c.en}</span>
                <h3 className="text-3xl font-black tracking-tight lg:text-4xl">{c.ko}</h3>
                <p className="max-w-md text-pretty text-sm leading-relaxed text-charcoal-foreground/75 lg:text-base">{c.d}</p>
                <span className="mt-3 inline-flex size-11 items-center justify-center border border-charcoal-foreground/30 transition-colors group-hover:border-electric group-hover:bg-electric group-hover:text-electric-foreground">
                  <ArrowUpRight className="size-5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
