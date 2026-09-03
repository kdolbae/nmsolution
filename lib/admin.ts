import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { headers } from 'next/headers'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** 관리자 계정이 아직 없는지 (최초 설정 필요) */
export async function needsSetup() {
  const { rows } = await pool.query('SELECT count(*)::int AS count FROM "user"')
  return (rows[0]?.count ?? 0) === 0
}
