import { pool } from '@/lib/db'
import { ensureUserRole } from '@/lib/auth-roles'
import { ensureQuoteRequests } from '@/lib/quote-table'
import { ensureClients } from '@/lib/clients/table'
import { SQL_011, SQL_012, SQL_013, SQL_014, SQL_015 } from './ddl'
import { seedSql } from './seed'

/**
 * 견적 시스템 표(sql/011~016)가 없으면 만든다. 정본은 sql 파일이고 같은 SQL 을 돌린다(lib/est/ddl.ts).
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다(lib/clients/table.ts ensureClients 와 같은 방식).
 * 인스턴스마다 한 번, 실패하면 다음 조회 때 다시 시도. 여러 인스턴스가 동시에 돌지 않게 advisory lock.
 */
let ssoReady: Promise<void> | null = null
let ready: Promise<void> | null = null

async function runLocked(sqls: string[]) {
  const c = await pool.connect()
  try {
    await c.query('BEGIN')
    await c.query('SELECT pg_advisory_xact_lock(778301)')
    for (const s of sqls) await c.query(s)
    await c.query('COMMIT')
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    c.release()
  }
}

/** SSO 표와 user.est_role (sql/015). 세션 확인 전에 돈다 */
export function ensureSso(): Promise<void> {
  if (!ssoReady) {
    ssoReady = (async () => {
      await ensureUserRole()
      await runLocked([SQL_015])
    })().catch((e) => {
      ssoReady = null
      throw e
    })
  }
  return ssoReady
}

export function ensureEst(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureSso()
      await ensureQuoteRequests()
      await ensureClients()
      await runLocked([SQL_011, SQL_012, SQL_013, SQL_014, seedSql()])
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

let sampleReady: Promise<void> | null = null

/**
 * 표 + S01 샘플 A안 초안(엔진으로 만듦, est_seed 로 한 번만). 견적 현황 화면이 부름.
 * 초안 만들기가 ensureEst 를 다시 부르므로 ensureEst 안에서 돌리지 않음. 실패해도 화면은 열림.
 */
export function ensureEstWithSample(): Promise<void> {
  if (!sampleReady) {
    sampleReady = ensureEst()
      .then(() => import('./draft'))
      .then((m) => m.ensureSampleDraft())
      .catch((e) => {
        sampleReady = null
        console.error('[est] 샘플 초안 실패', e)
      })
  }
  return sampleReady
}

/** bigint·numeric 칸(문자열로 옴)을 숫자로 */
export const n = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
export const nOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : n(v))

/** 화면에 보여 줄 오류(서버 액션이 값으로 돌려줌) */
export class EstError extends Error {}

/** 잠긴 판(승인·제출·대체·결재 중) 수정 거절 문구 (lib/clients/table.ts LOCKED_MESSAGE 패턴) */
export const LOCKED_MESSAGE = '승인·제출된(또는 결재 중인) 판이라 고칠 수 없음. 고치려면 새 판으로 복제해야 함'
export const LOCKED_STATUSES = ['approving', 'approved', 'submitted', 'superseded', 'void']
