import { auth, partnerSignup } from '@/lib/auth'
import { isAdminEmail } from '@/lib/auth-roles'
import { mailLayout, sendMail } from '@/lib/mail'
import { siteUrl } from '@/lib/site'
import { getClient } from '@/lib/clients/table'
import {
  addMember,
  deletePartnerUser,
  emailTaken,
  endSessions,
  isPhone,
  memberAccount,
  phoneDigits,
  setMemberStatus,
  setPasswordHash,
  type MemberStatus,
} from '@/lib/portal/members'

/**
 * 협력업체 포털 관리(관계자 승인·계정 만들기·비밀번호 되돌리기). 권한 확인은 부르는 쪽이 한다.
 * 엔엠 어드민을 닫은 뒤에는 N-CMS(sbworks.bond) 업체 화면이 /api/sbworks/portal 로 이 함수들을 부른다.
 */

/** 가입 승인 요청 메일의 「승인하러 가기」 주소: N-CMS 업체 화면(엔엠 업체 번호로 찾아 넘겨 줌) */
export const approveUrl = (clientId: number) =>
  `${(process.env.SBWORKS_URL || 'https://sbworks.bond').replace(/\/$/, '')}/people/companies/nm/${clientId}`

/** 승인 · 중지 · 대기로. 승인하면 관계자에게 메일을 보낸다 */
export async function changeStatus(memberId: number, status: MemberStatus, by: string) {
  if (!['approved', 'suspended', 'pending'].includes(status)) throw new Error('잘못된 상태')
  const m = await setMemberStatus(memberId, status, by)
  if (status === 'approved' && m.email) {
    await sendMail({
      to: m.email,
      subject: '[엔엠솔루션] 협력업체 포털 가입이 승인되었습니다',
      html: mailLayout({
        title: '가입 승인 완료',
        lines: [`${m.name}님, 이제 엔엠솔루션 협력업체 포털에 로그인할 수 있습니다.`],
        button: { label: '로그인', url: `${siteUrl()}/portal/login` },
      }),
    })
  }
  return m
}

export type AccountInput = { name: string; title: string; phone: string; email: string }
export type AccountResult = { email: string; ok: true } | { email: string; ok: false; error: string }

/**
 * 업체 관계자 계정을 바로 만든다. 아이디는 이메일, 비밀번호는 휴대폰 번호 숫자만.
 * 만들면 바로 승인 상태이고 이메일 인증도 된 것으로 둔다(인증·승인 메일을 보내지 않음).
 */
export async function createAccounts(clientId: number, people: AccountInput[], by: string, h: Headers): Promise<AccountResult[]> {
  const client = await getClient(clientId)
  if (!client) return people.map((p) => ({ email: p.email, ok: false, error: '업체를 찾을 수 없습니다.' }))
  const out: AccountResult[] = []
  for (const p of people.slice(0, 20)) {
    const t = (v: unknown, max = 100) => String(v ?? '').trim().slice(0, max)
    const name = t(p.name, 50)
    const title = t(p.title, 50)
    const password = phoneDigits(t(p.phone, 30))
    const phone = password.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3')
    const email = t(p.email, 200).toLowerCase()
    const fail = (error: string) => out.push({ email: email || name, ok: false, error })
    if (!name) { fail('이름이 없습니다.'); continue }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail('이메일 주소를 확인해 주세요.'); continue }
    if (isAdminEmail(email)) { fail('이 이메일로는 만들 수 없습니다.'); continue }
    if (!isPhone(password)) { fail('휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)'); continue }
    if (await emailTaken(email)) { fail('이미 계정이 있는 이메일입니다.'); continue }

    let userId: string
    try {
      const res = await partnerSignup.run({ clientId, verified: true }, () =>
        auth.api.signUpEmail({ body: { name, email, password }, headers: h }),
      )
      userId = res.user.id
    } catch (e) {
      console.error('[portal] 계정 만들기 실패', e)
      fail('계정을 만들지 못했습니다.')
      continue
    }
    // 가입하면서 생긴 로그인(세션)은 만든 사람 것이 아니므로 지운다
    await endSessions(userId).catch(() => {})
    try {
      await addMember({ clientId, userId, name, title, phone, approvedBy: by })
      out.push({ email, ok: true })
    } catch (e) {
      console.error('[portal] 관계자 등록 실패', e)
      await deletePartnerUser(userId).catch(() => {})
      fail('계정을 만들지 못했습니다.')
    }
  }
  return out
}

/** 관계자 비밀번호를 등록된 휴대폰 번호(숫자만)로 되돌린다. 그 계정의 로그인은 끊는다 */
export async function resetPasswordToPhone(memberId: number): Promise<({ ok: true } | { ok: false; error: string }) & { clientId?: number }> {
  const m = await memberAccount(memberId)
  if (!m) return { ok: false, error: '관계자를 찾을 수 없습니다.' }
  const password = phoneDigits(m.phone)
  if (!isPhone(password)) return { ok: false, error: '등록된 휴대폰 번호가 없거나 형식이 맞지 않습니다.', clientId: m.clientId }
  try {
    const ctx = await auth.$context
    await setPasswordHash(m.userId, await ctx.password.hash(password))
    await endSessions(m.userId)
  } catch (e) {
    console.error('[portal] 비밀번호 되돌리기 실패', e)
    return { ok: false, error: e instanceof Error ? e.message : '비밀번호를 바꾸지 못했습니다.', clientId: m.clientId }
  }
  return { ok: true, clientId: m.clientId }
}
