import { randomInt } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureUserRole } from '@/lib/auth-roles'
import { ensureClients } from '@/lib/clients/table'

/**
 * 협력업체 포털: 업체 코드와 업체 관계자(sql/009_client_portal.sql 과 같은 모양).
 * - clients.portal_code: 관계자가 가입할 때 넣는 8자리 코드. 헷갈리는 글자(0·O·1·I)는 쓰지 않는다.
 * - clients.portal_open: 끄면 그 코드로 새로 가입할 수 없다(이미 승인된 관계자는 그대로 들어온다).
 * - client_members: 계정(user) ↔ 업체. 상태는 pending(승인 대기) · approved(승인) · suspended(중지).
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다.
 */
export type MemberStatus = 'pending' | 'approved' | 'suspended'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function newCode(): string {
  let s = ''
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return s
}

/** 입력한 코드를 저장 형태로 (대문자, 하이픈·공백 제거) */
export function normalizeCode(input: string): string {
  return String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
}

/** 화면에 보이는 형태 ABCD-EFGH */
export function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

let ready: Promise<void> | null = null

export function ensurePortal(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await Promise.all([ensureClients(), ensureUserRole()])
      await pool.query(`ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS portal_code text UNIQUE,
        ADD COLUMN IF NOT EXISTS portal_open boolean NOT NULL DEFAULT true`)
      await pool.query(`CREATE TABLE IF NOT EXISTS client_members (
        id          bigint generated always as identity primary key,
        client_id   bigint not null references clients(id) on delete cascade,
        user_id     text not null unique references "user"(id) on delete cascade,
        name        text not null,
        title       text,
        phone       text,
        status      text not null default 'pending',
        created_at  timestamptz not null default now(),
        approved_at timestamptz,
        approved_by text
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS client_members_client_idx ON client_members (client_id)`)
      const { rows } = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE portal_code IS NULL`)
      for (const r of rows) await assignCode(Number(r.id), false)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

/** 새 코드를 붙인다. 겹치면 다시 뽑는다 */
async function assignCode(clientId: number, replace: boolean): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = newCode()
    try {
      const { rowCount } = await pool.query(
        `UPDATE clients SET portal_code = $2 WHERE id = $1 ${replace ? '' : 'AND portal_code IS NULL'}`,
        [clientId, code],
      )
      if (rowCount) return code
      return ''
    } catch (e) {
      if ((e as { code?: string }).code !== '23505') throw e
    }
  }
  throw new Error('업체 코드를 만들지 못했습니다. 다시 시도해 주세요.')
}

export async function regenerateCode(clientId: number): Promise<string> {
  await ensurePortal()
  return assignCode(clientId, true)
}

export async function setPortalOpen(clientId: number, open: boolean) {
  await ensurePortal()
  await pool.query(`UPDATE clients SET portal_open = $2 WHERE id = $1`, [clientId, open])
}

/** 가입 받는 업체를 코드로 찾는다 (코드가 꺼져 있으면 null) */
export async function findClientByCode(input: string): Promise<{ id: number; name: string } | null> {
  const code = normalizeCode(input)
  if (code.length !== 8) return null
  await ensurePortal()
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM clients WHERE portal_code = $1 AND portal_open`,
    [code],
  )
  return rows[0] ? { id: Number(rows[0].id), name: rows[0].name } : null
}

export async function addMember(m: { clientId: number; userId: string; name: string; title: string; phone: string }) {
  await ensurePortal()
  await pool.query(
    `INSERT INTO client_members (client_id, user_id, name, title, phone) VALUES ($1, $2, $3, $4, $5)`,
    [m.clientId, m.userId, m.name, m.title, m.phone],
  )
}

export type Membership = { memberId: number; clientId: number; clientName: string; name: string; status: MemberStatus }

/** 로그인한 협력업체 계정이 어느 업체 관계자인지 */
export async function getMembership(userId: string): Promise<Membership | null> {
  await ensurePortal()
  const { rows } = await pool.query<{ id: string; client_id: string; client_name: string; name: string; status: MemberStatus }>(
    `SELECT m.id, m.client_id, c.name AS client_name, m.name, m.status
     FROM client_members m JOIN clients c ON c.id = m.client_id WHERE m.user_id = $1`,
    [userId],
  )
  const r = rows[0]
  return r ? { memberId: Number(r.id), clientId: Number(r.client_id), clientName: r.client_name, name: r.name, status: r.status } : null
}

export type MemberRow = {
  id: number
  name: string
  title: string
  phone: string
  email: string
  emailVerified: boolean
  status: MemberStatus
  createdAt: Date
  approvedAt: Date | null
}

export type PortalInfo = { code: string; open: boolean; members: MemberRow[] }

export async function getPortalInfo(clientId: number): Promise<PortalInfo | null> {
  await ensurePortal()
  const c = await pool.query<{ portal_code: string | null; portal_open: boolean }>(
    `SELECT portal_code, portal_open FROM clients WHERE id = $1`,
    [clientId],
  )
  if (!c.rows[0]) return null
  const { rows } = await pool.query<{
    id: string
    name: string
    title: string | null
    phone: string | null
    email: string
    email_verified: boolean
    status: MemberStatus
    created_at: Date
    approved_at: Date | null
  }>(
    `SELECT m.id, m.name, m.title, m.phone, u.email, u."emailVerified" AS email_verified, m.status, m.created_at, m.approved_at
     FROM client_members m JOIN "user" u ON u.id = m.user_id
     WHERE m.client_id = $1 ORDER BY (m.status = 'pending') DESC, m.created_at`,
    [clientId],
  )
  return {
    code: c.rows[0].portal_code ?? '',
    open: c.rows[0].portal_open,
    members: rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      title: r.title ?? '',
      phone: r.phone ?? '',
      email: r.email,
      emailVerified: r.email_verified,
      status: r.status,
      createdAt: r.created_at,
      approvedAt: r.approved_at,
    })),
  }
}

/** 업체별 승인 대기 인원 (업체 목록 표시용) */
export async function pendingCounts(): Promise<Map<number, number>> {
  await ensurePortal()
  const { rows } = await pool.query<{ client_id: string; n: number }>(
    `SELECT client_id, count(*)::int AS n FROM client_members WHERE status = 'pending' GROUP BY client_id`,
  )
  return new Map(rows.map((r) => [Number(r.client_id), r.n]))
}

/** 승인 · 중지. 중지하면 그 계정의 로그인(세션)을 바로 끊는다. 바꾼 관계자의 이메일·이름·업체를 돌려준다 */
export async function setMemberStatus(memberId: number, status: MemberStatus, by: string) {
  await ensurePortal()
  const { rows } = await pool.query<{ user_id: string; name: string; client_id: string }>(
    `UPDATE client_members SET status = $2,
       approved_at = CASE WHEN $2 = 'approved' THEN now() ELSE approved_at END,
       approved_by = CASE WHEN $2 = 'approved' THEN $3 ELSE approved_by END
     WHERE id = $1 RETURNING user_id, name, client_id`,
    [memberId, status, by],
  )
  const r = rows[0]
  if (!r) throw new Error('관계자를 찾을 수 없습니다.')
  if (status !== 'approved') await pool.query(`DELETE FROM session WHERE "userId" = $1`, [r.user_id])
  const u = await pool.query<{ email: string }>(`SELECT email FROM "user" WHERE id = $1`, [r.user_id])
  return { email: u.rows[0]?.email ?? '', name: r.name, clientId: Number(r.client_id) }
}

/** 관계자 삭제 — 로그인 계정까지 지운다(협력업체 계정만) */
export async function removeMember(memberId: number) {
  await ensurePortal()
  await pool.query(
    `DELETE FROM "user" WHERE role = 'partner' AND id = (SELECT user_id FROM client_members WHERE id = $1)`,
    [memberId],
  )
  await pool.query(`DELETE FROM client_members WHERE id = $1`, [memberId])
}

/** 가입 도중 실패했을 때 막 만든 협력업체 계정을 지운다 */
export async function deletePartnerUser(userId: string) {
  await pool.query(`DELETE FROM "user" WHERE id = $1 AND role = 'partner'`, [userId])
}
