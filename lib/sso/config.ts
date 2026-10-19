/**
 * SBworks SSO 수신(RP) 환경변수. 기획서 §3.5.
 * SBWORKS_SSO_ISSUER(https://sbworks.bond) · SBWORKS_SSO_JWKS_URL · SSO_APP_ID(nmsolution)
 * SSO_STATE_SECRET(32바이트 이상, state·세션 쿠키 HMAC) · SSO_ENABLED(1 기본) · LOCAL_LOGIN_ENABLED(1 기본)
 */

const flag = (v: string | undefined, dflt: boolean) => (v === undefined || v.trim() === '' ? dflt : v.trim() === '1' || v.trim().toLowerCase() === 'true')

export function ssoIssuer(): string {
  return (process.env.SBWORKS_SSO_ISSUER || 'https://sbworks.bond').replace(/\/+$/, '')
}

export function ssoJwksUrl(): string {
  return process.env.SBWORKS_SSO_JWKS_URL || `${ssoIssuer()}/api/public/sso/jwks`
}

export function ssoAppId(): string {
  return process.env.SSO_APP_ID || 'nmsolution'
}

/** state·세션 쿠키 서명 비밀. 32자 미만이면 SSO 를 켜지 않음 */
export function ssoStateSecret(): string | null {
  const s = process.env.SSO_STATE_SECRET || ''
  return s.length >= 32 ? s : null
}

/** SSO 사용 여부: SSO_ENABLED(기본 1) 이고 비밀값이 있을 때 */
export function ssoEnabled(): boolean {
  return flag(process.env.SSO_ENABLED, true) && ssoStateSecret() !== null
}

/** 로컬 로그인(관리자 setup·/portal/login 링크)을 관리자 경로에 보일지. 전환기 기본 1 */
export function localLoginEnabled(): boolean {
  return flag(process.env.LOCAL_LOGIN_ENABLED, true)
}

export const STATE_COOKIE = 'nm_sso_state'
export const NEXT_COOKIE = 'nm_sso_next'
export const SESSION_COOKIE = 'nm_sso'

/** 오류 코드 → 로그인 화면 한 줄 문구 (§3.8) */
export const SSO_ERRORS: Record<string, string> = {
  sso_disabled: 'SBworks 로그인이 꺼져 있음.',
  state_mismatch: '로그인 요청이 만료되었거나 다른 창에서 시작됨.',
  bad_signature: 'SBworks 로그인 확인(서명)에 실패함.',
  expired: 'SBworks 로그인 시간이 지남.',
  bad_claims: 'SBworks 로그인 정보가 올바르지 않음.',
  nonce_mismatch: '로그인 요청이 맞지 않음.',
  replayed: '이미 쓴 로그인 정보임.',
  no_membership: '엔엠솔루션 소속이 아님. 관리자에게 문의해야 함.',
  no_role: '이 역할로는 견적 시스템에 들어올 수 없음. 관리자에게 문의해야 함.',
  jwks_unavailable: 'SBworks 서명 키를 가져오지 못함.',
  server_error: '로그인 처리 중 오류가 남.',
}

/** 로그인 뒤 갈 곳: /admin 하위만 허용 */
export function safeNext(v: string | null | undefined): string {
  if (!v || typeof v !== 'string') return '/admin'
  if (!v.startsWith('/admin') || v.startsWith('//') || v.includes('\\') || /[\r\n]/.test(v)) return '/admin'
  if (v !== '/admin' && !v.startsWith('/admin/') && !v.startsWith('/admin?')) return '/admin'
  return v
}
