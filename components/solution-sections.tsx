import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { BeforeAfter } from './before-after'

function Keywords({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="주요 작업 항목">
      {items.map((k) => (
        <li
          key={k}
          className={
            dark
              ? 'border border-navy-foreground/20 px-3 py-1.5 text-sm text-navy-foreground/80'
              : 'border border-border px-3 py-1.5 text-sm text-foreground/80'
          }
        >
          {k}
        </li>
      ))}
    </ul>
  )
}

function Kicker({ children, dark }: { children: string; dark?: boolean }) {
  return (
    <p className={`text-kicker flex items-center gap-3 ${dark ? 'text-navy-foreground/60' : 'text-muted-foreground'}`}>
      <span className="h-px w-8 bg-electric" aria-hidden />
      {children}
    </p>
  )
}

function Cta({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <a
      href="#contact"
      className={`group inline-flex h-12 items-center gap-3 px-6 text-sm font-semibold transition-colors ${
        dark
          ? 'bg-electric text-electric-foreground hover:bg-background hover:text-navy'
          : 'bg-navy text-navy-foreground hover:bg-electric'
      }`}
    >
      {label}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </a>
  )
}

/* ---------------- INDUSTRIAL ---------------- */
export function IndustrialSection() {
  return (
    <section id="industrial" className="relative isolate overflow-hidden bg-navy text-navy-foreground">
      <div className="relative aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto">
        <Image
          src="/images/industrial.png"
          alt="철골 트러스와 단열 판넬로 구성된 대형 공장 내부"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/60 to-navy/10 hidden lg:block" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-navy to-transparent lg:hidden" aria-hidden />
      </div>
      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:min-h-[720px] lg:px-8 lg:py-32">
        <div className="flex max-w-xl flex-col gap-7">
          <Kicker dark>01 — Industrial Renovation</Kicker>
          <h2 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.025em] lg:text-6xl">
            공장의 가동은 유지하면서
            <br />
            필요한 곳만 정확하게 개선합니다.
          </h2>
          <p className="text-pretty text-base leading-relaxed text-navy-foreground/75 lg:text-lg">
            생산 라인의 중단은 곧 비용입니다. 공정 일정에 맞춘 구간별 시공으로 운영 영향을 최소화합니다.
          </p>
          <Keywords dark items={['공장 개보수', '유지보수', '단열', '외벽', '지붕', '판넬']} />
          <div className="pt-2">
            <Cta dark label="공장 개보수 상담" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- RECOVERY ---------------- */
export function RecoverySection() {
  return (
    <section id="recovery" className="bg-background py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div className="flex flex-col gap-7 lg:order-2">
          <Kicker>02 — Recovery</Kicker>
          <h2 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.025em] lg:text-6xl">
            문제가 발생한 곳을
            <br />
            원래의 공간으로 되돌립니다.
          </h2>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground lg:text-lg">
            누수로 손상된 천장과 벽체, 마감재까지. 원인 확인부터 복구 마감까지 한 번에 진행합니다.
          </p>
          <Keywords items={['누수 피해복구', '천장', '벽체', '도배', '마루', '곰팡이']} />
          <div className="pt-2">
            <Cta label="피해복구 상담" />
          </div>
        </div>
        <div className="lg:order-1">
          <BeforeAfter
            before="/images/recovery-before.png"
            after="/images/recovery-after.png"
            alt="아파트 누수 피해복구"
            initial={45}
          />
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            드래그하여 시공 전후 비교
          </p>
        </div>
      </div>
    </section>
  )
}

/* ---------------- INSULATION ---------------- */
export function InsulationSection() {
  return (
    <section id="insulation" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div className="flex flex-col gap-7">
          <Kicker>03 — Insulation</Kicker>
          <h2 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.025em] lg:text-6xl">
            곰팡이를 지우는 것보다
            <br />
            다시 생기지 않게 하는 것이 중요합니다.
          </h2>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground lg:text-lg">
            곰팡이는 결과입니다. 원인은 단열 결손과 결로입니다. 표면 처리가 아닌 원인 해결로 접근합니다.
          </p>

          <ol className="grid grid-cols-3 gap-px bg-border">
            {[
              ['단열', '열교 구간 보강'],
              ['결로', '온도차 차단'],
              ['곰팡이', '재발 방지 처리'],
            ].map(([t, d], i) => (
              <li key={t} className="flex flex-col gap-2 bg-secondary py-5 pr-4 first:pl-0 pl-4">
                <span className="font-mono text-xs text-electric">STEP {i + 1}</span>
                <span className="text-lg font-bold">{t}</span>
                <span className="text-sm text-muted-foreground">{d}</span>
              </li>
            ))}
          </ol>
          <div className="pt-2">
            <Cta label="단열 · 곰팡이 상담" />
          </div>
        </div>
        <div>
          <BeforeAfter
            before="/images/mold-before.png"
            after="/images/mold-after.png"
            alt="결로 곰팡이 원인 해결"
            initial={55}
          />
        </div>
      </div>
    </section>
  )
}

/* ---------------- COATING ---------------- */
export function CoatingSection() {
  const items = [
    { t: '나노코팅', d: '표면 오염 방지 · 관리 용이' },
    { t: 'UV코팅', d: '마루 · 가구 표면 보호' },
    { t: '항균코팅', d: '위생 공간 유지' },
  ]
  return (
    <section id="coating" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-7 lg:col-span-5">
            <Kicker>04 — Surface Protection</Kicker>
            <h2 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.025em] lg:text-6xl">
              공간을 깨끗하게 유지하고
              <br />
              표면을 보호합니다.
            </h2>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground lg:text-lg">
              시공 후에도 오래 깨끗하게. 눈에 보이지 않는 얇은 막이 오염과 마모로부터 표면을 지킵니다.
            </p>
            <ul className="divide-y divide-border border-y border-border">
              {items.map((it, i) => (
                <li key={it.t} className="flex items-baseline gap-5 py-4">
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  <span className="w-24 shrink-0 text-lg font-bold">{it.t}</span>
                  <span className="text-sm text-muted-foreground">{it.d}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Cta label="코팅 상담" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:col-span-7">
            <div className="relative aspect-[3/4] overflow-hidden bg-muted">
              <Image
                src="/images/coating.png"
                alt="나노코팅된 흰색 타일 표면 위의 물방울"
                fill
                sizes="(min-width: 1024px) 30vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="relative mt-12 aspect-[3/4] overflow-hidden bg-muted">
              <Image
                src="/images/project-uv.png"
                alt="UV코팅으로 광택이 살아난 마루"
                fill
                sizes="(min-width: 1024px) 30vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
