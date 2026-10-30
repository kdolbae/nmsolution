import { hasKktAccess, isKktPassword } from '@/lib/kkt-access'
import { cookieValue, NO_STORE } from '../http'
import { publicQuoteHtml } from '@/lib/clients/kkt-public-quote'
import { KKT_CLIENT, KKT_QUOTE_1019 } from '@/lib/clients/seed-kkt'
import { latestSend } from '@/lib/clients/sends'
import { pool } from '@/lib/db'
import { logAccess } from '@/lib/clients/access-log'
import { after } from 'next/server'

/**
 * 견적서 본문. 페이지 맨 아래 잠금 칸에서 비밀번호를 넣을 때마다 POST 로 받아 간다.
 * 쿠키를 남기지 않으므로 열 때마다 다시 입력해야 한다. 페이지 접근 쿠키가 없으면 없는 주소처럼 404.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await hasKktAccess(cookieValue(req)))) {
    return new Response('Not Found', { status: 404, headers: NO_STORE })
  }
  const form = await req.formData().catch(() => null)
  const ok = await isKktPassword(String(form?.get('password') ?? ''))
  after(() => logAccess(req.headers, null, ok ? 'quote_open' : 'login_fail', { slug: 'kkt', details: { what: '견적서 잠금 칸' } }))
  if (!ok) {
    await new Promise((r) => setTimeout(r, 1500))
    return new Response('', { status: 401, headers: NO_STORE })
  }
  return new Response(publicQuoteHtml(await sentQuote()), { headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } })
}

/** 고객에게는 어드민에서 확정한 최신 발송본만 보인다. 발송본이 없으면 2026-10-19 최종안 */
async function sentQuote() {
  try {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
    const send = rows[0] && (await latestSend(Number(rows[0].id)))
    if (send) return send.quote
  } catch {}
  return KKT_QUOTE_1019
}
