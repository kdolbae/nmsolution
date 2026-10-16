import { Badge, Card, Empty } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { listApprovals, listEstimates, listEvents, listSubmissions, listVisits } from '@/lib/est/data'

export const dynamic = 'force-dynamic'

type Row = { at: string; kind: string; text: string }

const CH: Record<string, string> = { print: '인쇄', pdf: 'PDF', email: '메일', kakao: '카카오톡', portal: '포털', other: '기타' }
const AP: Record<string, string> = { approved: '승인', rejected: '반려', skipped: '생략' }

/** S3 기록 탭: 판·결재·제출·방문·변수 시간순 */
export default async function LogPage({ params }: { params: Promise<{ id: string }> }) {
  await estPageSession()
  const pid = Number((await params).id)
  const [estimates, approvals, subs, visits, events] = await Promise.all([listEstimates(pid), listApprovals(pid), listSubmissions(pid), listVisits(pid), listEvents(pid)])
  const label = (id: number) => estimates.find((e) => e.id === id)?.label ?? `#${id}`
  const rows: Row[] = [
    ...estimates.map((e) => ({ at: e.createdAt, kind: '판', text: `${e.label || `v${e.versionNo}`} 만듦${e.parentId ? `(${label(e.parentId)} 복제)` : ''}` })),
    ...approvals.filter((a) => a.decidedAt && a.status !== 'skipped').map((a) => ({ at: a.decidedAt!, kind: '결재', text: `${label(a.estimateId)} ${a.round}차 ${a.stepRole} ${AP[a.status] ?? a.status}${a.decidedByName ? ` · ${a.decidedByName}` : ''}${a.comment ? ` — ${a.comment}` : ''}` })),
    ...subs.map((s) => ({ at: s.submittedAt, kind: '제출', text: `${label(s.estimateId)} ${CH[s.channel] ?? s.channel}${s.recipient ? ` → ${s.recipient}` : ''} (유효 ${s.validUntil})` })),
    ...visits.map((v) => ({ at: `${v.visitedOn}T00:00:00+09:00`, kind: '방문', text: `${v.userName}${v.note ? ` — ${v.note}` : ''}` })),
    ...events.map((e) => ({ at: `${e.occurredOn}T00:00:00+09:00`, kind: '변수', text: e.title })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  if (!rows.length) return <Empty>기록 없음</Empty>
  return (
    <Card title="기록">
      <ul className="flex flex-col">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="w-36 shrink-0 font-mono text-xs text-muted-foreground">{new Date(r.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
            <Badge tone="muted">{r.kind}</Badge>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
