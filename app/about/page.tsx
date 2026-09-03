import { PageHero, PageShell } from '@/components/page-shell'
import { Paragraphs } from '@/components/multiline-text'
import { getContent } from '@/lib/content/get'
import { MapPin, Phone, User } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '회사소개 | 엔엠솔루션 NM SOLUTION',
  description: '엔엠솔루션 대표 인사말과 회사 정보.',
}

export default async function AboutPage() {
  const [about, settings] = await Promise.all([getContent('about'), getContent('settings')])

  return (
    <PageShell settings={settings}>
      <PageHero kicker={about.kicker} title={about.title} />

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 lg:grid-cols-12 lg:gap-16 lg:px-8">
          {/* CEO card */}
          <div className="lg:col-span-4">
            <div className="flex flex-col gap-5 lg:sticky lg:top-36">
              <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                {about.ceoImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={about.ceoImage} alt={about.ceoName} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <User className="size-10" strokeWidth={1.25} />
                    <span className="text-kicker">Photo</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-kicker text-electric">{about.ceoTitle}</p>
                <p className="text-2xl font-bold tracking-tight">{about.ceoName}</p>
              </div>
              <dl className="flex flex-col gap-2 border-t border-border pt-5 text-sm">
                <div className="flex items-start gap-3">
                  <dt className="sr-only">주소</dt>
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <dd className="text-muted-foreground">{settings.address}</dd>
                </div>
                <div className="flex items-start gap-3">
                  <dt className="sr-only">대표전화</dt>
                  <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <dd>
                    <a href={`tel:${settings.phoneMain}`} className="font-mono hover:text-electric">
                      {settings.phoneMain}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Greeting */}
          <article className="flex flex-col gap-8 lg:col-span-8">
            <h2 className="text-balance text-3xl font-black leading-[1.15] tracking-[-0.025em] lg:text-4xl">
              {about.greetingTitle}
            </h2>
            <div className="flex flex-col gap-5 text-base leading-[1.8] text-foreground/85 lg:text-lg">
              <Paragraphs text={about.greetingBody} />
            </div>
            <p className="mt-4 border-t border-border pt-6 text-right">
              <span className="text-sm text-muted-foreground">{about.ceoTitle}</span>
              <br />
              <span className="text-xl font-bold tracking-tight">{about.ceoName}</span>
            </p>
          </article>
        </div>
      </section>
    </PageShell>
  )
}
