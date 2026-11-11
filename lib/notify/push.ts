import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { db, pool } from '@/lib/db'
import { siteContent } from '@/lib/db/schema'

/**
 * 휴대폰 푸시 알림 (웹 푸시). 따로 가입하거나 키를 넣을 필요가 없다.
 * - 서버 키(VAPID)는 처음 쓸 때 만들어 site_content('vapid')에 둔다. Vercel 변수 VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 가 있으면 그것을 쓴다.
 * - 관리자: 관리자 → 견적 문의 → '이 휴대폰으로 알림 받기'. 안드로이드 크롬은 바로, 아이폰은 사파리 공유 → '홈 화면에 추가'로 연 뒤 눌러야 한다(iOS 16.4+).
 * - 손님: 간단 문의 접수 뒤 '답장 오면 알림 받기'를 누르면 그 문의의 답장만 받는다.
 */
type Keys = { publicKey: string; privateKey: string }
let keys: Promise<Keys> | null = null

export function vapidKeys(): Promise<Keys> {
  if (!keys) {
    keys = (async () => {
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
        return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
      const [row] = await db.select().from(siteContent).where(eq(siteContent.key, 'vapid')).limit(1)
      const saved = row?.data as Partial<Keys> | undefined
      if (saved?.publicKey && saved.privateKey) return saved as Keys
      const g = webpush.generateVAPIDKeys()
      const k = { publicKey: g.publicKey, privateKey: g.privateKey }
      // 여러 인스턴스가 동시에 만들면 먼저 저장된 것을 쓴다
      await db.insert(siteContent).values({ key: 'vapid', data: k, updatedAt: new Date() }).onConflictDoNothing()
      const [again] = await db.select().from(siteContent).where(eq(siteContent.key, 'vapid')).limit(1)
      return (again?.data as Keys) ?? k
    })().catch((e) => {
      keys = null
      throw e
    })
  }
  return keys
}

let ready: Promise<void> | null = null
function ensurePushTable(): Promise<void> {
  if (!ready) {
    ready = pool
      .query(
        `CREATE TABLE IF NOT EXISTS push_subscriptions (
           id         serial PRIMARY KEY,
           endpoint   text NOT NULL UNIQUE,
           p256dh     text NOT NULL,
           auth       text NOT NULL,
           role       text NOT NULL CHECK (role IN ('admin','customer')),
           quote_id   integer,
           label      text NOT NULL DEFAULT '',
           created_at timestamptz NOT NULL DEFAULT now()
         );`,
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } }

export function validSub(v: unknown): v is PushSub {
  const s = v as PushSub
  return !!s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 &&
    typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string'
}

export async function saveSubscription(sub: PushSub, role: 'admin' | 'customer', quoteId: number | null, label = '') {
  await ensurePushTable()
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, role, quote_id, label) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3, role = $4, quote_id = $5, label = $6`,
    [sub.endpoint, sub.keys.p256dh, sub.keys.auth, role, quoteId, label.slice(0, 100)],
  )
}

export async function removeSubscription(endpoint: string) {
  await ensurePushTable()
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint])
}

export async function adminDeviceCount(): Promise<number> {
  try {
    await ensurePushTable()
    const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM push_subscriptions WHERE role = 'admin'`)
    return rows[0]?.n ?? 0
  } catch {
    return 0
  }
}

type Payload = { title: string; body: string; url: string; tag?: string }

async function sendTo(where: string, params: unknown[], payload: Payload) {
  try {
    await ensurePushTable()
    const { rows } = await pool.query<{ endpoint: string; p256dh: string; auth: string }>(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE ${where}`,
      params,
    )
    if (!rows.length) return
    const k = await vapidKeys()
    webpush.setVapidDetails('mailto:sbkim@nm-solution.co.kr', k.publicKey, k.privateKey)
    const data = JSON.stringify({ ...payload, body: payload.body.slice(0, 300) })
    await Promise.all(
      rows.map((r) =>
        webpush
          .sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, data, { TTL: 60 * 60 * 24, urgency: 'high' })
          .catch(async (e: { statusCode?: number }) => {
            // 앱을 지웠거나 권한을 끈 기기는 지운다
            if (e?.statusCode === 404 || e?.statusCode === 410) await removeSubscription(r.endpoint)
            else console.error('[push] 발송 실패', e?.statusCode, e)
          }),
      ),
    )
  } catch (e) {
    console.error('[push]', e)
  }
}

export function pushAdmins(payload: Payload) {
  return sendTo(`role = 'admin'`, [], payload)
}

export function pushCustomer(quoteId: number, payload: Payload) {
  return sendTo(`role = 'customer' AND quote_id = $1`, [quoteId], payload)
}
