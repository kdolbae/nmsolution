import { HomeEditor } from '@/components/admin/home-editor'
import { getContent } from '@/lib/content/get'

export default async function AdminHomePage() {
  const home = await getContent('home')
  return <HomeEditor initial={home} />
}
