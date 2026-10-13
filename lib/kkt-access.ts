/**
 * 금강변압기 제출 자료(/금강변압기, /kkt) 접근 비밀번호.
 *
 * 비밀번호는 환경변수 KKT_PASSWORD 에 둔다. 값이 없으면 아무도 들어갈 수 없다(닫힌 쪽이 기본).
 * 통과하면 비밀번호에서 만든 해시를 쿠키에 넣고, 페이지(app/kkt/route.ts)와
 * 이미지·영상(proxy.ts, /kkt-assets) 모두 이 쿠키를 확인한다. 비밀번호를 바꾸면 기존 쿠키는 무효가 된다.
 * proxy 에서도 쓰므로 Node 전용 API 없이 Web Crypto 만 쓴다.
 */

export const KKT_COOKIE = 'kkt_access'
export const KKT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function kktToken(): Promise<string | null> {
  const password = process.env.KKT_PASSWORD
  if (!password) return null
  return sha256Hex(`kkt-access:v1:${password}`)
}

export async function isKktPassword(input: string): Promise<boolean> {
  const password = process.env.KKT_PASSWORD
  if (!password) return false
  // 길이·내용 비교를 해시끼리 해서 입력값에 따라 비교 시간이 달라지지 않게 한다
  const [a, b] = await Promise.all([sha256Hex(input), sha256Hex(password)])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function hasKktAccess(cookieValue: string | undefined): Promise<boolean> {
  const token = await kktToken()
  return Boolean(token && cookieValue && cookieValue === token)
}
