import { pool } from '@/lib/db'
import { normalizeQuote } from './quote'
import type { QuoteCase } from './quote-cases'
import { ensureSends } from './sends'

/**
 * 견적 사례 모음 (lib/clients/quote-cases.ts). 업체마다 지금 견적서 1개 + 발송 취소하지 않은 고객 발송본.
 * 발송본이 지금 견적과 공급가액·공사명이 같으면 하나만 남긴다(화면에서 같은 사례가 두 번 나오지 않게).
 */
export async function listQuoteCases(excludeClientId?: number): Promise<QuoteCase[]> {
  await ensureSends()
  const [clients, sends] = await Promise.all([
    pool.query<{ id: string; name: string; quote: unknown; updated_at: Date }>(`SELECT id, name, quote, updated_at FROM clients ORDER BY updated_at DESC`),
    pool.query<{ client_id: string; quote_number: string; send_no: number; sent_at: Date; quote: unknown }>(
      `SELECT client_id, quote_number, send_no, sent_at, quote FROM client_sends WHERE withdrawn_at IS NULL ORDER BY sent_at DESC`,
    ),
  ])
  const out: QuoteCase[] = []
  const seen = new Set<string>()
  const sig = (id: number, q: ReturnType<typeof normalizeQuote>) =>
    `${id}|${q.title}|${q.sections.map((s) => s.items.map((i) => `${i.name}${i.qty}${i.price}`).join()).join('/')}`
  for (const r of clients.rows) {
    const id = Number(r.id)
    if (id === excludeClientId || !r.quote) continue
    const quote = normalizeQuote(r.quote)
    if (!quote.sections.some((s) => s.items.length)) continue
    seen.add(sig(id, quote))
    out.push({ key: `${id}-now`, clientId: id, clientName: r.name, source: '지금 견적', quote })
  }
  const names = new Map(clients.rows.map((r) => [Number(r.id), r.name]))
  for (const r of sends.rows) {
    const id = Number(r.client_id)
    if (id === excludeClientId || !r.quote) continue
    const quote = normalizeQuote(r.quote)
    const s = sig(id, quote)
    if (seen.has(s)) continue
    seen.add(s)
    out.push({
      key: `${id}-send-${r.send_no}`,
      clientId: id,
      clientName: names.get(id) ?? '',
      source: `발송본 ${r.quote_number}`,
      sentAt: r.sent_at.toISOString(),
      quote,
    })
  }
  return out
}
