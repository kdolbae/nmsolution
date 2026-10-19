import Link from 'next/link'
import { estPageSession } from '@/lib/session'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/admin/form'
import { Badge, btnCls, Empty, inputCls, Money, selectCls, TableWrap, tdCls, thCls } from '@/components/est/ui'
import { kstToday, listLedger } from '@/lib/est/data'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: '견적 대장 | NM SOLUTION 관리자' }

const RESULT: Record<string, string> = { won: '수주', lost: '실패', hold: '보류' }

/** S12 견적 대장(est_ledger 뷰) */
export default async function Ledger({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; result?: string; client?: string }> }) {
  await estPageSession()
  const f = await searchParams
  const clean = { from: /^\d{4}-\d{2}-\d{2}$/.test(f.from ?? '') ? f.from : undefined, to: /^\d{4}-\d{2}-\d{2}$/.test(f.to ?? '') ? f.to : undefined, result: ['won', 'lost', 'hold', 'none'].includes(f.result ?? '') ? f.result : undefined, client: f.client?.slice(0, 100) || undefined }
  const rows = await listLedger(clean)
  const today = Date.parse(kstToday())
  const qs = new URLSearchParams(Object.entries(clean).filter(([, v]) => v) as [string, string][]).toString()
  return (
    <>
      <PageHeader title="견적 대장" description="제출한 견적의 기록(제출 기록이 생기면 자동으로 올라감)">
        <a href={`/api/admin/est/ledger${qs ? `?${qs}` : ''}`} className={btnCls('outline')}>
          <Download className="size-4" />
          CSV 내려받기
        </a>
      </PageHeader>
      <form className="mb-4 grid gap-2 bg-background p-3 ring-1 ring-border sm:grid-cols-5" method="get">
        <input type="date" name="from" defaultValue={clean.from} className={inputCls} aria-label="제출일 시작" />
        <input type="date" name="to" defaultValue={clean.to} className={inputCls} aria-label="제출일 끝" />
        <select name="result" defaultValue={clean.result ?? ''} className={selectCls} aria-label="결과">
          <option value="">결과 전체</option>
          <option value="none">결과 없음</option>
          <option value="won">수주</option>
          <option value="lost">실패</option>
          <option value="hold">보류</option>
        </select>
        <input name="client" defaultValue={clean.client} placeholder="발주처" className={inputCls} />
        <button type="submit" className={btnCls('primary')}>
          찾기
        </button>
      </form>
      {!rows.length ? (
        <Empty>제출 기록이 없음</Empty>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[960px] border-collapse bg-background text-sm ring-1 ring-border">
            <thead>
              <tr>
                <th className={thCls}>제출일</th>
                <th className={thCls}>번호</th>
                <th className={thCls}>발주처</th>
                <th className={thCls}>제목</th>
                <th className={thCls}>판</th>
                <th className={thCls + ' text-right'}>공급가</th>
                <th className={thCls + ' text-right'}>VAT</th>
                <th className={thCls + ' text-right'}>합계</th>
                <th className={thCls}>유효기간</th>
                <th className={thCls}>결과</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = Math.round((Date.parse(r.validUntil) - today) / 86400000)
                const expired = d < 0
                return (
                  <tr key={r.submissionId} className={cn(expired && !r.result && 'text-muted-foreground')}>
                    <td className={tdCls + ' font-mono text-xs'}>{new Date(r.submittedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                    <td className={tdCls + ' font-mono text-xs'}>{r.customerNumber ?? r.number}</td>
                    <td className={tdCls}>{r.clientName ?? '-'}</td>
                    <td className={tdCls}>
                      <Link href={`/admin/est/${r.projectId}`} className="hover:text-electric">
                        {r.title}
                      </Link>
                    </td>
                    <td className={tdCls}>{r.label || `v${r.versionNo}`}</td>
                    <td className={tdCls + ' text-right'}><Money value={r.supply} /></td>
                    <td className={tdCls + ' text-right'}><Money value={r.vat} /></td>
                    <td className={tdCls + ' text-right'}><Money value={r.total} /></td>
                    <td className={tdCls + ' whitespace-nowrap text-xs'}>
                      {r.validUntil} <span className="font-mono">{expired ? '만료' : `D-${d}`}</span>
                    </td>
                    <td className={tdCls}>{r.result ? <Badge tone={r.result === 'won' ? 'ok' : r.result === 'lost' ? 'danger' : 'muted'}>{RESULT[r.result]}</Badge> : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  )
}
