import { pool } from '@/lib/db'
import { ensureSends, isPortalHidden } from './sends'
import { getVersion, type ClientRow } from './table'
import type { Quote } from './quote'

/**
 * 고객 화면에 보이는 버전 (전 업체 공통, 2026-11-02 kevin).
 *
 * - 기본: 업체 페이지·협력업체 포털은 내부 최신 버전을 그대로 보여 준다. 저장하면 고객 화면도 바로 바뀐다.
 *   (2026-10-28 ~ 11-02 에는 어드민이 '고객 발송본으로 확정'한 발송본만 보였는데, 매번 확정을 눌러야 해서 정정함)
 * - 어드민이 특정 버전을 '고정'하면(clients.portal_version) 그 버전만 보이고, 최신 작업본은 고객에게 안 보인다.
 *   고정을 풀면 다시 최신 자동.
 * - 업체 페이지 공개를 끄면(portal_hidden) 어느 버전도 안 보이고 '준비 중'만 보인다.
 * - '확정'(finalized_at, 잠금)은 계약이 되었을 때만 누른다(lib/clients/table.ts finalizeClient). 노출과는 별개.
 * - 발송 기록(client_sends)은 고객에게 실제로 보낸 사실을 남기는 장부로만 쓴다. 고객 화면은 이 표를 읽지 않는다.
 */

export type ExposedDoc = {
  /** 고객이 보는 내부 버전 번호 */
  version: number
  /** 내부 최신 버전 번호 */
  latest: number
  /** 어드민이 이 버전으로 고정했는지 (false 면 최신 자동) */
  pinned: boolean
  /** 고객 화면 제목·PDF 이름에 쓰는 견적번호 */
  number: string
  proposalHtml: string
  quote: Quote
  /** 그 버전을 저장한 시각 */
  at: Date
}

let ready: Promise<void> | null = null

/** clients.portal_version 열을 만들고, 처음 한 번 아토텍을 지금 고객이 보던 발송본 버전으로 고정한다 */
export function ensureExposure(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureSends()
      await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_version int`)
      // 아토텍코리아(2026-10-28 kevin): 배관만 견적(PR #110)은 고객에게 자동으로 올리지 않기로 했으므로
      // 최신 자동으로 바뀌어도 고객 화면이 바뀌지 않게, 마지막 발송본의 버전으로 고정해 둔다. 어드민에서 풀 수 있다.
      await pool.query(
        `UPDATE clients c SET portal_version = s.version_no
           FROM (SELECT DISTINCT ON (client_id) client_id, version_no FROM client_sends
                  WHERE withdrawn_at IS NULL AND version_no IS NOT NULL ORDER BY client_id, send_no DESC) s
          WHERE s.client_id = c.id AND c.portal_slug = 'atotech' AND c.portal_version IS NULL
            AND NOT EXISTS (SELECT 1 FROM client_seeds WHERE key = 'portal-version-v1-atotech')`,
      )
      await pool.query(`INSERT INTO client_seeds (key) VALUES ('portal-version-v1-atotech') ON CONFLICT DO NOTHING`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

/** 고정한 버전 번호. 최신 자동이면 null */
export async function getPortalVersion(clientId: number): Promise<number | null> {
  await ensureExposure()
  const { rows } = await pool.query<{ portal_version: number | null }>(`SELECT portal_version FROM clients WHERE id = $1`, [clientId])
  return rows[0]?.portal_version ?? null
}

/** 고객 화면을 버전 하나로 고정한다. null 이면 최신 자동으로 돌린다 */
export async function setPortalVersion(clientId: number, version: number | null) {
  await ensureExposure()
  if (version !== null) {
    if (!Number.isSafeInteger(version) || version <= 0) throw new Error('버전 번호가 올바르지 않습니다.')
    const v = await pool.query(`SELECT 1 FROM client_versions WHERE client_id = $1 AND version_no = $2`, [clientId, version])
    if (!v.rows.length) throw new Error(`v${version} 버전을 찾지 못했습니다.`)
  }
  await pool.query(`UPDATE clients SET portal_version = $2 WHERE id = $1`, [clientId, version])
}

/**
 * 고객이 지금 보는 제안서·견적서. 공개를 껐으면 null.
 * 고정한 버전이 지워졌으면 최신으로 돌아간다. 버전 기록이 하나도 없는 업체는 clients 행의 문서를 v0 으로 보여 준다.
 */
export async function exposedDoc(client: Pick<ClientRow, 'id' | 'proposalHtml' | 'quote' | 'updatedAt'>): Promise<ExposedDoc | null> {
  await ensureExposure()
  if (await isPortalHidden(client.id)) return null
  const { rows } = await pool.query<{ portal_version: number | null; latest: number | null }>(
    `SELECT c.portal_version, (SELECT MAX(version_no) FROM client_versions v WHERE v.client_id = c.id) AS latest FROM clients c WHERE c.id = $1`,
    [client.id],
  )
  const latest = Number(rows[0]?.latest ?? 0)
  const pinned = rows[0]?.portal_version ?? null
  if (pinned !== null && pinned !== latest) {
    const v = await getVersion(client.id, pinned)
    if (v) return { version: v.no, latest, pinned: true, number: v.quote.number, proposalHtml: v.proposalHtml, quote: v.quote, at: v.at }
  }
  // 최신 버전은 clients 행과 같다(저장할 때 같이 쓴다)
  return {
    version: latest,
    latest,
    pinned: pinned !== null,
    number: client.quote.number,
    proposalHtml: client.proposalHtml,
    quote: client.quote,
    at: client.updatedAt,
  }
}
