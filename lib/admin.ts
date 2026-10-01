import { pool } from '@/lib/db'
import { getAdminSession } from '@/lib/sso'
import { headers } from 'next/headers'

/** 관리자 로그인 또는 sbworks.bond 관리 웹에서 넘어온 로그인 (lib/sso.ts) */
export async function getSession() {
  return getAdminSession(await headers())
}

/** 관리자 계정이 아직 없는지 (최초 설정 필요) */
export async function needsSetup() {
  const { rows } = await pool.query('SELECT count(*)::int AS count FROM "user"')
  return (rows[0]?.count ?? 0) === 0
}
