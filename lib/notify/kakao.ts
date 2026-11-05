import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { siteContent } from '@/lib/db/schema'

/**
 * 관리자 카카오톡 알림 ("나에게 보내기"). 무료이고 카카오 비즈 심사가 필요 없다.
 *
 * 켜는 법 (TRACKING.md 의 '문의 알림' 참고)
 *  1. developers.kakao.com 에서 앱을 만들고 REST API 키를 Vercel 변수 KAKAO_REST_API_KEY 에 넣는다
 *     (보안 → Client Secret 을 켰다면 KAKAO_CLIENT_SECRET 도)
 *  2. 카카오 로그인 활성화, Redirect URI 에 https://nm-solution.co.kr/api/admin/kakao/callback 등록,
 *     동의항목에서 '카카오톡 메시지 전송(talk_message)' 사용, 플랫폼 Web 도메인에 https://nm-solution.co.kr 등록
 *  3. 관리자 → 견적 문의 → '카카오톡 알림 연결' 을 눌러 kevin 카카오 계정으로 한 번 동의한다
 *
 * 동의하면 받은 refresh token 을 site_content('kakao_memo')에 저장해 두고 보낼 때마다 access token 을 새로 받는다.
 * refresh token 은 두 달짜리지만, 만료 한 달 전부터는 갱신 때 새 값이 와서 다시 저장되므로 문의가 오가는 동안은 계속 산다.
 */
const KEY = 'kakao_memo'

type Saved = { refreshToken: string; connectedAt: string; nickname?: string }

export function kakaoConfigured() {
  return !!process.env.KAKAO_REST_API_KEY
}

export async function kakaoSaved(): Promise<Saved | null> {
  try {
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, KEY)).limit(1)
    const d = row?.data as Partial<Saved> | undefined
    return d?.refreshToken ? (d as Saved) : null
  } catch {
    return null
  }
}

export async function kakaoSave(data: Saved | null) {
  if (!data) {
    await db.delete(siteContent).where(eq(siteContent.key, KEY))
    return
  }
  await db
    .insert(siteContent)
    .values({ key: KEY, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteContent.key, set: { data, updatedAt: new Date() } })
}

export function kakaoRedirectUri(origin: string) {
  return `${origin}/api/admin/kakao/callback`
}

export function kakaoAuthorizeUrl(origin: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY || '',
    redirect_uri: kakaoRedirectUri(origin),
    response_type: 'code',
    scope: 'talk_message',
    state,
  })
  return `https://kauth.kakao.com/oauth/authorize?${q}`
}

async function token(params: Record<string, string>) {
  const body = new URLSearchParams({ client_id: process.env.KAKAO_REST_API_KEY || '', ...params })
  if (process.env.KAKAO_CLIENT_SECRET) body.set('client_secret', process.env.KAKAO_CLIENT_SECRET)
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as { access_token?: string; refresh_token?: string; error_description?: string } | null
  if (!res.ok || !json?.access_token) throw new Error(json?.error_description || `kakao token ${res.status}`)
  return json
}

/** 관리자 동의 직후: code 를 refresh token 으로 바꿔 저장 */
export async function kakaoConnect(code: string, origin: string) {
  const t = await token({ grant_type: 'authorization_code', code, redirect_uri: kakaoRedirectUri(origin) })
  if (!t.refresh_token) throw new Error('refresh token 없음')
  let nickname: string | undefined
  try {
    const me = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: `Bearer ${t.access_token}` } })
    const j = (await me.json()) as { properties?: { nickname?: string } }
    nickname = j.properties?.nickname
  } catch {}
  await kakaoSave({ refreshToken: t.refresh_token, connectedAt: new Date().toISOString(), nickname })
}

/** 알림 한 통 (최대 200자). 실패해도 던지지 않는다 */
export async function notifyKakao(text: string, url: string): Promise<boolean> {
  if (!kakaoConfigured()) return false
  try {
    const saved = await kakaoSaved()
    if (!saved) return false
    const t = await token({ grant_type: 'refresh_token', refresh_token: saved.refreshToken })
    if (t.refresh_token && t.refresh_token !== saved.refreshToken) await kakaoSave({ ...saved, refreshToken: t.refresh_token })
    const template = {
      object_type: 'text',
      text: text.length > 200 ? `${text.slice(0, 197)}...` : text,
      link: { web_url: url, mobile_web_url: url },
      button_title: '문의 보기',
    }
    const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({ template_object: JSON.stringify(template) }),
    })
    if (!res.ok) console.error('[kakao] 발송 실패', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('[kakao]', e)
    return false
  }
}
