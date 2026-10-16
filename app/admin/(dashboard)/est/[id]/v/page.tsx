import Link from 'next/link'
import { Badge, Card, Empty, LinkBtn, Money, TableWrap, tdCls, thCls } from '@/components/est/ui'
import { ESTIMATE_STATUS_LABEL, getProject, listEstimates } from '@/lib/est/data'
import { estPageSession } from '@/lib/session'
import { getSettings } from '@/lib/est/settings'
import { profitView } from '@/lib/est/perm'

export const dynamic = 'force-dynamic'

/** S3 견적(판) 탭: 판 목록 */
export default async function Versions({ params }: { params: Promise<{ id: string }> }) {
  const pid = Number((await params).id)
  const [s, p, list, settings] = await Promise.all([estPageSession(), getProject(pid), listEstimates(pid), getSettings()])
  const view = profitView(s?.estRole, settings)
  return (
    <Card title="판" actions={<LinkBtn href={`/admin/est/${pid}/v/new`} variant="accent" size="sm">새 판(자동 초안)</LinkBtn>}>
      {!list.length ? (
        <Empty>아직 판이 없음. 현장 확인을 마치고 자동 초안을 만들면 됨</Empty>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className={thCls}>판</th>
                <th className={thCls}>상태</th>
                <th className={thCls + ' text-right'}>공급가</th>
                <th className={thCls + ' text-right'}>합계</th>
                {view !== 'none' && <th className={thCls + ' text-right'}>예상이익</th>}
                <th className={thCls}>수정</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td className={tdCls}>
                    <Link href={`/admin/est/${pid}/v/${e.id}`} className="font-medium hover:text-electric">
                      {e.label || `v${e.versionNo}`}
                    </Link>
                    {p?.currentEstimateId === e.id && <Badge tone="accent" className="ml-2">대표</Badge>}
                  </td>
                  <td className={tdCls}>
                    <Badge tone={e.status === 'approved' || e.status === 'submitted' ? 'ok' : e.status === 'rejected' ? 'danger' : 'muted'}>{ESTIMATE_STATUS_LABEL[e.status] ?? e.status}</Badge>
                  </td>
                  <td className={tdCls + ' text-right'}><Money value={e.supply} /></td>
                  <td className={tdCls + ' text-right'}><Money value={e.total} /></td>
                  {view !== 'none' && (
                    <td className={tdCls + ' text-right font-mono'}>
                      {view === 'amount' ? `${e.expectedProfit.toLocaleString('ko-KR')} · ` : ''}
                      {e.marginPct}%
                    </td>
                  )}
                  <td className={tdCls + ' text-xs text-muted-foreground'}>{new Date(e.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Card>
  )
}
