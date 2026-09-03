import { SettingsEditor } from '@/components/admin/settings-editor'
import { getContent } from '@/lib/content/get'

export default async function AdminSettingsPage() {
  const settings = await getContent('settings')
  return <SettingsEditor initial={settings} />
}
