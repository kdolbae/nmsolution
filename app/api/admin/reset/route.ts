import { createHash, timingSafeEqual } from 'node:crypto'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * 관리자 계정 초기화 — 비밀번호를 잊었을 때 (2026-09-30 사업주 요청).
 *
 * 이 사이트는 관리자 1명만 가입할 수 있고 비밀번호 찾기가 없다. 그래서 Vercel 환경변수
 * ADMIN_RESET_TOKEN(24자 이상)을 아는 사람만 기존 관리자 계정을 지울 수 있게 한다.
 * 지우면 /admin/login 이 다시 '관리자 계정 만들기' 화면이 되고, 그때 새로 만든다.
 * 콘텐츠 · 시공사례 · 견적 문의는 건드리지 않는다 (지우는 것은 user · session · account · verification 뿐).
 *
 * 값이 없거나 24자보다 짧으면 이 기능은 꺼져 있다(404). 쓰고 나면 환경변수를 지운다.
 */
const tries = new Map<string, { n: number; t: number }>()
const WINDOW_MS = 10 * 60_000
const MAX_TRIES = 5

const digest = (s: string) => createHash('sha256').update(s).digest()

export async function POST(req: Request) {
  const secret = process.env.ADMIN_RESET_TOKEN || ''
  if (secret.length < 24) return new Response('Not Found', { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const rec = tries.get(ip)
  const cur = rec && now - rec.t < WINDOW_MS ? rec : { n: 0, t: now }
  if (cur.n >= MAX_TRIES) {
    return Response.json({ ok: false, error: '시도가 너무 많습니다. 10분 뒤 다시 해 주세요.' }, { status: 429 })
  }
  tries.set(ip, { n: cur.n + 1, t: cur.t })

  const body = (await req.json().catch(() => null)) as { token?: unknown } | null
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token || !timingSafeEqual(digest(token), digest(secret))) {
    return Response.json({ ok: false, error: '초기화 코드가 맞지 않습니다.' }, { status: 403 })
  }

  try {
    // session · account 는 user 를 지우면 같이 지워진다 (ON DELETE CASCADE)
    const { rowCount } = await pool.query('DELETE FROM "user"')
    await pool.query('DELETE FROM verification')
    console.warn(`[admin-reset] 관리자 계정 ${rowCount ?? 0}개를 지웠다`)
    tries.delete(ip)
    return Response.json({ ok: true, removed: rowCount ?? 0 })
  } catch (e) {
    console.error('[admin-reset] 실패', e)
    return Response.json({ ok: false, error: '초기화 중 문제가 발생했습니다.' }, { status: 500 })
  }
}
