import { canEnterAdmin, getAppSessionFrom } from '@/lib/session'
import { kstToday, listLedger } from '@/lib/est/data'

export const dynamic = 'force-dynamic'

const RESULT: Record<string, string> = { won: '수주', lost: '실패', hold: '보류' }
const CH: Record<string, string> = { print: '인쇄', pdf: 'PDF', email: '메일', kakao: '카카오톡', portal: '포털', other: '기타' }

/** 셀 하나: 쉼표·따옴표·줄바꿈 감싸기 + 수식 주입(=,+,-,@) 막기 */
function cell(v: unknown): string {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** S12 견적 대장 CSV(엑셀용 BOM) */
export async function GET(req: Request) {
  const s = await getAppSessionFrom(req.headers).catch(() => null)
  if (!canEnterAdmin(s) || !s?.estRole) return new Response('로그인이 필요함', { status: 401 })
  const q = new URL(req.url).searchParams
  const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
  const result = q.get('result')
  const rows = await listLedger({ from: date(q.get('from')), to: date(q.get('to')), result: result && ['won', 'lost', 'hold', 'none'].includes(result) ? result : undefined, client: q.get('client')?.slice(0, 100) || undefined })
  const head = ['제출일', '번호', '고객 번호', '발주처', '제목', '판', '공급가', 'VAT', '합계', '유효기간', '채널', '결과']
  const lines = rows.map((r) =>
    [
      new Date(r.submittedAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
      r.number,
      r.customerNumber ?? '',
      r.clientName ?? '',
      r.title,
      r.label || `v${r.versionNo}`,
      r.supply,
      r.vat,
      r.total,
      r.validUntil,
      CH[r.channel] ?? r.channel,
      r.result ? RESULT[r.result] : '',
    ]
      .map(cell)
      .join(','),
  )
  const body = '﻿' + [head.join(','), ...lines].join('\r\n')
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`견적대장_${kstToday()}.csv`)}`,
      'Cache-Control': 'no-store',
    },
  })
}
