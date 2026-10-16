'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth, partnerSignup } from '@/lib/auth'
import { adminEmails, requireAdmin } from '@/lib/admin'
import { isAdminEmail } from '@/lib/auth-roles'
import { mailEnabled, mailLayout, sendMail } from '@/lib/mail'
import { siteUrl } from '@/lib/site'
import {
  addMember,
  deletePartnerUser,
  emailTaken,
  endSessions,
  findClientByCode,
  formatCode,
  isPhone,
  memberAccount,
  phoneDigits,
  setPasswordHash,
  regenerateCode,
  removeMember,
  setMemberStatus,
  setPortalOpen,
  type MemberStatus,
} from '@/lib/portal/members'
import { getClient } from '@/lib/clients/table'

/** 코드 맞히기 막기: IP 마다 10분에 20번 */
const tries = new Map<string, { n: number; t: number }>()
async function limited(): Promise<boolean> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const rec = tries.get(ip)
  const cur = rec && now - rec.t < 10 * 60_000 ? rec : { n: 0, t: now }
  tries.set(ip, { n: cur.n + 1, t: cur.t })
  return cur.n >= 20
}

const TOO_MANY = '시도가 너무 많습니다. 10분 뒤 다시 해 주세요.'

/** 가입 화면: 업체 코드 확인 → 업체명 */
export async function checkPortalCode(code: string): Promise<{ ok: true; clientName: string } | { ok: false; error: string }> {
  if (await limited()) return { ok: false, error: TOO_MANY }
  const client = await findClientByCode(code)
  if (!client) return { ok: false, error: '업체 코드가 맞지 않거나 가입을 받지 않는 업체입니다.' }
  return { ok: true, clientName: client.name }
}

export type SignupInput = { code: string; name: string; title: string; phone: string; email: string; password: string }

/** 업체 관계자 가입. 가입 후 (메일이 켜져 있으면) 이메일 인증, 그리고 관리자 승인을 거쳐야 포털이 열린다 */
export async function partnerSignUp(input: SignupInput): Promise<{ ok: true; verify: boolean } | { ok: false; error: string }> {
  if (await limited()) return { ok: false, error: TOO_MANY }
  const t = (v: unknown, max = 100) => String(v ?? '').trim().slice(0, max)
  const name = t(input.name, 50)
  const title = t(input.title, 50)
  const phone = t(input.phone, 30)
  const email = t(input.email, 200).toLowerCase()
  const password = String(input.password ?? '')
  if (!name) return { ok: false, error: '이름을 입력해 주세요.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: '이메일 주소를 확인해 주세요.' }
  if (isAdminEmail(email)) return { ok: false, error: '이 이메일로는 가입할 수 없습니다.' }
  if (password.length < 10) return { ok: false, error: '비밀번호는 10자 이상으로 정해 주세요.' }
  if (password.length > 128) return { ok: false, error: '비밀번호가 너무 깁니다.' }

  const client = await findClientByCode(input.code)
  if (!client) return { ok: false, error: '업체 코드가 맞지 않거나 가입을 받지 않는 업체입니다.' }

  let userId: string
  try {
    const h = await headers()
    const res = await partnerSignup.run({ clientId: client.id }, () =>
      auth.api.signUpEmail({ body: { name, email, password, callbackURL: '/portal/login?verified=1' }, headers: h }),
    )
    userId = res.user.id
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (/exist/i.test(msg)) return { ok: false, error: '이미 가입된 이메일입니다. 로그인해 주세요.' }
    console.error('[portal] 가입 실패', e)
    return { ok: false, error: '가입하지 못했습니다. 잠시 뒤 다시 해 주세요.' }
  }

  try {
    await addMember({ clientId: client.id, userId, name, title, phone })
  } catch (e) {
    console.error('[portal] 관계자 등록 실패', e)
    await deletePartnerUser(userId).catch(() => {})
    return { ok: false, error: '가입하지 못했습니다. 잠시 뒤 다시 해 주세요.' }
  }

  const to = await adminEmails().catch(() => [])
  if (to.length) {
    await sendMail({
      to,
      subject: `[협력업체 포털] ${client.name} 관계자 가입 승인 요청`,
      html: mailLayout({
        title: '새 관계자 가입',
        lines: [`${client.name} · ${name}${title ? ` ${title}` : ''} (${email}${phone ? `, ${phone}` : ''})`, '업체 관리에서 승인해야 포털을 쓸 수 있습니다.'],
        button: { label: '승인하러 가기', url: `${siteUrl()}/admin/clients/${client.id}` },
      }),
    })
  }
  return { ok: true, verify: mailEnabled() }
}

// ---------- 관리자: 업체 코드 · 관계자 ----------

export async function regeneratePortalCode(clientId: number) {
  await requireAdmin()
  const code = await regenerateCode(clientId)
  revalidatePath(`/admin/clients/${clientId}`)
  return { code: formatCode(code) }
}

export async function togglePortal(clientId: number, open: boolean) {
  await requireAdmin()
  await setPortalOpen(clientId, open)
  revalidatePath(`/admin/clients/${clientId}`)
}

export async function changeMemberStatus(memberId: number, status: MemberStatus) {
  const admin = await requireAdmin()
  if (!['approved', 'suspended', 'pending'].includes(status)) throw new Error('잘못된 상태')
  const m = await setMemberStatus(memberId, status, admin.name || admin.email)
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
  revalidatePath(`/admin/clients/${m.clientId}`)
}

export async function deleteMember(memberId: number, clientId: number) {
  await requireAdmin()
  await removeMember(memberId)
  revalidatePath(`/admin/clients/${clientId}`)
}

export type AccountInput = { name: string; title: string; phone: string; email: string }
export type AccountResult = { email: string; ok: true } | { email: string; ok: false; error: string }

/**
 * 관리자가 업체 관계자 계정을 바로 만든다. 아이디는 이메일, 비밀번호는 휴대폰 번호 숫자만.
 * 만들면 바로 승인 상태이고 이메일 인증도 된 것으로 둔다(인증·승인 메일을 보내지 않음).
 */
export async function createPortalAccounts(clientId: number, people: AccountInput[]): Promise<AccountResult[]> {
  const admin = await requireAdmin()
  const client = await getClient(clientId)
  if (!client) return people.map((p) => ({ email: p.email, ok: false, error: '업체를 찾을 수 없습니다.' }))
  const h = await headers()
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
    // 가입하면서 생긴 로그인(세션)은 관리자 것이 아니므로 지운다
    await endSessions(userId).catch(() => {})
    try {
      await addMember({ clientId, userId, name, title, phone, approvedBy: admin.name || admin.email })
      out.push({ email, ok: true })
    } catch (e) {
      console.error('[portal] 관계자 등록 실패', e)
      await deletePartnerUser(userId).catch(() => {})
      fail('계정을 만들지 못했습니다.')
    }
  }
  revalidatePath(`/admin/clients/${clientId}`)
  return out
}

/** 관계자 비밀번호를 등록된 휴대폰 번호(숫자만)로 되돌린다. 그 계정의 로그인은 끊는다 */
export async function resetMemberPasswordToPhone(memberId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const m = await memberAccount(memberId)
  if (!m) return { ok: false, error: '관계자를 찾을 수 없습니다.' }
  const password = phoneDigits(m.phone)
  if (!isPhone(password)) return { ok: false, error: '등록된 휴대폰 번호가 없거나 형식이 맞지 않습니다.' }
  try {
    const ctx = await auth.$context
    await setPasswordHash(m.userId, await ctx.password.hash(password))
    await endSessions(m.userId)
  } catch (e) {
    console.error('[portal] 비밀번호 되돌리기 실패', e)
    return { ok: false, error: e instanceof Error ? e.message : '비밀번호를 바꾸지 못했습니다.' }
  }
  revalidatePath(`/admin/clients/${m.clientId}`)
  return { ok: true }
}
