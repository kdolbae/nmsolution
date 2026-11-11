import { checkKey, clientId, json } from '@/lib/sbworks'
import { formatCode, getPortalInfo, memberClientId, regenerateCode, removeMember, setPortalOpen, type MemberStatus } from '@/lib/portal/members'
import { changeStatus, createAccounts, resetPasswordToPhone, type AccountInput } from '@/lib/portal/admin'

export const dynamic = 'force-dynamic'

/**
 * 협력업체 포털 관리(N-CMS 업체 화면용). 엔엠 어드민의 「업체 › 협력업체 포털」을 옮긴 것.
 * GET  /api/sbworks/portal/<업체 id> → 업체 코드·가입 받기 여부·관계자 목록
 * POST /api/sbworks/portal/<업체 id> {action, ...}
 *   regenerate | open | close | status {member, status, by} | delete {member} | reset {member} | create {people[], by}
 * 관계자 개인정보가 오가므로 키 인증만 받고, N-CMS 쪽에서 업체 쓰기 권한이 있는 사람만 부른다.
 */
type Ctx = { params: Promise<{ id: string }> }

const view = async (id: number) => {
  const info = await getPortalInfo(id)
  return info && { code: formatCode(info.code), open: info.open, members: info.members }
}

export async function GET(req: Request, { params }: Ctx) {
  const denied = checkKey(req)
  if (denied) return denied
  const id = clientId((await params).id)
  const info = id ? await view(id) : null
  return info ? json(info) : json({ error: '업체를 찾을 수 없습니다.' }, 404)
}

export async function POST(req: Request, { params }: Ctx) {
  const denied = checkKey(req)
  if (denied) return denied
  const id = clientId((await params).id)
  if (!id || !(await getPortalInfo(id))) return json({ error: '업체를 찾을 수 없습니다.' }, 404)
  const b = (await req.json().catch(() => ({}))) as { action?: string; member?: number; status?: MemberStatus; by?: string; people?: AccountInput[] }
  const by = String(b.by ?? '').trim().slice(0, 100) || 'N-CMS'
  // 관계자 단위 작업은 이 업체 사람인지 먼저 본다
  const member = Number(b.member)
  const mine = async () => (await memberClientId(member)) === id

  switch (b.action) {
    case 'regenerate':
      await regenerateCode(id)
      break
    case 'open':
    case 'close':
      await setPortalOpen(id, b.action === 'open')
      break
    case 'status':
      if (!(await mine())) return json({ error: '관계자를 찾을 수 없습니다.' }, 404)
      try {
        await changeStatus(member, b.status as MemberStatus, by)
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : '바꾸지 못했습니다.' }, 400)
      }
      break
    case 'delete':
      if (!(await mine())) return json({ error: '관계자를 찾을 수 없습니다.' }, 404)
      await removeMember(member)
      break
    case 'reset': {
      if (!(await mine())) return json({ error: '관계자를 찾을 수 없습니다.' }, 404)
      const r = await resetPasswordToPhone(member)
      if (!r.ok) return json({ error: r.error }, 400)
      break
    }
    case 'create': {
      const people = Array.isArray(b.people) ? b.people.slice(0, 20) : []
      if (!people.length) return json({ error: '만들 사람이 없습니다.' }, 400)
      const results = await createAccounts(id, people, by, new Headers())
      return json({ ...(await view(id)), results })
    }
    default:
      return json({ error: '알 수 없는 작업' }, 400)
  }
  return json(await view(id))
}
