import Link from 'next/link'
import { ApprovalActions } from '@/components/est/approval-actions'
import { Badge, Card, Empty, Money } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { ESTIMATE_STATUS_LABEL, lastCheckRun, listApprovals, listEstimates } from '@/lib/est/data'
import { atLeast } from '@/lib/est/perm'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ROLE: Record<string, string> = { writer: '작성자 확인', reviewer: '검토자', ceo: '대표' }
const ST: Record<string, { label: string; tone: 'ok' | 'danger' | 'accent' | 'muted' | 'neutral' }> = {
  approved: { label: '승인', tone: 'ok' },
  rejected: { label: '반려', tone: 'danger' },
  pending: { label: '결재 차례', tone: 'accent' },
  waiting: { label: '대기', tone: 'muted' },
  skipped: { label: '생략', tone: 'neutral' },
}

/** S8 결재: 단계 카드(작성자 확인 → 검토자 → 대표), 승인/반려, 자동 검사 결과 첨부 */
export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const pid = Number((await params).id)
  const [s, estimates, steps] = await Promise.all([estPageSession(), listEstimates(pid), listApprovals(pid)])
  const withSteps = estimates.filter((e) => steps.some((a) => a.estimateId === e.id))
  if (!withSteps.length) return <Empty>결재를 올린 판이 없음. 편집기에서 자동 검사 후 &ldquo;결재 올리기&rdquo;</Empty>
  const checks = Object.fromEntries(await Promise.all(withSteps.map(async (e) => [e.id, await lastCheckRun(e.id)] as const)))

  return (
    <div className="flex flex-col gap-5">
      {withSteps.reverse().map((e) => {
        const mine = steps.filter((a) => a.estimateId === e.id)
        const rounds = [...new Set(mine.map((a) => a.round))].sort((a, b) => b - a)
        const run = checks[e.id]
        return (
          <Card
            key={e.id}
            title={`${e.label || `v${e.versionNo}`} · ${ESTIMATE_STATUS_LABEL[e.status] ?? e.status}`}
            description={`공급가 ${e.supply.toLocaleString('ko-KR')}원`}
            actions={
              <Link href={`/admin/est/${pid}/v/${e.id}`} className="text-sm text-electric hover:underline">
                판 열기
              </Link>
            }
          >
            {rounds.map((r, ri) => {
              const st = mine.filter((a) => a.round === r).sort((a, b) => a.stepNo - b.stepNo)
              const submitter = st.find((a) => a.stepRole === 'writer')?.decidedBy
              return (
                <div key={r} className={cn('mb-4 flex flex-col gap-2', ri > 0 && 'opacity-70')}>
                  <span className="text-xs text-muted-foreground">{r}차 결재{ri > 0 ? '(이전)' : ''}</span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {st.map((a) => {
                      const can =
                        ri === 0 &&
                        a.status === 'pending' &&
                        e.status === 'approving' &&
                        s &&
                        submitter !== s.userId &&
                        (a.stepRole === 'ceo' ? s.estRole === 'ceo' : atLeast(s.estRole, 'reviewer'))
                      return (
                        <div key={a.id} className={cn('flex flex-col gap-2 bg-background p-3 ring-1', a.status === 'pending' ? 'ring-electric' : 'ring-border')}>
                          <span className="flex items-center justify-between gap-2">
                            <b className="text-sm">{a.stepNo}. {ROLE[a.stepRole] ?? a.stepRole}</b>
                            <Badge tone={ST[a.status]?.tone ?? 'muted'}>{ST[a.status]?.label ?? a.status}</Badge>
                          </span>
                          {a.decidedByName && (
                            <span className="text-xs text-muted-foreground">
                              {a.decidedByName} · {a.decidedAt ? new Date(a.decidedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : ''}
                            </span>
                          )}
                          {a.comment && <p className="text-sm">{a.comment}</p>}
                          {can && <ApprovalActions stepId={a.id} />}
                          {a.status === 'pending' && !can && <span className="text-xs text-muted-foreground">해당 역할이 결재할 차례(올린 사람은 결재 못함)</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {run && (
              <details className="border-t border-border pt-3 text-sm">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  자동 검사 결과({new Date(run.ranAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}) · {run.passed ? '통과' : '오류 있음'} · 경고 {run.results.filter((x) => x.severity !== 'error').length}
                </summary>
                <ul className="mt-2 flex flex-col gap-1 text-xs">
                  {run.results.map((x, i) => (
                    <li key={i} className={x.severity === 'error' ? 'text-destructive' : 'text-[color:var(--sb-warn)]'}>
                      {x.message}
                    </li>
                  ))}
                  {!run.results.length && <li className="text-muted-foreground">문제 없음</li>}
                </ul>
              </details>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              대표 단계가 &ldquo;생략&rdquo;이면 공급가가 대표 결재 기준 미만이라 검토자가 최종임 · 금액 <Money value={e.supply} />
            </p>
          </Card>
        )
      })}
    </div>
  )
}
