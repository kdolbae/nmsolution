import { after } from 'next/server'
import { pool } from '@/lib/db'
import { geoOf } from '@/lib/board-sync'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { KKT_CLIENT } from './seed-kkt'
import { notifyAdmin } from '@/lib/notify/telegram'

/**
 * 업체 페이지 접속 기록 (전 업체 공통). 화면은 어드민 업체 화면의 '접속 기록' 칸뿐이고 업체에는 보이지 않는다.
 *
 * - 서버가 남기는 것: 로그인 화면·로그인 성공/실패·열람·임시 링크 열람·PDF 다운로드·협력업체 포털 열람/인쇄
 *   (시각, IP, 기기, 지역, 들어온 곳, 관리자 본인 접속 여부)
 * - 열람 한 번마다 view_id 를 하나 주고, 페이지 안 스크립트(public/js/pv.js)가 그 줄에
 *   머문 시간·스크롤 깊이·구간별 머문 시간·클릭을 계속 덮어쓴다 (/api/pv).
 * 표는 첫 기록 때 생긴다(site_events 와 같은 방식).
 *
 * 고객에게 나가는 자료(업체 페이지·제안서·견적서·프레젠테이션 등)를 새로 만들면 반드시 붙인다:
 *   - HTML 응답: return new Response(trackedHtml(html, req.headers, 'slug'), …)  ← 열람 기록 + 행동 스크립트
 *   - 그 밖의 동작(로그인·PDF·견적 열기 등): after(() => logAccess(req.headers, null, 'pdf', { slug }))
 * client 를 모르면 null 로 두면 된다. slug(업체용 링크 주소)로 업체를 찾아 묶는다.
 */
let ready: Promise<void> | null = null

export function ensureAccessLog(): Promise<void> {
  if (!ready) {
    ready = pool
      .query(
        `CREATE TABLE IF NOT EXISTS client_access_log (
           id          bigint generated always as identity primary key,
           created_at  timestamptz not null default now(),
           updated_at  timestamptz,
           client_id   bigint,
           slug        text,
           kind        text not null,
           view_id     text unique,
           ip          text,
           ua          text,
           device      text,
           country     text,
           region      text,
           city        text,
           referrer    text,
           is_admin    boolean not null default false,
           seconds     integer,
           scroll      smallint,
           details     jsonb
         );
         CREATE INDEX IF NOT EXISTS client_access_log_client_idx ON client_access_log (client_id, created_at desc);`,
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}

export type AccessKind = 'login_page' | 'login_ok' | 'login_fail' | 'view' | 'share_view' | 'pdf' | 'portal_view' | 'portal_print' | 'quote_open' | 'send_view' | 'compare' | 'portal_file'

/** 업체용 링크 주소가 없는 업체(금강변압기 /kkt 는 따로 만든 페이지)는 이름으로 묶는다 */
const NAME_OF_SLUG: Record<string, string> = { kkt: KKT_CLIENT.name }

/** 휴대폰 알림을 보내는 기록 (로그인 화면·로그인 성공은 열람 알림과 겹쳐서 뺀다) */
const NOTIFY: Partial<Record<AccessKind, string>> = {
  view: '견적 열람',
  share_view: '임시 링크로 열람',
  portal_view: '포털에서 열람',
  pdf: 'PDF 다운로드',
  portal_print: '포털에서 인쇄',
  quote_open: '견적서 열기',
  send_view: '지난 견적 열람',
  compare: '견적 비교',
  portal_file: '포털에서 서류 내려받기',
  login_fail: '비밀번호 틀림',
}

const BOT = /bot|crawl|spider|slurp|yeti|daum|bingpreview|headless|lighthouse|facebookexternalhit|kakaotalk-scrap|preview/i

/** 사람이 읽을 수 있는 기기 요약: '휴대폰 · iOS · 카카오톡' 같은 꼴 */
export function deviceOf(ua: string): string {
  const kind = /ipad|tablet/i.test(ua) ? '태블릿' : /mobi|iphone|android/i.test(ua) ? '휴대폰' : 'PC'
  const os = /iphone|ipad|ipod/i.test(ua)
    ? 'iOS'
    : /android/i.test(ua)
      ? 'Android'
      : /windows/i.test(ua)
        ? 'Windows'
        : /mac os x|macintosh/i.test(ua)
          ? 'Mac'
          : /linux/i.test(ua)
            ? 'Linux'
            : ''
  const app = /kakaotalk/i.test(ua)
    ? '카카오톡'
    : /naver\(inapp|whale/i.test(ua)
      ? /whale/i.test(ua)
        ? '웨일'
        : '네이버앱'
      : /samsungbrowser/i.test(ua)
        ? '삼성 인터넷'
        : /edg\//i.test(ua)
          ? 'Edge'
          : /crios|chrome/i.test(ua)
            ? 'Chrome'
            : /fxios|firefox/i.test(ua)
              ? 'Firefox'
              : /safari/i.test(ua)
                ? 'Safari'
                : ''
  return [kind, os, app].filter(Boolean).join(' · ')
}

function ipOf(h: Headers): string | null {
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || ''
  return ip.slice(0, 64) || null
}

/** 기록 한 줄. 실패해도 업체 화면에는 영향이 없게 삼킨다. view 계열이면 만든 view_id 를 돌려준다 */
export async function logAccess(
  h: Headers,
  client: { id: number; portalSlug?: string | null } | null,
  kind: AccessKind,
  opts: {
    slug?: string
    viewId?: string
    details?: Record<string, unknown>
  } = {},
): Promise<void> {
  const ua = h.get('user-agent') || ''
  if (BOT.test(ua)) return
  try {
    await ensureAccessLog()
    // 관리자 본인 접속인지. 확인이 안 되면 업체 접속으로 남긴다
    const session = await getSessionFrom(h).catch(() => null)
    const g = geoOf(h)
    const admin = !!(session?.user && isAdmin(session.user))
    const ip = ipOf(h)
    const { rows } = await pool.query<{ client_id: string | null; name: string | null }>(
      `WITH ins AS (
         INSERT INTO client_access_log (client_id, slug, kind, view_id, ip, ua, device, country, region, city, referrer, is_admin, details)
         VALUES (COALESCE($1::bigint, (SELECT id FROM clients WHERE portal_slug = $2 LIMIT 1), (SELECT id FROM clients WHERE name = $14 ORDER BY id LIMIT 1)),
                 $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING client_id)
       SELECT ins.client_id, c.name FROM ins LEFT JOIN clients c ON c.id = ins.client_id`,
      [
        client?.id ?? null,
        opts.slug ?? client?.portalSlug ?? null,
        kind,
        opts.viewId ?? null,
        ip,
        ua.slice(0, 400),
        deviceOf(ua),
        g.country,
        g.region,
        g.city,
        (h.get('referer') || '').slice(0, 500) || null,
        admin,
        opts.details ? JSON.stringify(opts.details) : null,
        NAME_OF_SLUG[opts.slug ?? ''] ?? null,
      ],
    )
    // 업체가 견적을 열거나 PDF 를 받으면 관리자 휴대폰으로 바로 알린다 (관리자 본인 접속은 빼고)
    if (!admin && NOTIFY[kind]) {
      const r = rows[0]
      const who = r?.name || opts.slug || '업체'
      const when = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date())
      const member = typeof opts.details?.member === 'string' ? ` (${opts.details.member})` : ''
      await notifyAdmin(
        [
          `${who} · ${NOTIFY[kind]}${member}`,
          when,
          [deviceOf(ua), [g.region, g.city].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
          ip ? `IP ${ip}` : '',
          r?.client_id ? `https://nm-solution.co.kr/admin/clients/${r.client_id}/access` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
    }
  } catch (e) {
    console.error('client_access_log', e)
  }
}

/** 열람 기록 스크립트 태그 (React 화면은 next/script 로 같은 파일을 data-v 와 함께 넣는다) */
export const trackerTag = (viewId: string) => `<script src="/js/pv.js" data-v="${viewId}" defer></script>`

/** 고객용 HTML 에 열람 기록을 붙인다: 응답 뒤 '열람' 한 줄을 남기고, </body> 앞에 행동 기록 스크립트를 넣는다 */
export function trackedHtml(
  html: string,
  h: Headers,
  slug: string,
  opts: {
    client?: { id: number } | null
    kind?: AccessKind
    details?: Record<string, unknown>
  } = {},
): string {
  const viewId = crypto.randomUUID()
  after(() =>
    logAccess(h, opts.client ?? null, opts.kind ?? 'view', {
      slug,
      viewId,
      details: opts.details,
    }),
  )
  const tag = trackerTag(viewId)
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${tag}</body>`) : html + tag
}

/** 페이지 안 스크립트가 보낸 행동 기록으로 그 열람 줄을 덮어쓴다(서버가 남긴 send 같은 값은 남긴다). 12시간 지난 열람은 받지 않는다 */
export async function updateView(viewId: string, seconds: number, scroll: number, details: Record<string, unknown>) {
  await ensureAccessLog()
  await pool.query(
    `UPDATE client_access_log SET seconds = $2, scroll = $3, details = COALESCE(details, '{}'::jsonb) || $4::jsonb, updated_at = now()
      WHERE view_id = $1 AND created_at > now() - interval '12 hours'`,
    [viewId, seconds, scroll, JSON.stringify(details)],
  )
}

export type AccessRow = {
  id: number
  at: string
  kind: AccessKind
  ip: string | null
  device: string | null
  place: string | null
  referrer: string | null
  isAdmin: boolean
  seconds: number | null
  scroll: number | null
  details: {
    sections?: Record<string, number>
    clicks?: { t: number; label: string }[]
    events?: { t: number; label: string }[]
    member?: string
    docs?: string
    /** 본 발송 견적번호 (비교면 to 와 함께) */
    send?: string | null
    to?: string
    total?: number
    screen?: string
    lang?: string
    tz?: string
  } | null
}

export async function listAccess(clientId: number, limit = 300): Promise<AccessRow[]> {
  try {
    await ensureAccessLog()
    const { rows } = await pool.query(`SELECT * FROM client_access_log WHERE client_id = $1 ORDER BY created_at DESC LIMIT $2`, [clientId, limit])
    return rows.map((r) => ({
      id: Number(r.id),
      at: new Date(r.created_at).toISOString(),
      kind: r.kind,
      ip: r.ip,
      device: r.device,
      place: [r.region, r.city].filter(Boolean).join(' ') || r.country || null,
      referrer: r.referrer,
      isAdmin: r.is_admin,
      seconds: r.seconds,
      scroll: r.scroll,
      details: r.details,
    }))
  } catch (e) {
    console.error('client_access_log', e)
    return []
  }
}
