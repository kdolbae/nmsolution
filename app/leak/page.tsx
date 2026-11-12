import Image from 'next/image'
import type { Metadata } from 'next'
import {
  ArrowDown,
  Camera,
  Check,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  MessageSquareText,
  Receipt,
  Smartphone,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { SectionHeading } from '@/components/section-heading'
import { PhotoQuoteForm } from '@/components/photo-quote-form'
import { KakaoChatButton } from '@/components/contact-widgets'
import { TrackLink } from '@/components/track-link'
import { getContent } from '@/lib/content/get'
import { jsonLdScript, siteUrl } from '@/lib/site'

/**
 * 누수 사진 견적 — 안성 · 평택 누수 검색광고 전용 랜딩.
 *
 * 약속은 두 가지다. 출장 전에 사진으로 구체적인 견적부터 드린다, 현실적이고 합리적인 가격으로 한다.
 * 첫 화면에서 바로 사진을 찍어 보낼 수 있게 폼을 위로 올렸다. 자세한 누수 설명은 /services/recovery 에 있다.
 * 경력 연수 · 시공 건수 · "출장비 무료"처럼 사업주가 확인하지 않은 말은 넣지 않는다.
 */

export const dynamic = 'force-dynamic'

const PATH = '/leak'
const TITLE = '안성 · 평택 누수 — 사진 찍어 보내면 출장 전에 견적부터'
// 네이버 권고 80자 이내
const DESCRIPTION = '누수 부위 사진만 보내주세요. 출장 전에 구체적인 견적부터 드리고, 현실적이고 합리적인 가격으로 진행합니다. 안성 · 평택.'
const OG_IMAGE = '/images/leak/og.jpg'
const FROM = 'leak_photo'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['안성 누수', '안성 누수탐지', '안성 누수업체', '평택 누수', '평택 누수탐지', '평택 누수업체', '공도 누수', '천장 누수', '누수 견적', '누수 사진 견적'],
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '엔엠솔루션 NM SOLUTION',
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: '누수 사진 보내면 출장 전에 견적부터, 엔엠솔루션' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
}

const PROMISES = [
  {
    icon: Receipt,
    title: '출장 전에 견적부터',
    description:
      '사진으로 원인이 될 만한 곳과 손봐야 할 범위를 먼저 봅니다. 가능한 작업과 예상 금액을 구체적으로 말씀드리고, 확인하신 뒤에 방문 여부를 정하시면 됩니다.',
  },
  {
    icon: ClipboardCheck,
    title: '현실적이고 합리적인 가격',
    description:
      '필요한 만큼만 고칩니다. 원인을 막는 작업과 마감 복구를 항목별로 나눠 보여드리고, 부풀린 금액이나 불필요한 공사는 권하지 않습니다.',
  },
  {
    icon: Wrench,
    title: '원인부터 막고 복구까지',
    description:
      '배관 · 방수 · 지붕 판넬을 직접 고치는 시공 회사입니다. 물길을 먼저 막고, 젖은 천장 · 벽 · 바닥을 원래대로 되돌립니다.',
  },
]

const STEPS = [
  { n: '01', title: '사진 보내기', description: '이 페이지에서 바로 찍어 보내거나, 카카오톡 · 문자로 보내주세요.' },
  { n: '02', title: '출장 전 견적 안내', description: '사진을 보고 연락드려 예상 원인, 작업 범위, 금액을 먼저 말씀드립니다.' },
  { n: '03', title: '방문 · 원인 확인', description: '견적에 동의하시면 방문합니다. 현장이 사진과 다르면 공사 전에 먼저 말씀드립니다.' },
  { n: '04', title: '원인 차단 · 복구', description: '물길을 막고 말린 뒤 마감합니다. 공사 전 · 후 사진과 내역서를 드립니다.' },
]

const SYMPTOMS = [
  '천장에 누런 얼룩이 번지거나 물이 떨어진다',
  '벽지가 들뜨고 곰팡이 냄새가 난다',
  '마루 · 장판이 들뜨고 바닥이 젖어 있다',
  '아랫집에서 물이 샌다고 연락이 왔다',
  '쓴 만큼보다 수도요금이 많이 나온다',
  '비 오는 날 공장 지붕 · 판넬 이음부로 물이 샌다',
]

const AREAS = ['안성', '평택', '천안', '아산', '용인', '오산', '화성']

const FAQ = [
  {
    q: '사진만 보고 견적이 나오나요?',
    a: '대부분의 경우 사진으로 예상 원인과 작업 범위, 금액대를 구체적으로 말씀드릴 수 있습니다. 벽 속 배관처럼 사진으로 알 수 없는 부분은 어디까지가 확실하고 어디부터 현장 확인이 필요한지 나눠서 설명드립니다.',
  },
  {
    q: '현장에 와 보니 견적과 다르면 어떻게 되나요?',
    a: '사진과 현장이 다를 수 있습니다. 그때는 공사를 시작하기 전에 달라진 내용과 금액을 먼저 말씀드리고, 동의하신 뒤에만 진행합니다.',
  },
  {
    q: '어떤 사진을 찍어 보내면 되나요?',
    a: '젖은 곳을 가까이 한 장, 방이나 공간 전체가 보이게 한 장, 위층 욕실 · 배관 · 지붕처럼 물이 올 만한 쪽을 한 장 찍어 주시면 충분합니다. 영상이 있으면 카카오톡으로 보내주셔도 됩니다.',
  },
  {
    q: '지금 물이 새고 있어요. 먼저 뭘 해야 하나요?',
    a: '수도 계량기 옆 메인 밸브를 잠그고, 물이 닿는 곳의 전기는 차단기를 내려 주세요. 물 떨어지는 곳에 통을 받치고 사진을 찍어 보내주시면 바로 안내드립니다.',
  },
  {
    q: '보험 처리도 되나요?',
    a: '보험 청구에 필요한 피해 사진, 원인 소견, 항목별 공사 내역서를 정리해 드립니다. 청구는 가입자 본인이 하시며, 보상 여부와 범위는 가입한 상품과 보험사 판단에 따릅니다.',
  },
]

export default async function LeakPhotoQuotePage() {
  const settings = await getContent('settings')
  const url = siteUrl()
  const tel = `tel:${settings.phoneMobile}`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: '누수 사진 견적 · 누수 복구',
      serviceType: '누수 복구',
      url: `${url}${PATH}`,
      description: DESCRIPTION,
      image: `${url}${OG_IMAGE}`,
      provider: { '@id': `${url}/#organization` },
      areaServed: AREAS.map((a) => ({ '@type': 'City', name: `${a}시` })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]

  return (
    <PageShell settings={settings}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* Hero — 광고 문구와 같은 약속을 첫 줄에 */}
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-12 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
          <div className="flex flex-col gap-6 lg:col-span-7 lg:justify-center">
            <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
              <span className="h-px w-8 bg-electric" aria-hidden />
              Leak Photo Quote · 안성 · 평택
            </p>
            <h1 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              누수, 사진 찍어 보내면
              <br />
              <span className="text-electric">출장 전에 견적</span>부터.
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-navy-foreground/80 lg:text-lg">
              젖은 곳 사진 몇 장이면 됩니다. 가기 전에 가능한 작업과 금액을 구체적으로 먼저 말씀드리고, 현실적이고
              합리적인 가격으로 진행합니다.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <TrackLink
                href="#photo"
                channel="quote_open"
                from={`${FROM}_hero`}
                className="group inline-flex h-14 items-center justify-between gap-6 bg-electric px-6 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
              >
                <span className="flex items-center gap-2">
                  <Camera className="size-5" />
                  사진 찍어 바로 견적 받기
                </span>
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
              </TrackLink>
              <TrackLink
                href={tel}
                channel="call_mobile"
                from={`${FROM}_hero`}
                className="inline-flex h-14 items-center justify-between gap-6 border border-navy-foreground/30 px-6 transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Smartphone className="size-4" />
                  전화
                </span>
                <span className="font-mono text-lg font-bold tracking-tight">{settings.phoneMobile}</span>
              </TrackLink>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-navy-foreground/70">
              {['출장 전 견적 안내', '항목별 금액 공개', '원인 차단 · 원상복구', '보험 청구 자료 정리'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-electric" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative hidden aspect-[4/3] overflow-hidden bg-charcoal lg:col-span-5 lg:block lg:aspect-auto">
            <Image
              src="/images/leak/house-damage.webp"
              alt="누수로 천장과 벽지가 얼룩지고 벗겨진 방"
              fill
              priority
              sizes="40vw"
              className="object-cover"
            />
            <span className="absolute bottom-0 left-0 flex items-center gap-2 bg-navy px-3 py-2 text-sm font-semibold">
              <Camera className="size-4 text-electric" />
              이렇게 찍어 보내주세요
            </span>
          </div>
        </div>
      </section>

      {/* 사진 견적 폼 — 광고로 들어온 사람이 스크롤 한 번에 닿게 바로 아래에 둔다 */}
      <section id="photo" className="scroll-mt-24 bg-secondary py-12 lg:scroll-mt-32 lg:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 lg:grid-cols-12 lg:gap-x-16 lg:gap-y-8 lg:px-8">
          <div className="lg:col-span-4">
            <SectionHeading
              kicker="Photo Quote"
              title="사진 보내고 견적 받기"
              description="찍어서 보내면 끝입니다. 사진을 보고 연락드려 출장 전에 예상 견적부터 말씀드립니다."
            />
          </div>
          {/* 모바일에서는 제목 바로 아래에 폼이 오게, 데스크톱에서는 오른쪽 두 줄을 차지하게 */}
          <div className="bg-background p-5 ring-1 ring-border sm:p-8 lg:col-span-8 lg:row-span-2 lg:p-10">
            <PhotoQuoteForm phoneMobile={settings.phoneMobile} from={FROM} />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4">
            <p className="text-sm font-semibold">카카오톡 · 문자로 보내셔도 됩니다</p>
            <KakaoChatButton
              kakaoUrl={settings.kakaoUrl}
              className="inline-flex h-12 w-full items-center justify-between border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-foreground"
            />
            <TrackLink
              href={`sms:${settings.phoneMobile}`}
              channel="call_sms"
              from={`${FROM}_form`}
              className="inline-flex h-12 w-full items-center justify-between border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-foreground"
            >
              <span className="flex items-center gap-2">
                <MessageSquareText className="size-4 text-electric" />
                문자로 사진 보내기
              </span>
              <span className="font-mono">{settings.phoneMobile}</span>
            </TrackLink>
          </div>
        </div>
      </section>

      {/* 약속 */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:gap-14 lg:px-8">
          <SectionHeading
            kicker="Our Promise"
            title="가기 전에 먼저 말씀드립니다."
            description="얼마가 들지 모르는 채로 사람을 부르는 게 누수 공사에서 가장 불안한 부분입니다. 그래서 순서를 바꿨습니다."
          />
          <ul className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
            {PROMISES.map((p) => (
              <li key={p.title} className="flex flex-col gap-4 bg-background p-6 lg:p-8">
                <span className="flex size-10 items-center justify-center bg-secondary text-navy">
                  <p.icon className="size-5" strokeWidth={1.75} />
                </span>
                <p className="text-xl font-bold tracking-tight">{p.title}</p>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground lg:text-base">{p.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 진행 순서 */}
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-16 lg:px-8 lg:py-24">
          <SectionHeading tone="dark" kicker="How It Works" title="사진 → 견적 → 방문 → 복구" />
          <ol className="grid grid-cols-1 gap-px bg-navy-foreground/15 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-3 bg-navy p-6">
                <span className="font-mono text-xs text-electric">STEP {s.n}</span>
                <p className="text-xl font-bold tracking-tight">{s.title}</p>
                <p className="text-sm leading-relaxed text-navy-foreground/70">{s.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 증상 + 지금 새고 있다면 */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <SectionHeading
              kicker="Symptoms"
              title="이런 증상이면 사진부터 보내주세요."
              description="누수는 마감재 뒤에서 먼저 번집니다. 얼룩이 보일 때는 안쪽이 이미 젖어 있는 경우가 많습니다."
            />
            <ul className="flex flex-col gap-3">
              {SYMPTOMS.map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85 lg:text-base">
                  <Check className="mt-1 size-4 shrink-0 text-electric" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4 border border-border p-6 lg:col-span-5 lg:self-start lg:p-8">
            <p className="flex items-center gap-2 text-base font-bold">
              <TriangleAlert className="size-5 text-electric" strokeWidth={1.75} />
              지금 물이 새고 있다면
            </p>
            <ol className="flex flex-col gap-3 text-sm text-foreground/85">
              {['메인 수도 밸브 잠그기', '젖은 곳 전기 차단기 내리기', '물 받치고 사진 찍어 두기', '사진 보내고 바로 전화 주세요'].map(
                (t, i) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-electric">0{i + 1}</span>
                    {t}
                  </li>
                ),
              )}
            </ol>
            <TrackLink
              href={tel}
              channel="call_mobile"
              from={`${FROM}_urgent`}
              className="mt-2 inline-flex h-12 items-center justify-between bg-navy px-5 text-navy-foreground transition-colors hover:bg-electric"
            >
              <span className="text-sm font-semibold">긴급 전화</span>
              <span className="font-mono text-lg font-bold">{settings.phoneMobile}</span>
            </TrackLink>
          </div>
        </div>
      </section>

      {/* 지역 */}
      <section className="border-y border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
          <p className="flex shrink-0 items-center gap-2 text-sm font-bold">
            <MapPin className="size-5 text-electric" strokeWidth={1.75} />
            방문 지역
          </p>
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">안성 · 평택</span> 중심으로{' '}
            {AREAS.slice(2).join(' · ')}까지 방문합니다. 위치를 알려주시면 가능한 일정을 바로 안내드립니다.
          </p>
        </div>
      </section>

      {/* 작업 사진 */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 lg:px-8">
          <SectionHeading
            kicker="Our Work"
            title="배관 · 방수 · 지붕, 직접 고칩니다."
            description="누수 원인이 되는 배관과 지붕 판넬을 다른 업체에 넘기지 않고 직접 시공합니다."
          />
          <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
            {[
              { src: '/images/leak/work-buried-pipe.webp', label: '매설 배관 굴착 · 교체' },
              { src: '/images/leak/work-pipe-line.webp', label: '배관 라인 정비' },
              { src: '/images/leak/work-roof-frame.webp', label: '지붕 골조 · 판넬 시공' },
            ].map((p) => (
              <li key={p.src} className="flex flex-col bg-background">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image src={p.src} alt={p.label} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
                </div>
                <p className="py-3 text-sm font-medium">{p.label}</p>
              </li>
            ))}
          </ul>
          <p className="-mt-6 text-xs text-muted-foreground">엔엠솔루션 실제 작업 사진입니다.</p>
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

      {/* 마지막 권유 */}
      <section className="bg-navy py-16 text-navy-foreground lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <h2 className="text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em] sm:text-4xl lg:text-5xl">
            얼마 드는지 먼저 알고
            <br />
            결정하세요.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <TrackLink
              href="#photo"
              channel="quote_open"
              from={`${FROM}_bottom`}
              className="inline-flex h-14 items-center justify-center gap-2 bg-electric px-7 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
            >
              <Camera className="size-5" />
              사진 찍어 견적 받기
            </TrackLink>
            <TrackLink
              href={tel}
              channel="call_mobile"
              from={`${FROM}_bottom`}
              className="inline-flex h-14 items-center justify-center gap-3 border border-navy-foreground/30 px-7 transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
            >
              <Smartphone className="size-4" />
              <span className="font-mono text-lg font-bold">{settings.phoneMobile}</span>
            </TrackLink>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
