import { notFound } from 'next/navigation'
import { estPageSession } from '@/lib/session'
import { PrintView } from '@/components/est/print-view'
import { Card, TableWrap, tdCls, thCls } from '@/components/est/ui'
import { getEstimate, getProject, listSubmissions } from '@/lib/est/data'

export const dynamic = 'force-dynamic'

const CH: Record<string, string> = { print: '인쇄', pdf: 'PDF', email: '메일', kakao: '카카오톡', portal: '포털', other: '기타' }

/** S9 고객 출력(P6) */
export default async function PrintPage({ params }: { params: Promise<{ id: string; vid: string }> }) {
  await estPageSession()
  const { id, vid } = await params
  const pid = Number(id)
  const [e, p, subs] = await Promise.all([getEstimate(Number(vid)), getProject(pid), listSubmissions(pid)])
  if (!e || !p || e.projectId !== pid) notFound()
  const mine = subs.filter((s) => s.estimateId === e.id)
  return (
    <div className="flex flex-col gap-4">
      <PrintView estimateId={e.id} approved={e.status === 'approved' || e.status === 'submitted'} defaultRecipient={p.client?.name ?? ''} />
      {mine.length > 0 && (
        <Card title="이 판의 제출 기록">
          <TableWrap>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={thCls}>제출일</th>
                  <th className={thCls}>채널</th>
                  <th className={thCls}>수신자</th>
                  <th className={thCls}>유효기간</th>
                  <th className={thCls}>제출한 사람</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((s) => (
                  <tr key={s.id}>
                    <td className={tdCls}>{new Date(s.submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                    <td className={tdCls}>{CH[s.channel] ?? s.channel}</td>
                    <td className={tdCls}>{s.recipient ?? '-'}</td>
                    <td className={tdCls}>{s.validUntil}</td>
                    <td className={tdCls}>{s.byName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}
    </div>
  )
}
