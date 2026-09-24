import { PageShell } from '@/components/page-shell'
import { Paragraphs } from '@/components/multiline-text'
import { getContent } from '@/lib/content/get'
import { MapPin, Phone, Smartphone } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '회사소개 | 엔엠솔루션 NM SOLUTION',
  description: '엔엠솔루션 대표 인사말과 회사 정보.',
}

export default async function AboutPage() {
  const [about, settings] = await Promise.all([getContent('about'), getContent('settings')])

  return (
    <PageShell settings={settings}>
      {/* 대표 사진을 넓게 깔고, 인사말 쪽으로 페이드되게 겹친다 */}
      <section className="relative isolate overflow-hidden bg-charcoal text-charcoal-foreground">
        {about.ceoImage && (
          <>
            {/* 모바일: 위쪽에 사진, 아래로 페이드 */}
            <div className="relative aspect-[4/3] w-full lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={about.ceoImage}
                alt={`${about.ceoTitle} ${about.ceoName}`}
                className="absolute inset-0 h-full w-full object-cover object-[47%_30%]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-charcoal" aria-hidden />
            </div>
            {/* 데스크톱: 왼쪽 넓게, 오른쪽 인사말로 페이드 */}
            <div className="absolute inset-y-0 left-0 hidden w-[74%] lg:block" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={about.ceoImage} alt="" className="absolute inset-0 h-full w-full object-cover object-[47%_30%]" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-charcoal/30 to-charcoal" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-charcoal to-transparent" />
            </div>
          </>
        )}

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 px-5 pb-20 lg:min-h-[760px] lg:grid-cols-12 lg:px-8 lg:py-28">
          <article className="-mt-10 flex flex-col gap-8 lg:col-span-6 lg:col-start-7 lg:mt-0 lg:justify-center">
            <p className="text-kicker flex items-center gap-3 text-charcoal-foreground/60">
              <span className="h-px w-8 bg-electric" aria-hidden />
              {about.kicker}
            </p>
            <h1 className="text-balance text-3xl font-black leading-[1.2] tracking-[-0.025em] lg:text-4xl">
              {about.greetingTitle}
            </h1>
            <div className="flex flex-col gap-5 text-base leading-[1.85] text-charcoal-foreground/80 lg:text-[17px]">
              <Paragraphs text={about.greetingBody} />
            </div>
            <div className="flex flex-col gap-6 border-t border-charcoal-foreground/15 pt-6 sm:flex-row sm:items-end sm:justify-between">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex items-start gap-3">
                  <dt className="sr-only">주소</dt>
                  <MapPin className="mt-0.5 size-4 shrink-0 text-charcoal-foreground/50" />
                  <dd className="text-charcoal-foreground/70">{settings.address}</dd>
                </div>
                <div className="flex items-start gap-3">
                  <dt className="sr-only">담당자 직통</dt>
                  <Smartphone className="mt-0.5 size-4 shrink-0 text-electric" />
                  <dd className="flex items-center gap-2">
                    <a href={`tel:${settings.phoneMobile}`} className="font-mono font-semibold hover:text-electric">
                      {settings.phoneMobile}
                    </a>
                    <span className="text-xs text-charcoal-foreground/50">직통</span>
                  </dd>
                </div>
                <div className="flex items-start gap-3">
                  <dt className="sr-only">대표전화</dt>
                  <Phone className="mt-0.5 size-4 shrink-0 text-charcoal-foreground/50" />
                  <dd>
                    <a href={`tel:${settings.phoneMain}`} className="font-mono hover:text-electric">
                      {settings.phoneMain}
                    </a>
                  </dd>
                </div>
              </dl>
              <p className="shrink-0 text-right">
                <span className="text-sm text-charcoal-foreground/60">{about.ceoTitle}</span>
                <br />
                <span className="text-2xl font-bold tracking-tight">{about.ceoName}</span>
              </p>
            </div>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
