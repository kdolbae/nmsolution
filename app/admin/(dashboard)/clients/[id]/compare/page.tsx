import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { ClientCompare } from '@/components/admin/client-compare'
import { getClient, getVersion, listVersions } from '@/lib/clients/table'

export const dynamic = 'force-dynamic'

/** 두 버전 비교. ?a=이전&b=이후, 없으면 바로 앞 버전과 최신본 */
export default async function AdminClientComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const client = await getClient(Number(id))
  if (!client) notFound()
  const versions = await listVersions(client.id)
  const bNo = Number(sp.b) || versions[0]?.no
  const aNo = Number(sp.a) || versions.find((v) => v.no < bNo)?.no || bNo
  const [a, b] = await Promise.all([getVersion(client.id, aNo), getVersion(client.id, bNo)])
  if (!a || !b) notFound()
  const plain = (v: NonNullable<typeof a>) => ({
    no: v.no,
    at: v.at.toISOString(),
    summary: v.summary,
    supply: v.supply,
    proposalHtml: v.proposalHtml,
    quote: v.quote,
  })

  return (
    <>
      <Link href={`/admin/clients/${client.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {client.name}
      </Link>
      <ClientCompare
        key={`${a.no}-${b.no}`}
        clientId={client.id}
        clientName={client.name}
        finalizedVersion={client.finalized?.version ?? null}
        versions={versions.map((v) => ({ no: v.no, at: v.at.toISOString(), summary: v.summary }))}
        a={plain(a)}
        b={plain(b)}
      />
    </>
  )
}
