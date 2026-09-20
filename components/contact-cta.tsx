import { ArrowDown, ArrowUpRight, Camera, Phone, Smartphone } from 'lucide-react'
import { MultilineText } from './multiline-text'
import { KakaoChatButton } from './contact-widgets'
import { kakaoLinks } from '@/lib/kakao'
import { QuoteForm } from './quote-form'
import type { HomeContent, SettingsContent } from '@/lib/content/defaults'

export function ContactCta({
  content,
  settings,
}: {
  content: HomeContent['contact']
  settings: SettingsContent
}) {
  const kakao = kakaoLinks(settings.kakaoUrl)

  return (
    <section id="contact" className="bg-navy py-24 text-navy-foreground lg:py-36">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end">
          <div className="flex flex-col gap-7 lg:col-span-8">
            <p className="text-kicker flex items-center gap-3 text-navy-foreground/60">
              <span className="h-px w-8 bg-electric" aria-hidden />
              Contact
            </p>
            <h2 className="text-balance text-4xl font-black leading-[1.1] tracking-[-0.025em] sm:text-5xl lg:text-7xl">
              <MultilineText text={content.title} />
            </h2>
            <p className="flex items-center gap-3 text-base text-navy-foreground/75 lg:text-lg">
              <Camera className="size-5 shrink-0 text-electric" />
              {content.description}
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4">
            <a
              href={`tel:${settings.phoneMain}`}
              className="group flex flex-col gap-1 border border-navy-foreground/25 bg-navy-foreground/5 px-6 py-5 transition-colors hover:border-navy-foreground/50 hover:bg-navy-foreground/10"
            >
              <span className="text-kicker flex items-center gap-2 text-navy-foreground/60">
                <Phone className="size-3.5 text-electric" />
                대표전화
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight text-navy-foreground lg:text-4xl">
                {settings.phoneMain}
              </span>
            </a>
            <a
              href={`tel:${settings.phoneMobile}`}
              className="group flex flex-col gap-1 border border-electric bg-electric/10 px-6 py-5 transition-colors hover:bg-electric/20"
            >
              <span className="text-kicker flex items-center gap-2 text-electric">
                <Smartphone className="size-3.5" />
                담당자 직통
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight text-navy-foreground lg:text-4xl">
                {settings.phoneMobile}
              </span>
              <span className="text-sm text-navy-foreground/70">현장에 있어도 바로 받습니다.</span>
            </a>
            <a
              href="#quote"
              className="group inline-flex h-14 items-center justify-between bg-electric px-6 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
            >
              견적 문의 남기기
              <ArrowDown className="size-5 transition-transform group-hover:translate-y-1" />
            </a>
            <KakaoChatButton
              kakaoUrl={settings.kakaoUrl}
              className="inline-flex h-14 w-full items-center justify-between border border-navy-foreground/30 px-6 text-base font-semibold transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
            />
            {kakao.home && (
              <a
                href={kakao.home}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-between border border-navy-foreground/20 px-6 text-sm font-medium text-navy-foreground/80 transition-colors hover:border-navy-foreground/50 hover:text-navy-foreground"
              >
                카카오톡 채널 추가
                <ArrowUpRight className="size-4" />
              </a>
            )}
            <p className="pt-2 font-mono text-xs text-navy-foreground/50">{content.hours}</p>
          </div>
        </div>

        <div id="quote" className="mt-16 scroll-mt-28 bg-background p-6 text-foreground sm:p-10 lg:mt-20 lg:p-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <p className="text-kicker flex items-center gap-3 text-muted-foreground">
                <span className="h-px w-8 bg-electric" aria-hidden />
                Request a Quote
              </p>
              <h3 className="text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em] lg:text-4xl">
                전화가 어려우시면
                <br />
                남겨만 주세요.
              </h3>
              <p className="text-pretty text-base leading-relaxed text-muted-foreground">
                밤이든 주말이든 접수됩니다. 성함과 연락처만 있으면 되고, 나머지는 통화하면서 확인합니다.
              </p>
            </div>
            <div className="lg:col-span-8">
              <QuoteForm phoneMobile={settings.phoneMobile} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
