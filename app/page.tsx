import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { Services } from '@/components/services'
import { ServiceHighlight } from '@/components/service-highlight'
import {
  IndustrialSection,
  RecoverySection,
  InsulationSection,
  CoatingSection,
} from '@/components/solution-sections'
import { Projects } from '@/components/projects'
import { Why } from '@/components/why'
import { ContactCta } from '@/components/contact-cta'
import { ProductsAcademy } from '@/components/products-academy'
import { SiteFooter } from '@/components/site-footer'
import { FloatingContact, MobileContactBar } from '@/components/contact-widgets'

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Services />
        <ServiceHighlight />
        <IndustrialSection />
        <RecoverySection />
        <InsulationSection />
        <CoatingSection />
        <Projects />
        <Why />
        <ContactCta />
        <ProductsAcademy />
      </main>
      <SiteFooter />
      <FloatingContact />
      <MobileContactBar />
    </>
  )
}
