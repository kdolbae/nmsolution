import type { PoolClient } from 'pg'
import { pool } from '@/lib/db'
import { calcQuote, normalizeQuote, today, type Quote } from './quote'
import { changedQuoteParts } from './compare'
import { kktProposalHtml } from './proposal'
import { KKT_CLIENT, KKT_QUOTE, upgradeKkt } from './seed-kkt'
import { SINIL_CLIENT, SINIL_PORTAL_PASSWORD_HASH, SINIL_SEED_KEY, SINIL_REV3_KEY, SINIL_REV4_KEY, SINIL_PAGE_V6_KEY, SINIL_SHARE, sinilRentalItems, SINIL_UPDATE_KEY, sinilQuote } from './seed-sinil'
import { SINIL_PAGE_HTML } from './sinil-page'
import { ADREAMING_CLIENT, ADREAMING_REV2_KEY, ADREAMING_REV3_KEY, ADREAMING_REV4_KEY, ADREAMING_REV5_KEY, ADREAMING_REV6_KEY, ADREAMING_SEED_KEY, adreamingQuote } from './seed-adreaming'
import { ADREAMING_PAGE_HTML } from './adreaming-page'
import { ATOTECH_CLIENT, ATOTECH_REV2_KEY, ATOTECH_REV3_KEY, ATOTECH_REV4_KEY, ATOTECH_REV5_KEY, ATOTECH_REV6_KEY, ATOTECH_REV7_KEY, ATOTECH_REV8_KEY, ATOTECH_REV9_KEY, ATOTECH_REV10_KEY, ATOTECH_REV11_KEY, ATOTECH_SEED_KEY, atotechQuote } from './seed-atotech'
import { ATOTECH_PAGE_HTML } from './atotech-page'
import { hashPortalPassword } from './portal-password'
import { phoneDigits } from '@/lib/quote'

/**
 * 업체 관리(제안서·견적서) 표. sql/007_clients.sql, sql/008_client_versions.sql 과 같은 모양.
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다(lib/site-events-table.ts 와 같은 방식).
 * 표를 처음 만들 때 금강변압기 제안서·견적서를 첫 업체로 넣는다.
 *
 * 버전: 제안서·견적서를 저장할 때마다 client_versions 에 그때의 제안서·견적서 전체를 한 벌 남긴다.
 * 최종본 확정(finalized_at)이 되면 제안서·견적서는 더 고칠 수 없다.
 */
let ready: Promise<void> | null = null

export const LOCKED_MESSAGE = '최종본으로 확정된 견적이라 제안서·견적서를 고칠 수 없습니다.'

export function ensureClients(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const { rows } = await pool.query(`SELECT to_regclass('clients') IS NOT NULL AS exists`)
      await pool.query(`CREATE TABLE IF NOT EXISTS clients (
        id             bigint generated always as identity primary key,
        name           text not null,
        contact_person text,
        phone          text,
        email          text,
        site_address   text,
        memo           text,
        proposal_html  text,
        quote          jsonb,
        created_at     timestamptz not null default now(),
        updated_at     timestamptz not null default now()
      )`)
      await pool.query(`ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS finalized_version int,
        ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
        ADD COLUMN IF NOT EXISTS finalized_by text,
        ADD COLUMN IF NOT EXISTS biz_number text,
        ADD COLUMN IF NOT EXISTS portal_slug text,
        ADD COLUMN IF NOT EXISTS portal_login text,
        ADD COLUMN IF NOT EXISTS portal_password_hash text,
        ADD COLUMN IF NOT EXISTS portal_share_hash text,
        ADD COLUMN IF NOT EXISTS portal_share_expires timestamptz`)
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS clients_portal_slug_key ON clients (portal_slug) WHERE portal_slug IS NOT NULL`)
      await pool.query(`CREATE TABLE IF NOT EXISTS client_versions (
        id            bigint generated always as identity primary key,
        client_id     bigint not null references clients(id) on delete cascade,
        version_no    int not null,
        change        text not null,
        summary       text,
        proposal_html text,
        quote         jsonb,
        created_by    text,
        created_at    timestamptz not null default now(),
        unique (client_id, version_no)
      )`)
      if (!rows[0]?.exists) {
        const { PAGE_HTML } = await import('@/app/kkt/page-html')
        await pool.query(
          `INSERT INTO clients (name, site_address, proposal_html, quote)
           SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM clients)`,
          [KKT_CLIENT.name, KKT_CLIENT.siteAddress, kktProposalHtml(PAGE_HTML), JSON.stringify(KKT_QUOTE)],
        )
      }
      // 버전 기록이 없는 업체는 지금 상태를 v1 로 남긴다
      await pool.query(
        `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_at)
         SELECT c.id, 1, 'init', '기록 시작 시점의 저장본', c.proposal_html, c.quote, c.updated_at FROM clients c
         WHERE NOT EXISTS (SELECT 1 FROM client_versions v WHERE v.client_id = c.id)
         ON CONFLICT DO NOTHING`,
      )
      // 저장된 금강변압기 제안서·견적서를 최신 결정에 맞춘다 (seed-kkt.ts upgradeKkt). 확정된 업체는 건드리지 않는다
      const kkt = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND finalized_at IS NULL`, [KKT_CLIENT.name])
      if (kkt.rows.length) {
        const { PAGE_HTML } = await import('@/app/kkt/page-html')
        for (const r of kkt.rows) {
          await applyChange(Number(r.id), 'system', '자동 정리', (cur) => {
            const up = upgradeKkt(normalizeQuote(cur.quote), cur.proposalHtml, () => kktProposalHtml(PAGE_HTML))
            return up && { proposalHtml: up.proposalHtml, quote: up.quote, summary: up.summary }
          }).catch(() => null)
        }
      }
      // 신일공업: 처음이면 넣고, 앞선 등록본(빈 견적 틀·기본 제안서)이 있으면 작업계획 페이지·견적으로 바꾼다
      await seedOnce(SINIL_SEED_KEY, async () => {
        const c = SINIL_CLIENT
        const quote = sinilQuote(today())
        const proposal = SINIL_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
        const found = await pool.query<{ id: string; finalized_at: Date | null }>(`SELECT id, finalized_at FROM clients WHERE name = $1`, [c.name])
        if (found.rows[0]) {
          const id = Number(found.rows[0].id)
          await pool.query(
            `UPDATE clients SET portal_slug = COALESCE(portal_slug, $2), portal_login = COALESCE(NULLIF(portal_login, ''), $3),
               portal_password_hash = COALESCE(portal_password_hash, $4), memo = $5 WHERE id = $1`,
            [id, c.portalSlug, c.portalLogin, SINIL_PORTAL_PASSWORD_HASH, c.memo],
          )
          if (!found.rows[0].finalized_at) {
            await applyChange(id, 'system', 'system', () => ({ proposalHtml: proposal, quote, summary: '작업계획 페이지·지붕 교체 견적으로 정리' }))
          }
          return
        }
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO clients (name, biz_number, contact_person, phone, email, site_address, memo, proposal_html, quote, portal_slug, portal_login, portal_password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [c.name, c.bizNumber, c.contactPerson, c.phone, c.email, c.siteAddress, c.memo, proposal, JSON.stringify(quote), c.portalSlug, c.portalLogin, SINIL_PORTAL_PASSWORD_HASH],
        )
        await pool.query(
          `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
           VALUES ($1, 1, 'init', '업체 등록', $2, $3, 'system') ON CONFLICT DO NOTHING`,
          [rows[0].id, proposal, JSON.stringify(quote)],
        )
      })
      // 신일공업 2차: 문구 수정(총 투입 인원, 약 378㎡)과 임시 링크(7일)
      await seedOnce(SINIL_UPDATE_KEY, async () => {
        const found = await pool.query<{ id: string; finalized_at: Date | null }>(`SELECT id, finalized_at FROM clients WHERE portal_slug = $1`, [SINIL_CLIENT.portalSlug])
        const row = found.rows[0]
        if (!row) return
        const id = Number(row.id)
        await pool.query(`UPDATE clients SET portal_share_hash = $2, portal_share_expires = $3 WHERE id = $1`, [id, SINIL_SHARE.hash, SINIL_SHARE.expires])
        if (row.finalized_at) return
        await applyChange(id, 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const quote = JSON.parse(JSON.stringify(q).split('양면 7m × 27m').join('양면 약 7m × 27m')) as Quote
          return { proposalHtml: SINIL_PAGE_HTML.split('{{QUOTE_NO}}').join(q.number), quote, summary: '총 투입 인원·약 378㎡ 문구 수정' }
        })
      })
      // 신일공업 3차: 기본 5일 21인·일, 프레임·물받이 높임판·하루 인력은 상황에 따라 추가되는 비용, 사진·공정 설명 정리
      await seedOnce(SINIL_REV3_KEY, async () => {
        const found = await pool.query<{ id: string; finalized_at: Date | null }>(`SELECT id, finalized_at FROM clients WHERE portal_slug = $1`, [SINIL_CLIENT.portalSlug])
        const row = found.rows[0]
        if (!row || row.finalized_at) return
        await pool.query(`UPDATE clients SET memo = $2 WHERE id = $1`, [Number(row.id), SINIL_CLIENT.memo])
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const prev = normalizeQuote(cur.quote)
          const quote = { ...sinilQuote(prev.date), number: prev.number, date: prev.date }
          return { proposalHtml: SINIL_PAGE_HTML.split('{{QUOTE_NO}}').join(prev.number), quote, summary: '기본 5일, 프레임·물받이 높임판은 상황에 따라 추가되는 비용' }
        })
      })
      // 신일공업 4차: 프레임·물받이 높임판·설치일 인력을 견적금액에 넣고 끝에 감액 표, 팀장급 6일, 지붕재 7.5m × 28m
      await seedOnce(SINIL_REV4_KEY, async () => {
        const found = await pool.query<{ id: string; finalized_at: Date | null }>(`SELECT id, finalized_at FROM clients WHERE portal_slug = $1`, [SINIL_CLIENT.portalSlug])
        const row = found.rows[0]
        if (!row || row.finalized_at) return
        await pool.query(`UPDATE clients SET memo = $2 WHERE id = $1`, [Number(row.id), SINIL_CLIENT.memo])
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const prev = normalizeQuote(cur.quote)
          const quote = { ...sinilQuote(prev.date), number: prev.number, date: prev.date }
          return { proposalHtml: SINIL_PAGE_HTML.split('{{QUOTE_NO}}').join(prev.number), quote, summary: '프레임 비용 포함 후 감액 표, 팀장급 6일, 지붕재 7.5m × 28m' }
        })
      })
      // 신일공업 제안서 문구만 갱신(용마루 28m·박공 34m). 견적은 관리자가 고친 저장본 유지
      await seedOnce(SINIL_PAGE_V6_KEY, async () => {
        const found = await pool.query<{ id: string; finalized_at: Date | null }>(`SELECT id, finalized_at FROM clients WHERE portal_slug = $1`, [SINIL_CLIENT.portalSlug])
        const row = found.rows[0]
        if (!row || row.finalized_at) return
        await pool.query(`UPDATE clients SET memo = $2 WHERE id = $1`, [Number(row.id), SINIL_CLIENT.memo])
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const eq = q.sections.find((x) => x.name === '장비') ?? q.sections[q.sections.length - 1]
          if (eq && !eq.items.some((i) => i.name === '스카이잭 렌탈')) eq.items.push(...sinilRentalItems())
          return { proposalHtml: SINIL_PAGE_HTML.split('{{QUOTE_NO}}').join(q.number), quote: q, summary: '스카이잭 렌탈 6일·운송비 추가, 제안서 용마루 28m·박공 34m 문구' }
        })
      })
      // 어드리밍: 고양 공장 2층 판넬 사무실. 업체용 비밀번호는 관리자 업체 정보에서 정한다
      await seedOnce(ADREAMING_SEED_KEY, async () => {
        const c = ADREAMING_CLIENT
        const found = await pool.query(`SELECT 1 FROM clients WHERE name = $1 OR portal_slug = $2`, [c.name, c.portalSlug])
        if (found.rows.length) return
        const quote = adreamingQuote(today())
        const proposal = ADREAMING_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
        // insertClient 는 ensureClients 를 기다리므로 여기서는 직접 넣는다
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO clients (name, biz_number, contact_person, phone, email, site_address, memo, proposal_html, quote, portal_slug, portal_login)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [c.name, c.bizNumber, c.contactPerson, c.phone, c.email, c.siteAddress, c.memo, proposal, JSON.stringify(quote), c.portalSlug, c.portalLogin],
        )
        await pool.query(
          `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
           VALUES ($1, 1, 'init', '업체 등록', $2, $3, 'system') ON CONFLICT DO NOTHING`,
          [rows[0].id, proposal, JSON.stringify(quote)],
        )
      })
      // 어드리밍 2~6차: 이미 등록된 업체를 새 견적·제안서로 한 번 갱신한다. 견적번호는 그대로 둔다
      await seedOnce(ADREAMING_REV2_KEY, () => refreshAdreaming('박공지붕, 판넬 공사 한 공종, 각파이프·스카이잭·슬라이딩 도어 단가, 전기 배치도·자재 참고'))
      await seedOnce(ADREAMING_REV3_KEY, () => refreshAdreaming('내부 몰딩 제외'))
      await seedOnce(ADREAMING_REV4_KEY, () => refreshAdreaming('천장틀 C형강 짧은 방향 11열·스레드로드 33개소, 천장틀 배치도 추가'))
      await seedOnce(ADREAMING_REV5_KEY, () => refreshAdreaming('관리자급 1인 × 6일 추가, 3D 공정 이미지 박공지붕·C형강 반영'))
      await seedOnce(ADREAMING_REV6_KEY, () => refreshAdreaming('전기 배관 천장면 노출 없음, 벽면만 노출, 노무비 관리자 행을 위로'))
      await fillAdreamingContact().catch((e) => console.error('adreaming contact', e))
      // 아토텍코리아: 냉수 순환 펌프 교체·배관 구조 변경. 담당자·업체용 비밀번호는 관리자 업체 정보에서 정한다
      await seedOnce(ATOTECH_SEED_KEY, async () => {
        const c = ATOTECH_CLIENT
        const found = await pool.query(`SELECT 1 FROM clients WHERE name = $1 OR portal_slug = $2`, [c.name, c.portalSlug])
        if (found.rows.length) return
        const quote = atotechQuote(today())
        const proposal = ATOTECH_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO clients (name, biz_number, contact_person, phone, email, site_address, memo, proposal_html, quote, portal_slug, portal_login)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [c.name, c.bizNumber, c.contactPerson, c.phone, c.email, c.siteAddress, c.memo, proposal, JSON.stringify(quote), c.portalSlug, c.portalLogin],
        )
        await pool.query(
          `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
           VALUES ($1, 1, 'init', '업체 등록', $2, $3, 'system') ON CONFLICT DO NOTHING`,
          [rows[0].id, proposal, JSON.stringify(quote)],
        )
      })
      await seedOnce(ATOTECH_REV2_KEY, () => refreshAtotech('모터 전원 케이블 F-CV 6sq 4C 교체·전기 기술자 추가'))
      await seedOnce(ATOTECH_REV3_KEY, () => refreshAtotech('제안 1·2 서플라이 경로 단순화, 리턴 넘는 구간만 올림'))
      await seedOnce(ATOTECH_REV4_KEY, () => refreshAtotech('전원 케이블·전기 기술자·경비를 펌프 교체 공종에 넣음'))
      await seedOnce(ATOTECH_REV5_KEY, () => refreshAtotech('펌프 설치 배관 절단 없이, 앵커 작업 포함, 제안서 문구 점검'))
      await seedOnce(ATOTECH_REV6_KEY, () => refreshAtotech('제안 2 설명에 장기 관리 취지 추가'))
      await seedOnce(ATOTECH_REV7_KEY, () => refreshAtotech('펌프 상대 플랜지 제외, P9 흡입·토출 배관 조정, 제안 1 리턴 에어벤트, 제안 1 요청안·제안 2 당사 의견'))
      await seedOnce(ATOTECH_REV8_KEY, () => refreshAtotech('펌프 4대 유닛만 교체, P9 배관 절단·100×65A 레듀서·65A 플랜지·단열 복구, P9 자재 세분화'))
      await seedOnce(ATOTECH_REV9_KEY, () => refreshAtotech('사전 치수 작업 고급기술자 1명·제관사 1명 추가'))
      await seedOnce(ATOTECH_REV10_KEY, () => refreshAtotech('실제 투입 인원·단가로 노무비 조정, 일반관리비 10%·이윤 15%'))
      await seedOnce(ATOTECH_REV11_KEY, () => refreshAtotech('일반관리비 8%, 간접노무비 직접노무비 × 15% 추가'))
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

/** 어드리밍 업체의 견적·제안서를 지금 코드의 내용으로 바꾼다(최종본 확정 전일 때만, 견적번호 유지). */
async function refreshAdreaming(summary: string) {
  const found = await pool.query<{ id: string; finalized_at: Date | null; quote: { number?: string } | null }>(
    `SELECT id, finalized_at, quote FROM clients WHERE portal_slug = $1`,
    [ADREAMING_CLIENT.portalSlug],
  )
  const row = found.rows[0]
  if (!row || row.finalized_at) return
  const quote = adreamingQuote(today())
  if (row.quote?.number) quote.number = row.quote.number
  const proposal = ADREAMING_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
  await applyChange(Number(row.id), 'system', 'system', () => ({ proposalHtml: proposal, quote, summary }))
}

/** 아토텍코리아 견적·제안서를 지금 코드의 내용으로 바꾼다(최종본 확정 전일 때만, 견적번호 유지). */
async function refreshAtotech(summary: string) {
  const found = await pool.query<{ id: string; finalized_at: Date | null; quote: { number?: string } | null }>(
    `SELECT id, finalized_at, quote FROM clients WHERE portal_slug = $1`,
    [ATOTECH_CLIENT.portalSlug],
  )
  const row = found.rows[0]
  if (!row || row.finalized_at) return
  const quote = atotechQuote(today())
  if (row.quote?.number) quote.number = row.quote.number
  const proposal = ATOTECH_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
  await applyChange(Number(row.id), 'system', 'system', () => ({ proposalHtml: proposal, quote, summary }))
}

/**
 * 어드리밍 담당자는 홈페이지 견적 문의(quote_requests)에서 가져온다(2026-10-19 kevin).
 * 담당자 이름·연락처를 업체 정보에 넣고, 연락처 뒷번호 4자리를 업체 링크 비밀번호로 둔다.
 * 담당자와 비밀번호가 둘 다 비어 있을 때만 채우므로, 관리자가 바꾼 값은 덮어쓰지 않는다.
 */
async function fillAdreamingContact() {
  const target = await pool.query<{ id: string }>(
    `SELECT id FROM clients WHERE portal_slug = $1 AND COALESCE(contact_person, '') = '' AND portal_password_hash IS NULL`,
    [ADREAMING_CLIENT.portalSlug],
  )
  if (!target.rows[0]) return
  const table = await pool.query<{ ok: boolean }>(`SELECT to_regclass('quote_requests') IS NOT NULL AS ok`)
  if (!table.rows[0]?.ok) return
  const found = await pool.query<{ name: string; phone: string }>(
    `SELECT name, phone FROM quote_requests
     WHERE company ILIKE '%어드리밍%' OR company ILIKE '%adreaming%' OR name ILIKE '%어드리밍%' OR message ILIKE '%어드리밍%'
     ORDER BY created_at DESC LIMIT 1`,
  )
  const req = found.rows[0]
  const digits = req ? phoneDigits(req.phone) : ''
  if (!req || digits.length < 4) return
  await pool.query(`UPDATE clients SET contact_person = $2, phone = $3, portal_password_hash = $4 WHERE id = $1`, [
    target.rows[0].id,
    req.name,
    req.phone,
    await hashPortalPassword(digits.slice(-4)),
  ])
}

/**
 * 코드로 넣는 업체를 한 번만 넣는다. 넣은 뒤 관리자가 지우거나 이름을 바꿔도 다시 생기지 않는다.
 * 넣다가 실패하면 표시도 되돌려 다음 조회 때 다시 시도한다.
 */
async function seedOnce(key: string, run: () => Promise<void>) {
  await pool.query(`CREATE TABLE IF NOT EXISTS client_seeds (key text primary key, created_at timestamptz not null default now())`)
  const { rowCount } = await pool.query(`INSERT INTO client_seeds (key) VALUES ($1) ON CONFLICT DO NOTHING`, [key])
  if (!rowCount) return
  try {
    await run()
  } catch (e) {
    await pool.query(`DELETE FROM client_seeds WHERE key = $1`, [key]).catch(() => {})
    throw e
  }
}

type Current = { proposalHtml: string; quote: unknown }
type Next = { proposalHtml?: string; quote?: Quote; summary: string }

/**
 * 제안서·견적서를 고치고 버전을 하나 남긴다. 확정된 업체면 LOCKED_MESSAGE 로 거절한다.
 * 저장한 내용이 바로 앞 버전과 같으면 버전을 늘리지 않는다. 남긴 버전 번호(없으면 null)를 돌려준다.
 */
async function applyChange(
  id: number,
  change: 'proposal' | 'quote' | 'system',
  by: string,
  mutate: (cur: Current) => Next | null,
): Promise<number | null> {
  const db: PoolClient = await pool.connect()
  try {
    await db.query('BEGIN')
    const { rows } = await db.query<{ proposal_html: string | null; quote: unknown; finalized_at: Date | null }>(
      `SELECT proposal_html, quote, finalized_at FROM clients WHERE id = $1 FOR UPDATE`,
      [id],
    )
    if (!rows[0]) throw new Error('업체를 찾을 수 없습니다.')
    if (rows[0].finalized_at) throw new Error(LOCKED_MESSAGE)
    const next = mutate({ proposalHtml: rows[0].proposal_html ?? '', quote: rows[0].quote })
    if (!next) {
      await db.query('ROLLBACK')
      return null
    }
    await db.query(
      `UPDATE clients SET proposal_html = COALESCE($2, proposal_html), quote = COALESCE($3::jsonb, quote), updated_at = now() WHERE id = $1`,
      [id, next.proposalHtml ?? null, next.quote ? JSON.stringify(next.quote) : null],
    )
    const ins = await db.query<{ version_no: number }>(
      `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
       SELECT c.id, COALESCE(l.version_no, 0) + 1, $2, $3, c.proposal_html, c.quote, $4
       FROM clients c
       LEFT JOIN LATERAL (SELECT * FROM client_versions v WHERE v.client_id = c.id ORDER BY version_no DESC LIMIT 1) l ON true
       WHERE c.id = $1
         AND (l.id IS NULL OR l.proposal_html IS DISTINCT FROM c.proposal_html OR l.quote IS DISTINCT FROM c.quote)
       RETURNING version_no`,
      [id, change, next.summary, by],
    )
    await db.query('COMMIT')
    return ins.rows[0]?.version_no ?? null
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    db.release()
  }
}

export type ClientInfo = {
  name: string
  /** 사업자등록번호. 견적서 수신란에 인쇄된다 */
  bizNumber: string
  contactPerson: string
  phone: string
  email: string
  siteAddress: string
  memo: string
  /** 업체용 링크 주소 (nm-solution.co.kr/<주소>). 영문 소문자·숫자·하이픈 */
  portalSlug: string
  /** 업체용 링크 아이디 (지금은 쓰지 않음, 비밀번호만으로 열림) */
  portalLogin: string
}

export type ClientRow = ClientInfo & {
  id: number
  proposalHtml: string
  quote: Quote
  createdAt: Date
  updatedAt: Date
  /** 최종본으로 확정한 버전. 확정 전이면 null */
  finalized: { version: number; at: Date; by: string } | null
  /** 업체용 링크 비밀번호가 정해져 있는지 */
  portalPasswordSet: boolean
}

type DbRow = {
  id: string
  name: string
  biz_number: string | null
  portal_slug: string | null
  portal_login: string | null
  portal_password_hash: string | null
  portal_share_hash?: string | null
  portal_share_expires?: Date | null
  contact_person: string | null
  phone: string | null
  email: string | null
  site_address: string | null
  memo: string | null
  proposal_html: string | null
  quote: unknown
  created_at: Date
  updated_at: Date
  finalized_version: number | null
  finalized_at: Date | null
  finalized_by: string | null
}

function toClient(r: DbRow): ClientRow {
  return {
    id: Number(r.id),
    name: r.name,
    bizNumber: r.biz_number ?? '',
    portalSlug: r.portal_slug ?? '',
    portalLogin: r.portal_login ?? '',
    portalPasswordSet: Boolean(r.portal_password_hash),
    contactPerson: r.contact_person ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    siteAddress: r.site_address ?? '',
    memo: r.memo ?? '',
    proposalHtml: r.proposal_html ?? '',
    quote: normalizeQuote(r.quote),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    finalized: r.finalized_at ? { version: r.finalized_version ?? 0, at: r.finalized_at, by: r.finalized_by ?? '' } : null,
  }
}

export async function listClients(): Promise<ClientRow[]> {
  await ensureClients()
  const { rows } = await pool.query<DbRow>(`SELECT * FROM clients ORDER BY updated_at DESC`)
  return rows.map(toClient)
}

export async function getClient(id: number): Promise<ClientRow | null> {
  if (!Number.isSafeInteger(id)) return null
  await ensureClients()
  const { rows } = await pool.query<DbRow>(`SELECT * FROM clients WHERE id = $1`, [id])
  return rows[0] ? toClient(rows[0]) : null
}

/** 업체용 링크 주소로 찾는다. 비밀번호 해시도 같이 돌려준다 */
export async function getClientBySlug(
  slug: string,
): Promise<(ClientRow & { portalPasswordHash: string; shareHash: string; shareExpires: Date | null }) | null> {
  await ensureClients()
  const { rows } = await pool.query<DbRow>(`SELECT * FROM clients WHERE portal_slug = $1`, [slug])
  return rows[0]
    ? {
        ...toClient(rows[0]),
        portalPasswordHash: rows[0].portal_password_hash ?? '',
        shareHash: rows[0].portal_share_hash ?? '',
        shareExpires: rows[0].portal_share_expires ?? null,
      }
    : null
}

export async function insertClient(info: ClientInfo, proposalHtml: string, quote: Quote, by: string): Promise<number> {
  await ensureClients()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO clients (name, contact_person, phone, email, site_address, memo, proposal_html, quote, biz_number, portal_slug, portal_login)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), $11) RETURNING id`,
    [info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.memo, proposalHtml, JSON.stringify(quote), info.bizNumber, info.portalSlug, info.portalLogin],
  )
  const id = Number(rows[0].id)
  await pool.query(
    `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
     VALUES ($1, 1, 'init', '업체 등록', $2, $3, $4) ON CONFLICT DO NOTHING`,
    [id, proposalHtml, JSON.stringify(quote), by],
  )
  return id
}

export async function updateClientInfo(id: number, info: ClientInfo) {
  await ensureClients()
  await pool.query(
    `UPDATE clients SET name = $2, contact_person = $3, phone = $4, email = $5, site_address = $6, memo = $7, biz_number = $8,
       portal_slug = NULLIF($9, ''), portal_login = $10, updated_at = now()
     WHERE id = $1`,
    [id, info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.memo, info.bizNumber, info.portalSlug, info.portalLogin],
  )
}

export async function setPortalPasswordHash(id: number, hash: string) {
  await ensureClients()
  await pool.query(`UPDATE clients SET portal_password_hash = $2, updated_at = now() WHERE id = $1`, [id, hash])
}

export async function updateProposal(id: number, html: string, by: string, summary = '제안서 수정') {
  await ensureClients()
  return applyChange(id, 'proposal', by, (cur) => (cur.proposalHtml === html ? null : { proposalHtml: html, summary }))
}

export async function updateQuote(id: number, quote: Quote, by: string) {
  await ensureClients()
  return applyChange(id, 'quote', by, (cur) => {
    const parts = changedQuoteParts(normalizeQuote(cur.quote), quote)
    return { quote, summary: parts.length ? `견적서 수정: ${parts.join(', ')}` : '견적서 저장' }
  })
}

export type VersionMeta = {
  no: number
  change: 'init' | 'proposal' | 'quote' | 'system'
  summary: string
  by: string
  at: Date
  /** 그 버전 견적서의 공급가액 */
  supply: number
}

export type Version = VersionMeta & { proposalHtml: string; quote: Quote }

/** 버전 목록 (최신이 먼저). 제안서 HTML 은 크므로 싣지 않는다 */
export async function listVersions(clientId: number): Promise<VersionMeta[]> {
  await ensureClients()
  const { rows } = await pool.query<{ version_no: number; change: VersionMeta['change']; summary: string | null; created_by: string | null; created_at: Date; quote: unknown }>(
    `SELECT version_no, change, summary, created_by, created_at, quote FROM client_versions WHERE client_id = $1 ORDER BY version_no DESC`,
    [clientId],
  )
  return rows.map((r) => ({
    no: r.version_no,
    change: r.change,
    summary: r.summary ?? '',
    by: r.created_by ?? '',
    at: r.created_at,
    supply: calcQuote(normalizeQuote(r.quote)).supply,
  }))
}

export async function getVersion(clientId: number, no: number): Promise<Version | null> {
  if (!Number.isSafeInteger(clientId) || !Number.isSafeInteger(no)) return null
  await ensureClients()
  const { rows } = await pool.query<{ version_no: number; change: VersionMeta['change']; summary: string | null; created_by: string | null; created_at: Date; quote: unknown; proposal_html: string | null }>(
    `SELECT * FROM client_versions WHERE client_id = $1 AND version_no = $2`,
    [clientId, no],
  )
  const r = rows[0]
  if (!r) return null
  const quote = normalizeQuote(r.quote)
  return {
    no: r.version_no,
    change: r.change,
    summary: r.summary ?? '',
    by: r.created_by ?? '',
    at: r.created_at,
    supply: calcQuote(quote).supply,
    proposalHtml: r.proposal_html ?? '',
    quote,
  }
}

/** 지금 최신 버전을 최종본으로 확정한다. 확정 후에는 제안서·견적서를 고칠 수 없다 */
export async function finalizeClient(id: number, by: string): Promise<number> {
  await ensureClients()
  const { rows } = await pool.query<{ finalized_version: number }>(
    `UPDATE clients c SET finalized_at = now(), finalized_by = $2,
       finalized_version = (SELECT MAX(version_no) FROM client_versions v WHERE v.client_id = c.id)
     WHERE c.id = $1 AND c.finalized_at IS NULL
     RETURNING finalized_version`,
    [id, by],
  )
  if (!rows[0]) throw new Error('이미 확정했거나 없는 업체입니다.')
  return rows[0].finalized_version
}

export async function removeClient(id: number) {
  await ensureClients()
  await pool.query(`DELETE FROM clients WHERE id = $1`, [id])
}
