import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { FactoryScope } from '@/components/factory-scope'
import { SemiconductorFeature } from '@/components/semiconductor-feature'
import { FactoryProcess } from '@/components/factory-process'
import { WorkGallery } from '@/components/work-gallery'
import { Projects } from '@/components/projects'
import { Why } from '@/components/why'
import { ContactCta } from '@/components/contact-cta'
import { SiteFooter } from '@/components/site-footer'
import { FloatingContact, MobileContactBar } from '@/components/contact-widgets'
import { getContent, getPublishedProjects } from '@/lib/content/get'
import { jsonLdScript, localBusinessJsonLd } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [home, settings, services] = await Promise.all([
    getContent('home'),
    getContent('settings'),
    getContent('services'),
  ])
  const projects = settings.showProjects ? await getPublishedProjects() : []
  const semiconductor = services.items.find((s) => s.slug === 'semiconductor')

  return (
    <>
      {/* 검색엔진이 업체 정보·전화번호·작업 범위를 그대로 읽어갈 수 있게 한다 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessJsonLd({ settings, services })) }}
      />
      <SiteHeader showProjects={settings.showProjects} />
      <main>
        <Hero content={home.hero} />
        <FactoryScope content={home.scope} />
        {semiconductor && <SemiconductorFeature item={semiconductor} />}
        <WorkGallery content={home.gallery} />
        <FactoryProcess content={home.process} />
        {settings.showProjects && <Projects projects={projects} />}
        <Why content={home.why} />
        <ContactCta content={home.contact} settings={settings} />
      </main>
      <SiteFooter settings={settings} />
      <FloatingContact
        phoneMain={settings.phoneMain}
        phoneMobile={settings.phoneMobile}
        kakaoUrl={settings.kakaoUrl}
      />
      <MobileContactBar
        phoneMain={settings.phoneMain}
        phoneMobile={settings.phoneMobile}
        kakaoUrl={settings.kakaoUrl}
      />
    </>
  )
}
