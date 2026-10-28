import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { IntakeWorkspace } from '@/components/admin/intake-workspace'
import { getIntake, listFiles } from '@/lib/intake/table'
import { listClients } from '@/lib/clients/table'

export const dynamic = 'force-dynamic'

export default async function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const intake = await getIntake(Number(id))
  if (!intake) notFound()
  const [files, clients] = await Promise.all([listFiles(intake.id), listClients()])
  return (
    <>
      <Link href="/admin/intake" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> 접수 목록
      </Link>
      <h1 className="mb-4 text-xl font-semibold">{intake.title || `접수 #${intake.id}`}</h1>
      <IntakeWorkspace
        intake={{ id: intake.id, title: intake.title, description: intake.description, clientId: intake.clientId, analysis: intake.analysis, messages: intake.messages, draft: intake.draft }}
        files={files.map((f) => ({ id: f.id, name: f.name, mime: f.mime, bytes: f.bytes, caption: f.caption, key: f.key }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      />
    </>
  )
}
