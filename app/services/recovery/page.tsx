import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  Factory,
  FileText,
  House,
  Phone,
  ScanSearch,
  Smartphone,
  TriangleAlert,
} from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { SectionHeading } from '@/components/section-heading'
import { QuoteForm } from '@/components/quote-form'
import { KakaoChatButton } from '@/components/contact-widgets'
import { TrackLink } from '@/components/track-link'
import { getContent } from '@/lib/content/get'
import { jsonLdScript, siteUrl } from '@/lib/site'

/**
 * 누수 피해복구 — 광고 유입용 랜딩.
 *
 * `/services/[slug]` 공통 상세 페이지보다 이 파일이 우선한다. 광고 문구와 첫 화면이
 * 맞아야 하므로 문구는 관리자 편집 대상이 아니라 여기서 관리한다. 전화번호·카카오 주소는
 * 설정값을 그대로 쓴다.
 *
 * 경력 연수·시공 건수처럼 확인되지 않은 숫자는 넣지 않는다.
 */

export const dynamic = 'force-dynamic'

const PATH = '/services/recovery'
const TITLE = '주택·공장 누수 피해복구 · 원인 차단부터 원상복구까지'
// 네이버 권고 80자 이내
const DESCRIPTION = '주택·공장 누수, 원인부터 막고 천장·벽·바닥 복구와 보험 청구 자료 정리까지. 평택·경기 당일 회신.'
const OG_IMAGE = '/images/leak/og.jpg'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    '누수',
    '누수 복구',
    '누수 피해복구',
    '누수 원인',
    '천장 누수',
    '아랫집 누수',
    '윗집 누수',
    '공장 누수',
    '공장 지붕 누수',
    '판넬 지붕 누수',
    '누수 보험',
    '일상생활배상책임보험 누수',
    '평택 누수',
    '고덕 누수',
    '경기 누수 복구',
  ],
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '엔엠솔루션 NM SOLUTION',
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: '주택·공장 누수 원인부터 막고 원상복구까지, 엔엠솔루션' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
}

const FROM = 'leak_landing'

const SYMPTOMS: { icon: typeof House; label: string; items: string[] }[] = [
  {
    icon: House,
    label: '주택 · 상가',
    items: [
      '천장에 누런 얼룩이 번지거나 물방울이 맺힌다',
      '벽지가 들뜨고 곰팡이 냄새가 난다',
      '마루·장판이 들뜨고 걸레받이가 젖어 있다',
      '아랫집에서 물이 샌다고 연락이 왔다',
      '쓴 만큼보다 수도요금이 많이 나온다',
    ],
  },
  {
    icon: Factory,
    label: '공장 · 창고',
    items: [
      '비 오는 날 지붕 판넬 이음부에서 물이 떨어진다',
      '볼트·겹침부 주변에 녹물 자국이 있다',
      '외벽 판넬 아래쪽 바닥이 늘 젖어 있다',
      '설비·자재 위로 물이 떨어질까 봐 비닐을 덮어 둔다',
      '배관 주변 바닥이 꺼지거나 물이 고인다',
    ],
  },
]

const CASES = [
  {
    icon: House,
    en: 'Home & Shop',
    title: '주택 누수',
    hero: { src: '/images/leak/house-damage.webp', alt: '누수로 천장과 벽지가 얼룩지고 벗겨진 방' },
    image: '/images/leak/house-window-damage.webp',
    alt: '창호 주변으로 물이 스며 벽이 얼룩지고 곰팡이가 핀 방',
    causes: ['급수 · 난방 배관', '욕실 · 베란다 방수층', '외벽 · 창호 틈', '옥상 방수'],
    restore: ['천장 석고보드 교체', '도배 · 도장', '마루 · 장판 · 걸레받이', '곰팡이 제거 · 방습 마감'],
  },
  {
    icon: Factory,
    en: 'Factory & Warehouse',
    title: '공장 누수',
    hero: { src: '/images/leak/factory-roof.webp', alt: '판넬 지붕으로 덮인 대형 공장 건물을 위에서 본 모습' },
    image: '/images/leak/work-panel-hall.webp',
    alt: '판넬 벽체와 지붕으로 마감한 공장 통로',
    causes: ['지붕 판넬 볼트 · 겹침부', '홈통 · 선홈통 막힘', '채광창 · 벤트 주변', '외벽 판넬 실링 · 매설 배관'],
    restore: ['지붕 판넬 부분 교체 · 실링', '홈통 교체 · 배수 정비', '내부 단열재 · 천장재 교체', '바닥 도장 · 설비 주변 정리'],
  },
]

const STEPS = [
  {
    n: 'STEP 1',
    time: '당일',
    title: '접수 · 사진 확인',
    description: '전화나 문자로 사진 몇 장 보내주세요. 지금 물이 새고 있다면 물 잠그는 방법부터 안내합니다.',
  },
  {
    n: 'STEP 2',
    time: '현장 방문',
    title: '원인 위치 확인',
    description: '얼룩이 생긴 자리와 물이 들어오는 자리는 다른 경우가 많습니다. 배관, 방수층, 지붕·외벽 순서로 원인을 좁혀 갑니다.',
  },
  {
    n: 'STEP 3',
    time: '원인 차단',
    title: '물길부터 막기',
    description: '배관 교체·보수, 방수, 판넬·실링 보수로 원인을 먼저 막습니다. 원인을 막기 전에 마감부터 하지 않습니다.',
  },
  {
    n: 'STEP 4',
    time: '건조 · 마감',
    title: '원상복구',
    description: '젖은 석고보드와 단열재는 걷어내고 충분히 말린 뒤 천장·벽·바닥을 다시 마감합니다.',
  },
  {
    n: 'STEP 5',
    time: '완료 후',
    title: '자료 정리 · 점검',
    description: '공사 전·중·후 사진과 항목별 공사 내역서를 정리해 드립니다. 보험 청구나 세대 간 협의에 그대로 쓰실 수 있습니다.',
  },
]

const INSURANCE = [
  { icon: Camera, title: '피해 사진', description: '공사 전 · 중 · 후를 같은 위치에서 찍어 정리합니다.' },
  { icon: ScanSearch, title: '원인 소견', description: '어디서, 왜 샜는지 현장에서 확인한 내용을 적어 드립니다.' },
  { icon: FileText, title: '공사 내역서', description: '자재와 작업을 항목별로 나눈 견적서 · 내역서를 드립니다.' },
]

const WORK_PHOTOS = [
  { src: '/images/leak/work-buried-pipe.webp', label: '매설 배관 굴착 · 교체' },
  { src: '/images/leak/work-pipe-line.webp', label: '공장 배관 라인 정비' },
  { src: '/images/leak/work-roof-frame.webp', label: '지붕 골조 · 캐노피 시공' },
]

const FAQ = [
  {
    q: '지금 물이 새고 있어요. 먼저 뭘 해야 하나요?',
    a: '수도 계량기 옆 메인 밸브를 잠그고, 물이 닿는 곳의 콘센트·조명은 차단기를 내려 주세요. 물 떨어지는 곳에는 통을 받쳐 두고 사진을 찍어 두시면 됩니다. 그다음 전화 주시면 상황에 맞게 안내드립니다.',
  },
  {
    q: '윗집 · 아랫집 누수는 누가 비용을 내나요?',
    a: '보통 누수 원인이 있는 쪽이 부담합니다. 그래서 원인 위치를 먼저 정확히 확인하는 것이 중요합니다. 확인한 내용은 사진과 소견으로 정리해 드리니 세대 간 협의에 쓰실 수 있습니다.',
  },
  {
    q: '보험 처리도 도와주시나요?',
    a: '보험 청구에 필요한 피해 사진, 원인 소견, 항목별 공사 내역서를 정리해 드립니다. 청구는 가입자 본인이 하시며, 보상 여부와 범위는 가입한 상품과 보험사 판단에 따릅니다.',
  },
  {
    q: '공장 가동 중에도 공사할 수 있나요?',
    a: '생산 일정에 맞춰 구간을 나눠 진행합니다. 가동 중 시공, 주말 · 야간 시공도 협의할 수 있습니다.',
  },
  {
    q: '비용은 얼마나 드나요?',
    a: '원인과 피해 범위에 따라 크게 달라서 현장 확인 후 항목별로 견적을 드립니다. 사진을 먼저 보내주시면 대략적인 범위는 미리 말씀드릴 수 있습니다.',
  },
  {
    q: '어느 지역까지 오시나요?',
    a: '평택 고덕을 기반으로 경기 · 충청권 현장에 방문합니다. 위치를 알려주시면 방문 가능 일정을 바로 안내드립니다.',
  },
]

export default async function LeakRecoveryPage() {
  const settings = await getContent('settings')
  const url = siteUrl()
  const tel = `tel:${settings.phoneMobile}`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: '주택 · 공장 누수 피해복구',
      serviceType: '누수 피해복구',
      url: `${url}${PATH}`,
      description: DESCRIPTION,
      image: `${url}${OG_IMAGE}`,
      provider: { '@id': `${url}/#organization` },
      areaServed: [
        { '@type': 'AdministrativeArea', name: '경기도' },
        { '@type': 'AdministrativeArea', name: '충청남도' },
        { '@type': 'AdministrativeArea', name: '충청북도' },
        { '@type': 'City', name: '평택시' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: url },
        { '@type': 'ListItem', position: 2, name: '사업소개', item: `${url}/services` },
        { '@type': 'ListItem', position: 3, name: '누수 피해복구', item: `${url}${PATH}` },
      ],
    },
  ]

  return (
    <PageShell settings={settings}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* Hero — 광고 소재와 같은 문구 · 같은 사진으로 맞춘다 */}
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-14 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-7 lg:col-span-7 lg:justify-center">
            <Link
              href="/services"
              className="inline-flex w-fit items-center gap-2 text-sm text-navy-foreground/70 transition-colors hover:text-navy-foreground"
            >
              <ArrowLeft className="size-4" />
              사업소개
            </Link>
            <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
              <span className="h-px w-8 bg-electric" aria-hidden />
              Leak Damage Recovery
            </p>
            <h1 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              주택 · 공장 누수,
              <br />
              원인부터 막고 <span className="text-electric">원상복구</span>까지.
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-navy-foreground/80 lg:text-lg">
              윗집 배관, 욕실 방수, 공장 지붕 판넬까지. 물이 어디서 들어오는지 먼저 찾아 막고, 젖은 천장 · 벽 ·
              바닥을 원래대로 되돌립니다. 보험 청구에 필요한 사진과 내역도 정리해 드립니다.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <TrackLink
                href={tel}
                channel="call_mobile"
                from={`${FROM}_hero`}
                className="group inline-flex h-14 items-center justify-between gap-6 bg-electric px-6 text-electric-foreground transition-colors hover:bg-background hover:text-navy"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Smartphone className="size-4" />
                  지금 전화하기
                </span>
                <span className="font-mono text-lg font-bold tracking-tight">{settings.phoneMobile}</span>
              </TrackLink>
              <TrackLink
                href="#quote"
                channel="quote_open"
                from={`${FROM}_hero`}
                className="group inline-flex h-14 items-center justify-between gap-6 border border-navy-foreground/30 px-6 text-sm font-semibold transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
              >
                사진 보내고 견적 받기
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
              </TrackLink>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-navy-foreground/70">
              {['당일 회신', '현장 방문 진단', '보험 청구 자료 정리', '긴급 누수 상담'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-electric" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-1 lg:col-span-5 lg:grid-cols-1 lg:grid-rows-2">
            {CASES.map((c) => (
              <div key={c.title} className="relative aspect-[4/3] overflow-hidden bg-charcoal lg:aspect-auto lg:min-h-56">
                <Image src={c.hero.src} alt={c.hero.alt} fill priority sizes="(min-width: 1024px) 40vw, 50vw" className="object-cover" />
                <span className="absolute bottom-0 left-0 flex items-center gap-2 bg-navy px-3 py-2 text-xs font-semibold sm:text-sm">
                  <span className="size-2 bg-electric" aria-hidden />
                  {c.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 지금 새고 있다면 */}
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
          <p className="flex shrink-0 items-center gap-2 text-sm font-bold">
            <TriangleAlert className="size-5 text-electric" strokeWidth={1.75} />
            지금 물이 새고 있다면
          </p>
          <ol className="grid grid-cols-1 gap-2 text-sm text-foreground/80 sm:grid-cols-2 lg:flex lg:flex-1 lg:gap-6">
            {['메인 수도 밸브 잠그기', '젖은 곳 전기 차단기 내리기', '물 받치고 사진 찍어 두기', '바로 전화 주세요'].map(
              (t, i) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-electric">0{i + 1}</span>
                  {t}
                </li>
              ),
            )}
          </ol>
        </div>
      </section>

      {/* 증상 */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:gap-14 lg:px-8">
          <SectionHeading
            kicker="Symptoms"
            title="이런 증상, 그냥 두면 커집니다."
            description="누수는 마감재 뒤에서 먼저 번집니다. 얼룩이 보일 때는 이미 안쪽이 젖어 있는 경우가 많습니다."
          />
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
            {SYMPTOMS.map((g) => (
              <div key={g.label} className="flex flex-col gap-5 bg-background p-6 lg:p-8">
                <p className="flex items-center gap-3 text-lg font-bold tracking-tight">
                  <span className="flex size-9 items-center justify-center bg-secondary text-navy">
                    <g.icon className="size-4" strokeWidth={1.75} />
                  </span>
                  {g.label}
                </p>
                <ul className="flex flex-col gap-3">
                  {g.items.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85 lg:text-base">
                      <Check className="mt-1 size-4 shrink-0 text-electric" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 주택 / 공장 */}
      <section className="border-t border-border bg-background py-16 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:gap-14 lg:px-8">
          <SectionHeading
            kicker="Cause & Restore"
            title="원인을 막고, 그다음에 복구합니다."
            description="원인을 그대로 두고 도배부터 다시 하면 같은 자리에 또 얼룩이 올라옵니다. 주택과 공장은 물이 들어오는 길이 달라서 보는 곳도 다릅니다."
          />
          <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-2">
            {CASES.map((c) => (
              <article key={c.title} className="flex flex-col bg-background">
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <Image src={c.image} alt={c.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                </div>
                <div className="flex flex-col gap-6 p-6 lg:p-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-kicker text-electric">{c.en}</span>
                    <h3 className="flex items-center gap-2 text-2xl font-bold tracking-tight">{c.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-3">
                      <p className="text-kicker text-muted-foreground">자주 보는 원인</p>
                      <ul className="flex flex-col gap-2">
                        {c.causes.map((t) => (
                          <li key={t} className="flex items-start gap-2 text-sm">
                            <span className="mt-2 h-px w-3 shrink-0 bg-electric" aria-hidden />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col gap-3">
                      <p className="text-kicker text-muted-foreground">복구 범위</p>
                      <ul className="flex flex-col gap-2">
                        {c.restore.map((t) => (
                          <li key={t} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 size-4 shrink-0 text-electric" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 진행 순서 */}
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 py-20 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-28">
          <div className="flex flex-col gap-7 lg:col-span-5">
            <SectionHeading
              tone="dark"
              kicker="How We Work"
              title="찾고, 막고, 말리고, 되돌립니다."
              description="누수 복구는 순서가 중요합니다. 원인 확인과 건조를 건너뛰면 마감을 새로 해도 다시 젖습니다."
            />
            <div className="grid grid-cols-2 gap-1">
              {[
                { src: '/images/leak/house-damage.webp', label: '복구 전' },
                { src: '/images/leak/house-restored.webp', label: '복구 후' },
              ].map((p) => (
                <div key={p.label} className="relative aspect-square overflow-hidden bg-charcoal">
                  <Image src={p.src} alt={`누수 ${p.label} 실내 예시`} fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover" />
                  <span className="absolute left-0 top-0 bg-navy px-3 py-1.5 font-mono text-[11px] font-semibold">
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="-mt-4 text-xs text-navy-foreground/50">이해를 돕기 위한 예시 이미지입니다.</p>
          </div>

          <ol className="flex flex-col divide-y divide-navy-foreground/15 border-y border-navy-foreground/15 lg:col-span-7">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-7 sm:grid-cols-[6rem_8rem_1fr] sm:items-baseline lg:py-8"
              >
                <span className="font-mono text-xs text-electric">{s.n}</span>
                <span className="font-mono text-xs text-navy-foreground/50">{s.time}</span>
                <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                  <h3 className="text-xl font-bold tracking-tight lg:text-2xl">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-navy-foreground/70 lg:text-base">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 보험 */}
      <section className="bg-secondary py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="lg:col-span-5">
            <SectionHeading
              kicker="Insurance"
              title="보험 청구, 자료부터 제대로."
              description="아랫집 피해는 일상생활배상책임보험, 우리 집 피해는 주택화재보험 누수 특약 등으로 처리되는 경우가 많습니다. 어느 보험이든 사진과 원인, 내역이 분명해야 합니다."
            />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-7">
            <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
              {INSURANCE.map((i) => (
                <li key={i.title} className="flex flex-col gap-4 bg-background p-6">
                  <span className="flex size-9 items-center justify-center bg-secondary text-navy">
                    <i.icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <p className="text-lg font-bold tracking-tight">{i.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{i.description}</p>
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ClipboardList className="mt-0.5 size-3.5 shrink-0" />
              보험 청구는 가입자 본인이 진행하며, 보상 여부와 범위는 가입한 상품과 보험사 판단에 따릅니다.
            </p>
          </div>
        </div>
      </section>

      {/* 실제 작업 사진 */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:gap-14 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeading
              kicker="Our Work"
              title="배관 · 지붕 · 판넬, 직접 시공합니다."
              description="엔엠솔루션의 본업은 공장 개보수입니다. 누수 원인이 되는 배관과 지붕, 판넬을 다른 업체에 넘기지 않고 직접 고칩니다."
            />
            <Link
              href="/services/factory"
              className="group inline-flex w-fit shrink-0 items-center gap-2 text-sm font-semibold transition-colors hover:text-electric"
            >
              공장 개보수 보기
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
            {WORK_PHOTOS.map((p) => (
              <li key={p.src} className="flex flex-col bg-background">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image src={p.src} alt={p.label} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
                </div>
                <p className="py-3 text-sm font-medium">{p.label}</p>
              </li>
            ))}
          </ul>
          <p className="-mt-6 text-xs text-muted-foreground lg:-mt-10">엔엠솔루션 실제 작업 사진입니다.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-background py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="lg:col-span-4">
            <SectionHeading kicker="FAQ" title="자주 묻는 질문" />
          </div>
          <ul className="flex flex-col divide-y divide-border border-y border-border lg:col-span-8">
            {FAQ.map((f) => (
              <li key={f.q}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-semibold lg:text-lg [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-6 text-pretty text-sm leading-relaxed text-muted-foreground lg:text-base">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 문의 */}
      <section id="contact" className="bg-navy py-20 text-navy-foreground lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
                <span className="h-px w-8 bg-electric" aria-hidden />
                Contact
              </p>
              <h2 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.025em] sm:text-5xl">
                사진 몇 장이면
                <br />
                오늘 안에 답변드립니다.
              </h2>
              <p className="flex items-center gap-3 text-base text-navy-foreground/75 lg:text-lg">
                <Camera className="size-5 shrink-0 text-electric" />
                얼룩 부위와 윗층 · 지붕 쪽 사진이 있으면 더 정확합니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:col-span-5">
              <TrackLink
                href={tel}
                channel="call_mobile"
                from={`${FROM}_contact`}
                className="flex flex-col gap-1 border border-electric bg-electric/10 px-6 py-5 transition-colors hover:bg-electric/20"
              >
                <span className="text-kicker flex items-center gap-2 text-electric">
                  <Smartphone className="size-3.5" />
                  담당자 직통
                </span>
                <span className="font-mono text-3xl font-bold tracking-tight lg:text-4xl">{settings.phoneMobile}</span>
              </TrackLink>
              <TrackLink
                href={`tel:${settings.phoneMain}`}
                channel="call_main"
                from={`${FROM}_contact`}
                className="flex items-center justify-between border border-navy-foreground/25 px-6 py-4 transition-colors hover:bg-navy-foreground/10"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-electric" />
                  대표전화
                </span>
                <span className="font-mono text-xl font-bold">{settings.phoneMain}</span>
              </TrackLink>
              <KakaoChatButton
                kakaoUrl={settings.kakaoUrl}
                className="inline-flex h-14 w-full items-center justify-between border border-navy-foreground/30 px-6 text-base font-semibold transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
              />
            </div>
          </div>

          <div id="quote" className="mt-14 scroll-mt-28 bg-background p-6 text-foreground sm:p-10 lg:mt-20 lg:p-14">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="flex flex-col gap-5 lg:col-span-4">
                <p className="text-kicker flex items-center gap-3 text-muted-foreground">
                  <span className="h-px w-8 bg-electric" aria-hidden />
                  Request a Quote
                </p>
                <h3 className="text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em]">
                  전화가 어려우시면
                  <br />
                  남겨만 주세요.
                </h3>
                <p className="text-pretty text-base leading-relaxed text-muted-foreground">
                  성함과 연락처만 있으면 됩니다. 어디가 어떻게 젖는지 한 줄만 적어주시면 통화하면서 확인합니다.
                </p>
              </div>
              <div className="lg:col-span-8">
                <QuoteForm phoneMobile={settings.phoneMobile} initialCategories={['누수 · 피해복구']} from={FROM} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
