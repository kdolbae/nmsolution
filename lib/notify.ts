import { createHmac, randomBytes } from 'node:crypto'
import { phoneDigits } from '@/lib/quote'

/**
 * 견적 문의가 저장되면 사업주에게 알린다. 아무 키도 없으면 아무것도 하지 않는다(사이트는 그대로 돈다).
 *
 * 두 갈래이고 둘 다 환경변수로만 켠다 — 이 저장소는 공개라 키·번호를 코드에 두지 않는다.
 *
 *  1) 폰 푸시(ntfy)      NTFY_TOPIC  [NTFY_SERVER]
 *     앱 하나만 깔고 주제 이름을 구독하면 된다. 가입·검수가 없어 바로 켠다.
 *     ntfy 는 외부 서비스라 **연락처·이름은 싣지 않는다**. 분야·지역·접수 번호와 관리자 링크만 간다.
 *  2) 솔라피(문자·알림톡) SOLAPI_API_KEY SOLAPI_API_SECRET SOLAPI_SENDER NOTIFY_PHONE
 *     [SOLAPI_PF_ID SOLAPI_TEMPLATE_ID]
 *     사업주 본인 휴대폰으로 가므로 이름·연락처·문의 첫 줄을 싣는다.
 *     PF_ID·TEMPLATE_ID 가 있으면 알림톡으로 보내고, 알림톡이 안 닿으면 같은 요청 안에서 문자로 대신 간다.
 *
 * 접수 흐름을 막지 않는다: 호출하는 쪽이 after() 안에서 부르고, 여기서는 던지지 않는다.
 * 비용이 새지 않게 한 서버 인스턴스에서 한 시간에 20건까지만 보낸다(스팸 폼 대비).
 */

export type QuoteNotice = {
  id: number
  name: string
  phone: string
  location: string
  categories: string
  message: string
  /** 사진 견적(/leak)이면 'photo' */
  kind?: 'quote' | 'photo'
}

export type NotifyResult = { channel: 'ntfy' | 'solapi'; ok: boolean; detail?: string }

const TIMEOUT_MS = 6000
const HOURLY_CAP = 20
const sent: number[] = []

function underCap(): boolean {
  const now = Date.now()
  while (sent.length && now - sent[0] > 3_600_000) sent.shift()
  if (sent.length >= HOURLY_CAP) return false
  sent.push(now)
  return true
}

const env = (k: string) => (process.env[k] || '').trim()

export function notifyConfigured() {
  return {
    ntfy: !!env('NTFY_TOPIC'),
    solapi: !!(env('SOLAPI_API_KEY') && env('SOLAPI_API_SECRET') && env('SOLAPI_SENDER') && env('NOTIFY_PHONE')),
    alimtalk: !!(env('SOLAPI_PF_ID') && env('SOLAPI_TEMPLATE_ID')),
  }
}

function adminUrl(): string {
  const base = (env('NEXT_PUBLIC_SITE_URL') || 'https://www.nm-solution.co.kr').replace(/\/+$/, '')
  return `${base}/admin/quotes`
}

/** 사진 견적 본문 머리("[사진 견적 · 사진 3장 · leak_photo]")를 떼고 사람이 쓴 부분만 */
function bodyOf(message: string): string {
  return message.replace(/^\[사진 견적[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim()
}

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

/** 연락처를 칸으로 읽기 좋게: 01012345678 → 010-1234-5678 */
export function prettyPhone(phone: string): string {
  const d = phoneDigits(phone)
  if (/^01\d{9}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (/^01\d{8}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return d
}

export function smsText(q: QuoteNotice): string {
  const head = q.kind === 'photo' ? '새 사진 견적' : '새 견적 문의'
  const lines = [
    `[엔엠솔루션] ${head}`,
    `${q.name} ${prettyPhone(q.phone)}`,
    [q.categories, q.location].filter(Boolean).join(' · '),
    clip(bodyOf(q.message), 60),
    adminUrl(),
  ]
  return lines.filter(Boolean).join('\n')
}

async function sendNtfy(q: QuoteNotice): Promise<NotifyResult> {
  const topic = env('NTFY_TOPIC')
  const server = (env('NTFY_SERVER') || 'https://ntfy.sh').replace(/\/+$/, '')
  // JSON 으로 올려야 제목·본문의 한글이 헤더 인코딩에 걸리지 않는다.
  const res = await fetch(server, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      title: q.kind === 'photo' ? '새 사진 견적이 왔습니다' : '새 견적 문의가 왔습니다',
      message: [`#${q.id}`, [q.categories, q.location].filter(Boolean).join(' · ')].filter(Boolean).join('\n'),
      click: adminUrl(),
      priority: 4,
      tags: ['incoming_envelope'],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return res.ok ? { channel: 'ntfy', ok: true } : { channel: 'ntfy', ok: false, detail: `HTTP ${res.status}` }
}

async function sendSolapi(q: QuoteNotice): Promise<NotifyResult> {
  const apiKey = env('SOLAPI_API_KEY')
  const secret = env('SOLAPI_API_SECRET')
  const date = new Date().toISOString()
  const salt = randomBytes(16).toString('hex')
  const signature = createHmac('sha256', secret).update(date + salt).digest('hex')

  const pfId = env('SOLAPI_PF_ID')
  const templateId = env('SOLAPI_TEMPLATE_ID')
  const message: Record<string, unknown> = {
    to: phoneDigits(env('NOTIFY_PHONE')),
    from: phoneDigits(env('SOLAPI_SENDER')),
    text: smsText(q),
  }
  if (pfId && templateId) {
    // 알림톡 템플릿(검수 통과본)의 변수 이름과 같아야 한다. docs/NOTIFY.md 의 문구 참고.
    message.kakaoOptions = {
      pfId,
      templateId,
      variables: {
        '#{이름}': q.name,
        '#{연락처}': prettyPhone(q.phone),
        '#{분야}': clip(q.categories || '미선택', 40),
        '#{지역}': clip(q.location || '미입력', 40),
        '#{주소}': adminUrl(),
      },
    }
  }

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.ok) return { channel: 'solapi', ok: true }
  // 오류 본문에는 번호가 안 들어오지만, 로그에는 코드·문구만 남긴다.
  const err = (await res.json().catch(() => null)) as { errorCode?: string; errorMessage?: string } | null
  return { channel: 'solapi', ok: false, detail: `HTTP ${res.status} ${err?.errorCode ?? ''} ${err?.errorMessage ?? ''}`.trim() }
}

/** 켜져 있는 수단으로 모두 보낸다. 던지지 않고 수단별 결과를 돌려준다. */
export async function notifyQuote(q: QuoteNotice, opts: { bypassCap?: boolean } = {}): Promise<NotifyResult[]> {
  const on = notifyConfigured()
  if (!on.ntfy && !on.solapi) return []
  if (!opts.bypassCap && !underCap()) {
    console.error('[notify] 한 시간 발송 한도(20건)를 넘어 보내지 않았습니다.')
    return []
  }
  const jobs: Promise<NotifyResult>[] = []
  if (on.ntfy) jobs.push(sendNtfy(q).catch((e) => ({ channel: 'ntfy' as const, ok: false, detail: String(e?.name || e) })))
  if (on.solapi) jobs.push(sendSolapi(q).catch((e) => ({ channel: 'solapi' as const, ok: false, detail: String(e?.name || e) })))
  const results = await Promise.all(jobs)
  for (const r of results) if (!r.ok) console.error(`[notify] ${r.channel} 실패 (문의 #${q.id}): ${r.detail ?? ''}`)
  return results
}
