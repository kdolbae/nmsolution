import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { FactoryScope } from '@/components/factory-scope'
import { FactoryProcess } from '@/components/factory-process'
import { Projects } from '@/components/projects'
import { Why } from '@/components/why'
import { ContactCta } from '@/components/contact-cta'
import { SiteFooter } from '@/components/site-footer'
import { FloatingContact, MobileContactBar } from '@/components/contact-widgets'

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <FactoryScope />
        <FactoryProcess />
        <Projects />
        <Why />
        <ContactCta />
      </main>
      <SiteFooter />
      <FloatingContact />
      <MobileContactBar />
    </>
  )
}
