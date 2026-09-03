import { ServicesEditor } from '@/components/admin/services-editor'
import { getContent } from '@/lib/content/get'

export default async function AdminServicesPage() {
  const services = await getContent('services')
  return <ServicesEditor initial={services} />
}
