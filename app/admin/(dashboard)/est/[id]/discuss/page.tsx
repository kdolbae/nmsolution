import Link from 'next/link'
import { Comments } from '@/components/est/comments'
import { Card, Empty, TableWrap, tdCls, thCls, won } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { getEstimateDetail, listComments, listEstimates, type EstimateDetail } from '@/lib/est/data'
import { getSettings } from '@/lib/est/settings'
import { profitView } from '@/lib/est/perm'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Key = string
const keyOf = (l: { itemCode: string | null; name: string; kind: string }) => l.itemCode ?? `${l.kind}:${l.name}`

function lineMap(d: EstimateDetail) {
  const m = new Map<Key, { name: string; qty: number; unitPrice: number; amount: number }>()
  for (const s of d.sections) {
    if (s.isOption) continue
    for (const l of s.lines) {
      if (l.removed) continue
      const k = keyOf(l)
      const cur = m.get(k)
      const amount = Math.round(l.qty * l.unitPrice)
      m.set(k, cur ? { ...cur, qty: cur.qty + l.qty, amount: cur.amount + amount } : { name: l.name, qty: l.qty, unitPrice: l.unitPrice, amount })
    }
  }
  return m
}

/** S7 토의: 판별 댓글 + 판 비교(줄 차이·합계·이익) */
export default async function Discuss({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ a?: string; b?: string }> }) {
  const pid = Number((await params).id)
  const sp = await searchParams
  const [s, estimates, comments, settings] = await Promise.all([estPageSession(), listEstimates(pid), listComments(pid), getSettings()])
  if (!estimates.length) return <Empty>판이 생기면 판별로 토의할 수 있음</Empty>
  const view = profitView(s?.estRole, settings)
  const details = await Promise.all(estimates.map((e) => getEstimateDetail(e.id)))
  const lines: Record<number, { id: number; name: string }[]> = {}
  details.forEach((d) => {
    if (d) lines[d.estimate.id] = d.sections.flatMap((x) => x.lines).map((l) => ({ id: l.id, name: l.name }))
  })
  const aId = Number(sp.a) || estimates.at(-2)?.id || estimates[0].id
  const bId = Number(sp.b) || estimates.at(-1)!.id
  const A = details.find((d) => d?.estimate.id === aId) ?? null
  const B = details.find((d) => d?.estimate.id === bId) ?? null
  const label = (id: number) => estimates.find((e) => e.id === id)?.label || `v${estimates.find((e) => e.id === id)?.versionNo}`

  let diff: { key: string; name: string; a?: { qty: number; amount: number }; b?: { qty: number; amount: number } }[] = []
  if (A && B && A.estimate.id !== B.estimate.id) {
    const ma = lineMap(A)
    const mb = lineMap(B)
    for (const k of new Set([...ma.keys(), ...mb.keys()])) {
      const a = ma.get(k)
      const b = mb.get(k)
      if (a && b && a.qty === b.qty && a.amount === b.amount) continue
      diff.push({ key: k, name: (a ?? b)!.name, a, b })
    }
    diff = diff.sort((x, y) => Math.abs((y.b?.amount ?? 0) - (y.a?.amount ?? 0)) - Math.abs((x.b?.amount ?? 0) - (x.a?.amount ?? 0)))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="댓글">
        <Comments estimates={estimates.map((e) => ({ id: e.id, label: e.label || `v${e.versionNo}` }))} lines={lines} comments={comments} />
      </Card>
      <Card title="판 비교" description="두 판의 줄 차이·합계·이익">
        {estimates.length < 2 ? (
          <Empty>판이 두 개 이상이면 비교할 수 있음(편집기에서 복제)</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1 text-sm">
              {estimates.map((e) => (
                <span key={e.id} className="flex gap-1">
                  <Link href={`?a=${e.id}&b=${bId}`} className={cn('border px-2 py-1', e.id === aId ? 'border-navy bg-navy text-navy-foreground' : 'border-border')}>
                    A:{e.label}
                  </Link>
                  <Link href={`?a=${aId}&b=${e.id}`} className={cn('border px-2 py-1', e.id === bId ? 'border-electric bg-electric text-electric-foreground' : 'border-border')}>
                    B:{e.label}
                  </Link>
                </span>
              ))}
            </div>
            {A && B && (
              <TableWrap>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className={thCls}>항목</th>
                      <th className={thCls + ' text-right'}>{label(aId)}</th>
                      <th className={thCls + ' text-right'}>{label(bId)}</th>
                      <th className={thCls + ' text-right'}>차이</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['공급가', A.estimate.supply, B.estimate.supply],
                      ['합계(VAT 포함)', A.estimate.total, B.estimate.total],
                      ...(view === 'amount' ? [['예상이익', A.estimate.expectedProfit, B.estimate.expectedProfit] as const] : []),
                    ].map(([k, a, b]) => (
                      <tr key={k as string} className="font-semibold">
                        <td className={tdCls}>{k}</td>
                        <td className={tdCls + ' text-right font-mono'}>{won(a as number)}</td>
                        <td className={tdCls + ' text-right font-mono'}>{won(b as number)}</td>
                        <td className={tdCls + ' text-right font-mono'}>{won((b as number) - (a as number))}</td>
                      </tr>
                    ))}
                    {view !== 'none' && (
                      <tr className="font-semibold">
                        <td className={tdCls}>예상이익률</td>
                        <td className={tdCls + ' text-right font-mono'}>{A.estimate.marginPct}%</td>
                        <td className={tdCls + ' text-right font-mono'}>{B.estimate.marginPct}%</td>
                        <td className={tdCls + ' text-right font-mono'}>{Math.round((B.estimate.marginPct - A.estimate.marginPct) * 10) / 10}%p</td>
                      </tr>
                    )}
                    {diff.map((d) => (
                      <tr key={d.key}>
                        <td className={tdCls}>{d.name}</td>
                        <td className={tdCls + ' text-right font-mono text-xs'}>{d.a ? `${d.a.qty} · ${won(d.a.amount)}` : '없음'}</td>
                        <td className={tdCls + ' text-right font-mono text-xs'}>{d.b ? `${d.b.qty} · ${won(d.b.amount)}` : '없음'}</td>
                        <td className={tdCls + ' text-right font-mono text-xs'}>{won((d.b?.amount ?? 0) - (d.a?.amount ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
