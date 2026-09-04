import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { FactoryScope } from '@/components/factory-scope'
import { FactoryProcess } from '@/components/factory-process'
import { Projects } from '@/components/projects'
import { Why } from '@/components/why'
import { ContactCta } from '@/components/contact-cta'
import { SiteFooter } from '@/components/site-footer'
import { FloatingContact, MobileContactBar } from '@/components/contact-widgets'
import { getContent, getPublishedProjects } from '@/lib/content/get'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [home, settings] = await Promise.all([getContent('home'), getContent('settings')])
  const projects = settings.showProjects ? await getPublishedProjects() : []

  return (
    <>
      <SiteHeader showProjects={settings.showProjects} />
      <main>
        <Hero content={home.hero} />
        <FactoryScope content={home.scope} />
        <FactoryProcess content={home.process} />
        {settings.showProjects && <Projects projects={projects} />}
        <Why content={home.why} />
        <ContactCta content={home.contact} settings={settings} />
      </main>
      <SiteFooter settings={settings} />
      <FloatingContact phone={settings.phoneMain} kakaoUrl={settings.kakaoUrl} />
      <MobileContactBar phone={settings.phoneMain} kakaoUrl={settings.kakaoUrl} />
    </>
  )
}
