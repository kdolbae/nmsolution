import { AboutEditor } from '@/components/admin/about-editor'
import { getContent } from '@/lib/content/get'

export default async function AdminAboutPage() {
  const about = await getContent('about')
  return <AboutEditor initial={about} />
}
