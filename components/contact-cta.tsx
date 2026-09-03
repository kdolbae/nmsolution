import { ArrowRight, MessageCircle, Camera, Phone } from 'lucide-react'
import { COMPANY } from './brand'

export function ContactCta() {
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
              현장의 문제를 알려주세요.
              <br />
              엔엠솔루션이 해결 방법을 제안합니다.
            </h2>
            <p className="flex items-center gap-3 text-base text-navy-foreground/75 lg:text-lg">
              <Camera className="size-5 text-electric" />
              사진만 보내주셔도 상담을 시작할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4">
            <a
              href={COMPANY.telMain}
              className="group flex flex-col gap-1 border border-electric/60 bg-navy-foreground/5 px-6 py-5 transition-colors hover:bg-navy-foreground/10"
            >
              <span className="text-kicker flex items-center gap-2 text-navy-foreground/60">
                <Phone className="size-3.5 text-electric" />
                대표전화
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight text-navy-foreground lg:text-4xl">
                {COMPANY.phoneMain}
              </span>
              <span className="font-mono text-xs text-navy-foreground/60">{COMPANY.phoneMobile}</span>
            </a>
            <a
              href="#contact"
              className="group inline-flex h-14 items-center justify-between bg-electric px-6 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy"
            >
              견적 문의
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#contact"
              className="inline-flex h-14 items-center justify-between border border-navy-foreground/30 px-6 text-base font-semibold transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
            >
              카카오톡 상담
              <MessageCircle className="size-5" />
            </a>
            <p className="pt-2 font-mono text-xs text-navy-foreground/50">평일 09:00 – 18:00 · 긴급 누수 상담 가능</p>
          </div>
        </div>
      </div>
    </section>
  )
}
