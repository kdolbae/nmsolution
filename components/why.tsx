import { Zap, Ruler, ClipboardList, Layers } from 'lucide-react'
import { SectionHeading } from './section-heading'

const ITEMS = [
  { icon: Zap, en: 'FAST', ko: '빠른 대응', d: '문의 당일 확인, 현장 상황에 맞춘 신속한 일정 조율.' },
  { icon: Ruler, en: 'CLEAR', ko: '명확한 작업범위', d: '무엇을 어디까지 하는지 사전에 정확하게 정리합니다.' },
  { icon: ClipboardList, en: 'SYSTEM', ko: '체계적인 현장관리', d: '공정 순서와 안전, 마감 기준을 시스템으로 관리합니다.' },
  { icon: Layers, en: 'ONE STOP', ko: '통합 시공', d: '진단부터 복구, 마감, 코팅까지 하나의 팀이 책임집니다.' },
]

export function Why() {
  return (
    <section id="why" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          kicker="Why NM Solution"
          title="여러 업체를 부를 필요가 없습니다."
          description="공장부터 아파트까지, 원인 진단과 시공, 표면 보호를 한 팀이 끝까지 진행합니다."
        />
        <ul className="mt-14 grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it) => (
            <li key={it.en} className="flex flex-col gap-6 bg-background p-7 lg:p-8">
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
    </section>
  )
}
