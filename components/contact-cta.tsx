import { ArrowRight, Camera, Phone } from 'lucide-react'
import { MultilineText } from './multiline-text'
import { KakaoChatButton } from './contact-widgets'
import type { HomeContent, SettingsContent } from '@/lib/content/defaults'

export function ContactCta({
  content,
  settings,
}: {
  content: HomeContent['contact']
  settings: SettingsContent
}) {
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
              className="group flex flex-col gap-1 border border-electric/60 bg-navy-foreground/5 px-6 py-5 transition-colors hover:bg-navy-foreground/10"
            >
              <span className="text-kicker flex items-center gap-2 text-navy-foreground/60">
                <Phone className="size-3.5 text-electric" />
                대표전화
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight text-navy-foreground lg:text-4xl">
                {settings.phoneMain}
              </span>
              <span className="font-mono text-xs text-navy-foreground/60">{settings.phoneMobile}</span>
            </a>
            <a
              href="#contact"
              className="group inline-flex h-14 items-center justify-between bg-electric px-6 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
            >
              견적 문의
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </a>
            <KakaoChatButton
              kakaoUrl={settings.kakaoUrl}
              className="inline-flex h-14 w-full items-center justify-between border border-navy-foreground/30 px-6 text-base font-semibold transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
            />
            <p className="pt-2 font-mono text-xs text-navy-foreground/50">{content.hours}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
