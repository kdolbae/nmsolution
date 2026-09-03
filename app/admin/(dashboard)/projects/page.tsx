import { ProjectsManager } from '@/components/admin/projects-manager'
import { getAllProjects, getContent } from '@/lib/content/get'

export default async function AdminProjectsPage() {
  const [projects, settings] = await Promise.all([getAllProjects(), getContent('settings')])
  return <ProjectsManager projects={projects} showProjects={settings.showProjects} />
}
