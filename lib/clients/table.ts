import type { PoolClient } from 'pg'
import { pool } from '@/lib/db'
import { calcQuote, discountForGrand, normalizeQuote, today, type Quote } from './quote'
import { changedQuoteParts } from './compare'
import { kktProposalHtml } from './proposal'
import { KKT_PLAN_PAGE } from './kkt-plan-page'
import { KKT_CLIENT, KKT_DOOR_KEY, KKT_DOOR_SUMMARY, KKT_PLAN_MARK, KKT_PORTAL_KEY, KKT_PRUNE_KEY, KKT_PRUNE_SUMMARY, KKT_PUBLISH_KEY, KKT_NO_TARP_KEY, KKT_INSUL_BOTTOM_KEY, KKT_PLAN_KEY, KKT_PLAN_SUMMARY, KKT_GW_KEY, KKT_GW_SUMMARY, KKT_GW_GRAND, KKT_VIDEO_KEY, KKT_VIDEO_SUMMARY, KKT_YARD_KEY, KKT_YARD_SUMMARY, KKT_RESTORE_KEY, KKT_RESTORE_SUMMARY, KKT_Q1104_KEY, KKT_Q1104_SUMMARY, KKT_GW48_KEY, KKT_GW48_SUMMARY, KKT_DOOR_SECTION, KKT_YARD_NOTE_FROM, KKT_YARD_NOTE_TO, KKT_YARD_MOVE_DESC, KKT_INSUL_BOTTOM_HTML, KKT_INSUL_BOTTOM_SUMMARY, KKT_GRAND_TARGET, KKT_TARP_ARTICLE, KKT_TARP_INTRO, KKT_QUOTE, KKT_QUOTE_ONLY_PAGE, addKktDoor, upgradeKkt } from './seed-kkt'
import { SINIL_CLIENT, SINIL_PORTAL_PASSWORD_HASH, SINIL_SEED_KEY, SINIL_REV3_KEY, SINIL_REV4_KEY, SINIL_PAGE_V6_KEY, SINIL_SHARE, sinilRentalItems, SINIL_UPDATE_KEY, sinilQuote } from './seed-sinil'
import { SINIL_PAGE_HTML } from './sinil-page'
import { ADREAMING_CLIENT, ADREAMING_REV2_KEY, ADREAMING_REV3_KEY, ADREAMING_REV4_KEY, ADREAMING_REV5_KEY, ADREAMING_REV6_KEY, ADREAMING_SEED_KEY, adreamingQuote } from './seed-adreaming'
import { ADREAMING_PAGE_HTML } from './adreaming-page'
import { ATOTECH_CLIENT, ATOTECH_REV2_KEY, ATOTECH_REV3_KEY, ATOTECH_REV4_KEY, ATOTECH_REV5_KEY, ATOTECH_REV6_KEY, ATOTECH_REV7_KEY, ATOTECH_REV8_KEY, ATOTECH_REV9_KEY, ATOTECH_REV10_KEY, ATOTECH_REV11_KEY, ATOTECH_REV12_KEY, ATOTECH_REV13_KEY, ATOTECH_REV14_KEY, ATOTECH_SEED_KEY, atotechQuote } from './seed-atotech'
import { ATOTECH_PAGE_HTML } from './atotech-page'
import { SEONGWON_CLIENT, SEONGWON_REV2_KEY, SEONGWON_REV3_KEY, SEONGWON_REV4_KEY, SEONGWON_REV5_KEY, SEONGWON_REV6_KEY, SEONGWON_REV7_KEY, SEONGWON_REV8_KEY, SEONGWON_REV9_KEY, SEONGWON_REV10_KEY, SEONGWON_SEED_KEY, seongwonQuote } from './seed-seongwon'
import { SEONGWON_PAGE_HTML } from './seongwon-page'
import { JSTECH_CLIENT, JSTECH_REV2_KEY, JSTECH_REV3_KEY, JSTECH_SEED_KEY, jstechQuote } from './seed-jstech'
import { JSTECH_PAGE_HTML } from './jstech-page'
import { SEOULGLASS_CLIENT, SEOULGLASS_REV2_KEY, SEOULGLASS_REV3_KEY, SEOULGLASS_REV4_KEY, SEOULGLASS_REV5_KEY, SEOULGLASS_REV6_KEY, SEOULGLASS_SEED_KEY, seoulglassQuote } from './seed-seoulglass'
import { SEOULGLASS_PAGE_HTML } from './seoulglass-page'
import { hashPortalPassword } from './portal-password'
import { phoneDigits } from '@/lib/quote'

/**
 * 업체 관리(제안서·견적서) 표. sql/007_clients.sql, sql/008_client_versions.sql 과 같은 모양.
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다(lib/site-events-table.ts 와 같은 방식).
 * 표를 처음 만들 때 금강변압기 제안서·견적서를 첫 업체로 넣는다.
 *
 * 버전: 제안서·견적서를 저장할 때마다 client_versions 에 그때의 제안서·견적서 전체를 한 벌 남긴다.
 * 계약 확정(finalized_at, 2026-11-02 전 이름 '최종본 확정')이 되면 제안서·견적서는 더 고칠 수 없다. 해제(unfinalizeClient)하면 다시 고칠 수 있다.
 * 고객 화면에 어떤 버전이 보이는지는 lib/clients/exposure.ts(최신 자동 또는 고정).
 */
let ready: Promise<void> | null = null

export const LOCKED_MESSAGE = '계약 확정으로 잠긴 견적이라 제안서·견적서를 고칠 수 없습니다. 고치려면 버전 기록에서 계약 확정을 먼저 해제하세요.'

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
        ADD COLUMN IF NOT EXISTS portal_share_expires timestamptz,
        ADD COLUMN IF NOT EXISTS parent_id bigint REFERENCES clients(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS quote_label text`)
      await pool.query(`CREATE INDEX IF NOT EXISTS clients_parent_idx ON clients (parent_id) WHERE parent_id IS NOT NULL`)
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
      const kkt = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND finalized_at IS NULL AND parent_id IS NULL`, [KKT_CLIENT.name])
      if (kkt.rows.length) {
        const { PAGE_HTML } = await import('@/app/kkt/page-html')
        for (const r of kkt.rows) {
          await applyChange(Number(r.id), 'system', '자동 정리', (cur) => {
            const up = upgradeKkt(normalizeQuote(cur.quote), cur.proposalHtml, () => kktProposalHtml(PAGE_HTML))
            return up && { proposalHtml: up.proposalHtml, quote: up.quote, summary: up.summary }
          }).catch(() => null)
        }
      }
      // 금강변압기: 다른 업체와 같은 업체 페이지(/kkt)로 옮긴다(2026-10-30 kevin). 비밀번호는 지금까지 쓰던 KKT_PASSWORD 를 업체 비밀번호로,
      // 업체 페이지에는 작업계획서를 내리고 견적서만(정비 전까지). 이미 확정한 발송본도 견적서가 보이도록 같은 틀로 바꾼다
      await seedOnce(KKT_PORTAL_KEY, async () => {
        const found = await pool.query<{ id: string; finalized_at: Date | null; portal_password_hash: string | null }>(
          `SELECT id, finalized_at, portal_password_hash FROM clients WHERE name = $1 ORDER BY id LIMIT 1`,
          [KKT_CLIENT.name],
        )
        const row = found.rows[0]
        if (!row) return
        const id = Number(row.id)
        const taken = await pool.query(`SELECT 1 FROM clients WHERE portal_slug = $1 AND id <> $2`, [KKT_CLIENT.portalSlug, id])
        if (!taken.rows.length) await pool.query(`UPDATE clients SET portal_slug = COALESCE(portal_slug, $2) WHERE id = $1`, [id, KKT_CLIENT.portalSlug])
        const password = process.env.KKT_PASSWORD?.trim()
        if (!row.portal_password_hash && password) {
          await pool.query(`UPDATE clients SET portal_password_hash = $2 WHERE id = $1`, [id, await hashPortalPassword(password)])
        }
        if (!row.finalized_at) {
          await applyChange(id, 'system', 'system', (cur) =>
            cur.proposalHtml.includes('<!--NM:QUOTE-->') ? null : { proposalHtml: KKT_QUOTE_ONLY_PAGE, summary: '업체 페이지(/kkt)를 공통 구조로: 작업계획서는 정비 전까지 내리고 견적서만' },
          )
        }
        const sends = await pool.query<{ t: string | null }>(`SELECT to_regclass('client_sends') AS t`)
        if (sends.rows[0]?.t) {
          await pool.query(
            `UPDATE client_sends SET proposal_html = $2 WHERE client_id = $1 AND position('<!--NM:QUOTE-->' in COALESCE(proposal_html, '')) = 0`,
            [id, KKT_QUOTE_ONLY_PAGE],
          )
        }
      })
      // 2026-11-02 kevin: 금강변압기 본체 보온 400T 재산출·슬라이딩 도어 보온·우천 천막 공종(계약 확정 전, 고객 화면은 고정해 비노출)
      await seedOnce(KKT_DOOR_KEY, async () => {
        const found = await pool.query<{ id: string; finalized_at: Date | null }>(`SELECT id, finalized_at FROM clients WHERE name = $1 ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row || row.finalized_at) return
        // kevin: 고객에게는 아직 보이지 않게. 고객 화면을 지금 최신 버전(10-30 견적)에 고정한 뒤 고친다(lib/clients/exposure.ts).
        // 고객에게 보이려면 어드민 업체 화면 '고객 화면'에서 '최신 자동으로'를 누른다
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_version int`)
        await pool.query(
          `UPDATE clients SET portal_version = (SELECT MAX(version_no) FROM client_versions
                                                 WHERE client_id = $1 AND position('슬라이딩 도어 보온 작업' in quote::text) = 0)
            WHERE id = $1 AND portal_version IS NULL`,
          [row.id],
        )
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const next = addKktDoor(normalizeQuote(cur.quote))
          // 견적 전용 페이지에 보온 작업 제안(본체 400T + 50T 그라스울 패널, 도어 400T + 함석 커버)이 없으면 새 페이지로
          // 보온 제안이 없거나 앞선 400T 안(v2 미네랄울·v3 그라스울)이면 300T 안 페이지로 바꾼다
          const oldPlan = !cur.proposalHtml.includes(KKT_PLAN_MARK)
          const page = cur.proposalHtml.includes('<!--NM:QUOTE-->') && oldPlan ? KKT_QUOTE_ONLY_PAGE : undefined
          if (!next && !page) return null
          return { ...(next ? { quote: next } : {}), ...(page ? { proposalHtml: page } : {}), summary: KKT_DOOR_SUMMARY }
        })
      })
      // 2026-11-02 kevin: "1억4천5백 정도 만들었던 견적(10-30, 공급가 142,279,000) 이후 견적 모두 지우고 지금 걸로". 고객 화면에 고정된
      // 10-30 버전 뒤에 같은 날 쌓인 중간 안(400T 미네랄울·400T 그라스울)을 지우고, 최신 300T 안을 바로 다음 번호로 당긴다.
      // 발송 기록·계약 확정에 쓰인 버전은 지우지 않는다. 고객 화면 고정은 그대로 둔다
      await seedOnce(KKT_PRUNE_KEY, async () => {
        const found = await pool.query<{ id: string; portal_version: number | null; finalized_version: number | null }>(
          `SELECT id, portal_version, finalized_version FROM clients WHERE name = $1 AND parent_id IS NULL ORDER BY id LIMIT 1`,
          [KKT_CLIENT.name],
        )
        const row = found.rows[0]
        if (!row) return
        const id = Number(row.id)
        const base = await pool.query<{ v: number | null }>(
          `SELECT MAX(version_no) AS v FROM client_versions WHERE client_id = $1 AND position('슬라이딩 도어 보온 작업' in quote::text) = 0`,
          [id],
        )
        const keep = row.portal_version ?? base.rows[0]?.v
        const last = await pool.query<{ v: number | null }>(`SELECT MAX(version_no) AS v FROM client_versions WHERE client_id = $1`, [id])
        const latest = last.rows[0]?.v
        if (!keep || !latest || latest <= keep + 1) return
        const sends = await pool.query<{ t: string | null }>(`SELECT to_regclass('client_sends') AS t`)
        const sent = sends.rows[0]?.t
          ? (await pool.query<{ v: number }>(`SELECT DISTINCT version_no AS v FROM client_sends WHERE client_id = $1 AND version_no IS NOT NULL`, [id])).rows.map((r) => r.v)
          : []
        const locked = [...sent, ...(row.finalized_version ? [row.finalized_version] : [])]
        await pool.query(
          `DELETE FROM client_versions WHERE client_id = $1 AND version_no > $2 AND version_no < $3 AND NOT (version_no = ANY($4::int[]))`,
          [id, keep, latest, locked],
        )
        const gap = await pool.query(`SELECT 1 FROM client_versions WHERE client_id = $1 AND version_no > $2 AND version_no < $3`, [id, keep, latest])
        const to = gap.rows.length ? latest : keep + 1
        await pool.query(`UPDATE client_versions SET version_no = $3, summary = $4 WHERE client_id = $1 AND version_no = $2`, [id, latest, to, KKT_PRUNE_SUMMARY])
      })
      // 2026-11-02 kevin "우선 올려줘": 정리된 300T 견적을 고객 화면(/kkt)에 보이게 고정을 푼다(최신 자동). 다시 숨기려면 어드민 '고객 화면'에서 고정
      await seedOnce(KKT_PUBLISH_KEY, async () => {
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_version int`)
        await pool.query(`UPDATE clients SET portal_version = NULL WHERE name = $1 AND parent_id IS NULL`, [KKT_CLIENT.name])
      })
      // 2026-11-02 kevin "우천 가설천막 작업 제외했어 내가": 천막 공종(남아 있으면)·천막 특기사항 줄·보온 제안의 천막 카드와 문구를 뺀다
      await seedOnce(KKT_NO_TARP_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const sections = q.sections.filter((s) => s.name !== '우천 대비 가설 천막 작업')
          const notes = q.notes.split('\n').filter((l) => !l.startsWith('보온 작업 기간에는')).join('\n')
          const html = cur.proposalHtml.split(KKT_TARP_ARTICLE).join('').split(KKT_TARP_INTRO[0]).join(KKT_TARP_INTRO[1])
          const quoteChanged = sections.length !== q.sections.length || notes !== q.notes
          if (!quoteChanged && html === cur.proposalHtml) return null
          return {
            ...(quoteChanged ? { quote: { ...q, sections, notes } } : {}),
            ...(html !== cur.proposalHtml ? { proposalHtml: html } : {}),
            summary: '우천 대비 가설 천막 제외에 맞춰 특기사항·보온 작업 제안의 천막 문구 정리',
          }
        })
      })
      // 2026-11-02 kevin: 본체 보온 하부 포함 실제 치수(그라스울 패널), 슬라이딩 도어 인건비 상향, 인양·용접 공종은 그대로 두고
      // 부가세 포함 1억 8천 초반(181,500,000)으로 가격 조정. 고객 화면은 최신 자동이라 바로 보인다
      await seedOnce(KKT_INSUL_BOTTOM_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const next = addKktDoor(q) ?? q
          const discount = discountForGrand({ ...next, discount: 0 }, KKT_GRAND_TARGET) ?? next.discount
          const quote = { ...next, discount }
          const html = cur.proposalHtml.split(KKT_INSUL_BOTTOM_HTML[0]).join(KKT_INSUL_BOTTOM_HTML[1])
          const quoteChanged = JSON.stringify(quote) !== JSON.stringify(q)
          if (!quoteChanged && html === cur.proposalHtml) return null
          return { ...(quoteChanged ? { quote } : {}), ...(html !== cur.proposalHtml ? { proposalHtml: html } : {}), summary: KKT_INSUL_BOTTOM_SUMMARY }
        })
      })
      // 2026-11-02 kevin "작업계획서까지 업데이트": 견적서만 있던 업체 페이지를 정비한 작업계획서 + 견적서로 바꾼다(계약 확정 전만)
      await seedOnce(KKT_PLAN_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        const page = kktProposalHtml(KKT_PLAN_PAGE)
        await applyChange(Number(row.id), 'system', 'system', (cur) => (cur.proposalHtml === page ? null : { proposalHtml: page, summary: KKT_PLAN_SUMMARY }))
      })
      // 2026-11-02 kevin "미네랄울일 이유가 없음": 본체·도어 보온재를 그라스울 매트 250T(50T 5겹)로, 보온 인원 증원·분진 보호 강화, 부가세 포함 183,150,000,
      // 작업계획서 페이지도 같은 문구로 다시 넣는다(계약 확정 전만)
      await seedOnce(KKT_GW_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        const page = kktProposalHtml(KKT_PLAN_PAGE)
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const next = addKktDoor(q) ?? q
          const quote = { ...next, discount: discountForGrand({ ...next, discount: 0 }, KKT_GW_GRAND) ?? next.discount }
          const quoteChanged = JSON.stringify(quote) !== JSON.stringify(q)
          if (!quoteChanged && cur.proposalHtml === page) return null
          return { ...(quoteChanged ? { quote } : {}), ...(cur.proposalHtml !== page ? { proposalHtml: page } : {}), summary: KKT_GW_SUMMARY }
        })
      })
      // 금강변압기: 도어 매트 수량 정정 + 영상·일차별 상세 공정 들어간 작업계획서 (2026-11-02)
      await seedOnce(KKT_VIDEO_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        const page = kktProposalHtml(KKT_PLAN_PAGE)
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const next = addKktDoor(q) ?? q
          const quote = { ...next, discount: discountForGrand({ ...next, discount: 0 }, KKT_GW_GRAND) ?? next.discount }
          const quoteChanged = JSON.stringify(quote) !== JSON.stringify(q)
          if (!quoteChanged && cur.proposalHtml === page) return null
          return { ...(quoteChanged ? { quote } : {}), ...(cur.proposalHtml !== page ? { proposalHtml: page } : {}), summary: KKT_VIDEO_SUMMARY }
        })
      })
      // 금강변압기: 도어부 마당 방향 안착, 슬라이딩 도어는 마당에 눕힌 채 보온 (2026-11-02)
      await seedOnce(KKT_YARD_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        const page = kktProposalHtml(KKT_PLAN_PAGE)
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const n0 = addKktDoor(q) ?? q
          const next = { ...n0, notes: n0.notes.replace(KKT_YARD_NOTE_FROM, KKT_YARD_NOTE_TO), sections: n0.sections.map((x) => (x.desc.startsWith('완성품 전체 인양') ? { ...x, desc: KKT_YARD_MOVE_DESC } : x)) }
          const quote = { ...next, discount: discountForGrand({ ...next, discount: 0 }, KKT_GW_GRAND) ?? next.discount }
          const quoteChanged = JSON.stringify(quote) !== JSON.stringify(q)
          if (!quoteChanged && cur.proposalHtml === page) return null
          return { ...(quoteChanged ? { quote } : {}), ...(cur.proposalHtml !== page ? { proposalHtml: page } : {}), summary: KKT_YARD_SUMMARY }
        })
      })
      await seedOnce(KKT_RESTORE_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        const page = kktProposalHtml(KKT_PLAN_PAGE)
        await applyChange(Number(row.id), 'system', 'system', (cur) => (cur.proposalHtml === page ? null : { proposalHtml: page, summary: KKT_RESTORE_SUMMARY }))
      })
      await seedOnce(KKT_Q1104_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        const page = kktProposalHtml(KKT_PLAN_PAGE)
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const hasDoor = q.sections.some((x) => x.name === KKT_DOOR_SECTION.name)
          const sections = hasDoor ? q.sections.map((x) => (x.name === KKT_DOOR_SECTION.name ? KKT_DOOR_SECTION : x)) : [...q.sections, KKT_DOOR_SECTION]
          const base = { ...q, sections, date: KKT_QUOTE.date }
          const quote = { ...base, discount: discountForGrand({ ...base, discount: 0 }, 167_200_000) ?? KKT_QUOTE.discount }
          return { quote, ...(cur.proposalHtml !== page ? { proposalHtml: page } : {}), summary: KKT_Q1104_SUMMARY }
        })
      await seedOnce(KKT_GW48_KEY, async () => {
        const found = await pool.query<{ id: string }>(`SELECT id FROM clients WHERE name = $1 AND parent_id IS NULL AND finalized_at IS NULL ORDER BY id LIMIT 1`, [KKT_CLIENT.name])
        const row = found.rows[0]
        if (!row) return
        const page = kktProposalHtml(KKT_PLAN_PAGE)
        await applyChange(Number(row.id), 'system', 'system', (cur) => {
          const q = normalizeQuote(cur.quote)
          const code = new Map(KKT_QUOTE.sections.map((x) => [x.name, x]))
          const sections = q.sections.map((x) => (/보온/.test(x.name) && code.has(x.name) ? code.get(x.name)! : x))
          const quote = { ...q, sections, notes: KKT_QUOTE.notes, discount: KKT_QUOTE.discount }
          return { quote, ...(cur.proposalHtml !== page ? { proposalHtml: page } : {}), summary: KKT_GW48_SUMMARY }
        })
      })
      })
      // 신일공업: 처음이면 넣고, 앞선 등록본(빈 견적 틀·기본 제안서)이 있으면 작업계획 페이지·견적으로 바꾼다
      await seedOnce(SINIL_SEED_KEY, async () => {
        const c = SINIL_CLIENT
        const quote = sinilQuote(today())
        const proposal = SINIL_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
        const found = await pool.query<{ id: string; finalized_at: Date | null }>(`SELECT id, finalized_at FROM clients WHERE name = $1 AND parent_id IS NULL`, [c.name])
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
      await seedOnce(ATOTECH_REV12_KEY, () => refreshAtotech('반입 고급기능공 추가, 고급 35만·중급 28만·전기 35만'))
      await seedOnce(ATOTECH_REV13_KEY, () => refreshAtotech('펌프 교체 제외, 배관 구조 변경만 (제안 1 + 제안 2 선택)'))
      await seedOnce(ATOTECH_REV14_KEY, () => refreshAtotech('사전 제작 배관공 대신 조공, 현장 주말 2일 용접사 1·배관공 1, 에어벤트 서플라이 1세트'))
      // 성원냉동기계: 안성 공장 2층 창고 바닥 철골 구조. 담당자·업체용 비밀번호는 관리자 업체 정보에서 정한다
      await seedOnce(SEONGWON_SEED_KEY, async () => {
        const c = SEONGWON_CLIENT
        const found = await pool.query(`SELECT 1 FROM clients WHERE name = $1 OR portal_slug = $2`, [c.name, c.portalSlug])
        if (found.rows.length) return
        const quote = seongwonQuote(today())
        const proposal = SEONGWON_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
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
      await seedOnce(SEONGWON_REV2_KEY, () => refreshSeongwon('H빔 길이 지정(연속보 20m·벽보 58m·가로보 48m), 가운데 기둥 H-250×250 8m 추가'))
      await seedOnce(SEONGWON_REV3_KEY, () => refreshSeongwon('벽보·가로보 적산 물량으로 되돌림'))
      await seedOnce(SEONGWON_REV4_KEY, () => refreshSeongwon('프레임·바닥판·계단·도장·공통을 한 공종으로 합침'))
      await seedOnce(SEONGWON_REV5_KEY, () => refreshSeongwon('기둥 11본 새로 구매, 팀장 40만, 조공 공정마다 1명 추가'))
      await seedOnce(SEONGWON_REV6_KEY, () => refreshSeongwon('인원 팀장급 기공 1·용접 기공 2·중급 기공 3 × 10일'))
      await seedOnce(SEONGWON_REV7_KEY, () => refreshSeongwon('인원 용접기공·중급기공·조공·도장공 구성, 팀장 40만'))
      await seedOnce(SEONGWON_REV8_KEY, () => refreshSeongwon('PR #96 견적 기준, 용접기공 35만·고급기공(팀장) 40만, 강재 kg당 1,300원'))
      // 등록 때 저장된 제안서에는 3D 섹션이 없어서 지금 페이지로 한 번 바꾼다(2026-10-27 kevin)
      await seedOnce(SEONGWON_REV9_KEY, () => refreshSeongwon('제안서에 3D 모델(웹 회전 보기·사진 6컷) 추가'))
      await seedOnce(SEONGWON_REV10_KEY, () => refreshSeongwon('일반관리비 6%, 산업안전보건관리비 제외'))
      // 제이에스테크: 수원 공장 승강기 타워 외벽 하부 파손 보수. 업체 링크 비밀번호는 담당자 연락처 뒷번호 4자리(2026-10-28)
      await seedOnce(JSTECH_SEED_KEY, async () => {
        const c = JSTECH_CLIENT
        const found = await pool.query(`SELECT 1 FROM clients WHERE name = $1 OR portal_slug = $2`, [c.name, c.portalSlug])
        if (found.rows.length) return
        const quote = jstechQuote(today())
        const proposal = JSTECH_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO clients (name, biz_number, contact_person, phone, email, site_address, memo, proposal_html, quote, portal_slug, portal_login, portal_password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [c.name, c.bizNumber, c.contactPerson, c.phone, c.email, c.siteAddress, c.memo, proposal, JSON.stringify(quote), c.portalSlug, c.portalLogin, await hashPortalPassword(c.portalPassword)],
        )
        await pool.query(
          `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
           VALUES ($1, 1, 'init', '업체 등록', $2, $3, 'system') ON CONFLICT DO NOTHING`,
          [rows[0].id, proposal, JSON.stringify(quote)],
        )
      })
      await seedOnce(JSTECH_REV2_KEY, () => refreshJstech('색상을 못 맞출 때 보정 도장 20만 원 선택 항목 추가'))
      await seedOnce(JSTECH_REV3_KEY, () => refreshJstech('안쪽 방화보드 3×6 5장·조공 1명 추가'))
      // 서울 차량 유리 교체 상가: 골목 처마 신설·끝단 벽체 마감. 업체 링크 비밀번호는 담당자 연락처 뒷번호 4자리(2026-10-30)
      await seedOnce(SEOULGLASS_SEED_KEY, async () => {
        const c = SEOULGLASS_CLIENT
        const found = await pool.query(`SELECT 1 FROM clients WHERE name = $1 OR portal_slug = $2`, [c.name, c.portalSlug])
        if (found.rows.length) return
        const quote = seoulglassQuote(today())
        const proposal = SEOULGLASS_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO clients (name, biz_number, contact_person, phone, email, site_address, memo, proposal_html, quote, portal_slug, portal_login, portal_password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [c.name, c.bizNumber, c.contactPerson, c.phone, c.email, c.siteAddress, c.memo, proposal, JSON.stringify(quote), c.portalSlug, c.portalLogin, await hashPortalPassword(c.portalPassword)],
        )
        await pool.query(
          `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
           VALUES ($1, 1, 'init', '업체 등록', $2, $3, 'system') ON CONFLICT DO NOTHING`,
          [rows[0].id, proposal, JSON.stringify(quote)],
        )
        // 발송 견적번호 재료(업체 코드·공종). sends.ts 의 처음 코드 넣기는 이미 끝났으므로 여기서 바로 넣는다
        await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS quote_code text, ADD COLUMN IF NOT EXISTS work_code text`)
        await pool.query(`UPDATE clients SET quote_code = 'SCG', work_code = 'PANEL' WHERE id = $1`, [rows[0].id])
      })
      await seedOnce(SEOULGLASS_REV2_KEY, () => refreshSeoulglass('현장 경비 제외·일반관리비 5%·부자재 축소, 공급가 7,015,000'))
      await seedOnce(SEOULGLASS_REV3_KEY, () => refreshSeoulglass('건물 벽 의자 베이스·옹벽 쪽 14m 판넬 벽(기둥·도리 없앰)·내부 문, 공급가 7,837,000'))
      await seedOnce(SEOULGLASS_REV4_KEY, () => refreshSeoulglass('처마 옹벽 높은 구간 기준·물받이 옹벽 위·낮은 구간 처마 막음 후레싱·보강 기둥 복귀·안쪽 판넬 벽 11m, 공급가 7,983,000'))
      await seedOnce(SEOULGLASS_REV5_KEY, () => refreshSeoulglass('후레싱 13m·벽체 22,000·양쪽 배수·안쪽 벽 10.5m·문 건물 벽 쪽·가격 조정(NEGO) 할인 415,000, 공급가 7,500,000'))
      await seedOnce(SEOULGLASS_REV6_KEY, async () => {
        // 10-30 '최종본 확정'(v3)으로 잠겨 REV4·REV5 가 건너뛰어졌음. 고객 화면은 발송본(client_sends)이 담당하므로 잠금을 풀고 갱신한다
        await pool.query(`UPDATE clients SET finalized_at = NULL, finalized_by = NULL, finalized_version = NULL WHERE portal_slug = $1`, [SEOULGLASS_CLIENT.portalSlug])
        await refreshSeoulglass('최종본 잠금 해제 후 11-02 최종안 반영: 후레싱 13m·벽체 22,000·양쪽 배수·안쪽 벽 10.5m·문 건물 벽 쪽·가격 조정(NEGO) 할인 415,000, 공급가 7,500,000')
      })
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

/** 성원냉동기계 견적·제안서·업체 메모를 지금 코드의 내용으로 바꾼다(최종본 확정 전일 때만, 견적번호 유지). */
async function refreshSeongwon(summary: string) {
  const found = await pool.query<{ id: string; finalized_at: Date | null; quote: { number?: string } | null }>(
    `SELECT id, finalized_at, quote FROM clients WHERE portal_slug = $1`,
    [SEONGWON_CLIENT.portalSlug],
  )
  const row = found.rows[0]
  if (!row || row.finalized_at) return
  await pool.query(`UPDATE clients SET memo = $2 WHERE id = $1`, [Number(row.id), SEONGWON_CLIENT.memo])
  const quote = seongwonQuote(today())
  if (row.quote?.number) quote.number = row.quote.number
  const proposal = SEONGWON_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
  await applyChange(Number(row.id), 'system', 'system', () => ({ proposalHtml: proposal, quote, summary }))
}

/** 제이에스테크 견적·제안서·업체 메모를 지금 코드의 내용으로 바꾼다(최종본 확정 전일 때만, 견적번호 유지). */
async function refreshJstech(summary: string) {
  const found = await pool.query<{ id: string; finalized_at: Date | null; quote: { number?: string } | null }>(
    `SELECT id, finalized_at, quote FROM clients WHERE portal_slug = $1`,
    [JSTECH_CLIENT.portalSlug],
  )
  const row = found.rows[0]
  if (!row || row.finalized_at) return
  await pool.query(`UPDATE clients SET memo = $2 WHERE id = $1`, [Number(row.id), JSTECH_CLIENT.memo])
  const quote = jstechQuote(today())
  if (row.quote?.number) quote.number = row.quote.number
  const proposal = JSTECH_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
  await applyChange(Number(row.id), 'system', 'system', () => ({ proposalHtml: proposal, quote, summary }))
}

/** 서울 차량 유리 교체 상가 업체의 견적·제안서를 지금 코드의 내용으로 바꾼다(최종본 확정 전일 때만, 견적번호 유지). */
async function refreshSeoulglass(summary: string) {
  const found = await pool.query<{ id: string; finalized_at: Date | null; quote: { number?: string } | null }>(
    `SELECT id, finalized_at, quote FROM clients WHERE portal_slug = $1`,
    [SEOULGLASS_CLIENT.portalSlug],
  )
  const row = found.rows[0]
  if (!row || row.finalized_at) return
  await pool.query(`UPDATE clients SET memo = $2 WHERE id = $1`, [Number(row.id), SEOULGLASS_CLIENT.memo])
  const quote = seoulglassQuote(today())
  if (row.quote?.number) quote.number = row.quote.number
  const proposal = SEOULGLASS_PAGE_HTML.split('{{QUOTE_NO}}').join(quote.number)
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
 * 제안서·견적서를 고치고 버전을 하나 남긴다. 계약 확정으로 잠긴 업체면 LOCKED_MESSAGE 로 거절한다.
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
  /** 계약 확정(잠금)한 버전. 확정 전이면 null */
  finalized: { version: number; at: Date; by: string } | null
  /** 업체용 링크 비밀번호가 정해져 있는지 */
  portalPasswordSet: boolean
  /** 추가 견적서면 본 견적(업체) id. 본 견적이면 null (kevin 2026-10-28 "업체 별 공정, 견적서 추가가 가능해야 함") */
  parentId: number | null
  /** 견적서 이름 (예: 본 공사, 추가 공정: 배관 보온). 비면 본 견적은 '본 견적' */
  quoteLabel: string
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
  parent_id?: string | null
  quote_label?: string | null
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
    parentId: r.parent_id ? Number(r.parent_id) : null,
    quoteLabel: r.quote_label ?? '',
  }
}

/** 견적서 이름. 추가 견적인데 이름이 비었으면 '추가 견적' */
export function quoteLabelOf(c: Pick<ClientRow, 'parentId' | 'quoteLabel'>) {
  return c.quoteLabel.trim() || (c.parentId ? '추가 견적' : '본 견적')
}

/** 한 업체의 견적서 전부: 본 견적(업체) 먼저, 추가 견적은 만든 순서 */
export async function listQuoteSet(id: number): Promise<ClientRow[]> {
  if (!Number.isSafeInteger(id)) return []
  await ensureClients()
  const { rows } = await pool.query<DbRow>(
    `SELECT * FROM clients WHERE id = (SELECT COALESCE(parent_id, id) FROM clients WHERE id = $1)
        OR parent_id = (SELECT COALESCE(parent_id, id) FROM clients WHERE id = $1)
     ORDER BY parent_id NULLS FIRST, id`,
    [id],
  )
  return rows.map(toClient)
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

export async function insertClient(
  info: ClientInfo,
  proposalHtml: string,
  quote: Quote,
  by: string,
  extra: { parentId?: number | null; quoteLabel?: string } = {},
): Promise<number> {
  await ensureClients()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO clients (name, contact_person, phone, email, site_address, memo, proposal_html, quote, biz_number, portal_slug, portal_login, parent_id, quote_label)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), $11, $12, NULLIF($13, '')) RETURNING id`,
    [
      info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.memo, proposalHtml, JSON.stringify(quote),
      info.bizNumber, info.portalSlug, info.portalLogin, extra.parentId ?? null, extra.quoteLabel ?? '',
    ],
  )
  const id = Number(rows[0].id)
  await pool.query(
    `INSERT INTO client_versions (client_id, version_no, change, summary, proposal_html, quote, created_by)
     VALUES ($1, 1, 'init', $5, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [id, proposalHtml, JSON.stringify(quote), by, extra.parentId ? '견적서 추가' : '업체 등록'],
  )
  return id
}

/** 견적서 이름 바꾸기 */
export async function updateQuoteLabel(id: number, label: string) {
  await ensureClients()
  await pool.query(`UPDATE clients SET quote_label = NULLIF($2, ''), updated_at = now() WHERE id = $1`, [id, label])
}

export async function updateClientInfo(id: number, info: ClientInfo) {
  await ensureClients()
  await pool.query(
    `UPDATE clients SET name = $2, contact_person = $3, phone = $4, email = $5, site_address = $6, memo = $7, biz_number = $8,
       portal_slug = NULLIF($9, ''), portal_login = $10, updated_at = now()
     WHERE id = $1`,
    [id, info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.memo, info.bizNumber, info.portalSlug, info.portalLogin],
  )
  // 추가 견적서는 본 견적의 기업정보를 그대로 따라간다 (업체용 링크·메모는 본 견적에만)
  await pool.query(
    `UPDATE clients SET name = $2, contact_person = $3, phone = $4, email = $5, site_address = $6, biz_number = $7, updated_at = now()
     WHERE parent_id = $1`,
    [id, info.name, info.contactPerson, info.phone, info.email, info.siteAddress, info.bizNumber],
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

/** 계약 확정: 지금 최신 버전을 계약본으로 잠근다. 해제 전에는 제안서·견적서를 고칠 수 없다 */
export async function finalizeClient(id: number, by: string): Promise<number> {
  await ensureClients()
  const { rows } = await pool.query<{ finalized_version: number }>(
    `UPDATE clients c SET finalized_at = now(), finalized_by = $2,
       finalized_version = (SELECT MAX(version_no) FROM client_versions v WHERE v.client_id = c.id)
     WHERE c.id = $1 AND c.finalized_at IS NULL
     RETURNING finalized_version`,
    [id, by],
  )
  if (!rows[0]) throw new Error('이미 계약 확정했거나 없는 업체입니다.')
  return rows[0].finalized_version
}

/** 계약 확정 해제: 잠금을 풀어 다시 고칠 수 있게 한다 (2026-11-02 kevin: 확정은 계약 시점에만, 되돌릴 수 있게) */
export async function unfinalizeClient(id: number) {
  await ensureClients()
  const { rowCount } = await pool.query(
    `UPDATE clients SET finalized_at = NULL, finalized_by = NULL, finalized_version = NULL WHERE id = $1 AND finalized_at IS NOT NULL`,
    [id],
  )
  if (!rowCount) throw new Error('계약 확정 상태가 아니거나 없는 업체입니다.')
}

export async function removeClient(id: number) {
  await ensureClients()
  await pool.query(`DELETE FROM clients WHERE id = $1`, [id])
}
