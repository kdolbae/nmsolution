import { pool } from '@/lib/db'
import { contactLabel, type CardContact } from '@/lib/clients/cards'
import { normalizeParty, type PoParty } from './doc'
import { ensureOrders } from './table'

/**
 * 발주 사업자·발주처 명함. 명함 사진을 올리면 Claude 가 읽어 이름·직함·전화번호를 담당자 칸에 바로 저장한다.
 * 명함 사진·담당자 정보는 개인정보라 DB(po_party_cards)에만 둔다(공개 저장소라 코드에 넣지 않음). 어드민 전용.
 */
export type PartyCard = { id: number; hasImage: boolean; contact: CardContact | null; createdAt: string }

let ready: Promise<void> | null = null
function ensurePartyCards() {
  if (!ready) {
    ready = (async () => {
      await ensureOrders()
      await pool.query(`CREATE TABLE IF NOT EXISTS po_party_cards (
        id         bigint generated always as identity primary key,
        party_id   bigint not null references po_parties(id) on delete cascade,
        image      bytea,
        mime       text,
        contact    jsonb,
        created_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS po_party_cards_party_idx ON po_party_cards (party_id)`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

export async function listPartyCards(partyId: number): Promise<PartyCard[]> {
  await ensurePartyCards()
  const { rows } = await pool.query<{ id: string; has_image: boolean; contact: CardContact | null; created_at: Date }>(
    `SELECT id, image IS NOT NULL AS has_image, contact, created_at FROM po_party_cards WHERE party_id = $1 ORDER BY id`,
    [partyId],
  )
  return rows.map((r) => ({ id: Number(r.id), hasImage: r.has_image, contact: r.contact, createdAt: r.created_at.toISOString() }))
}

export async function partyCardImage(partyId: number, cardId: number) {
  await ensurePartyCards()
  const { rows } = await pool.query<{ image: Buffer | null; mime: string | null }>(`SELECT image, mime FROM po_party_cards WHERE id = $1 AND party_id = $2`, [cardId, partyId])
  return rows[0]?.image && rows[0].mime ? { mime: rows[0].mime, data: rows[0].image } : null
}

export async function removePartyCard(partyId: number, cardId: number) {
  await ensurePartyCards()
  await pool.query(`DELETE FROM po_party_cards WHERE id = $1 AND party_id = $2`, [cardId, partyId])
}

export async function getPartyData(partyId: number): Promise<PoParty | null> {
  await ensurePartyCards()
  const { rows } = await pool.query<{ data: unknown }>(`SELECT data FROM po_parties WHERE id = $1`, [partyId])
  return rows[0] ? normalizeParty(rows[0].data) : null
}

/**
 * 읽은 명함을 저장하고 업체 정보에 넣는다.
 * 담당자 = "이름 직함", 담당 연락처 = 휴대폰(없으면 사무실 전화)은 새 명함으로 바꾸고,
 * 상호·전화·팩스·이메일·주소는 비어 있을 때만 채운다.
 */
export async function savePartyCard(partyId: number, image: { mime: string; data: Buffer }, contact: CardContact): Promise<PoParty | null> {
  await ensurePartyCards()
  await pool.query(`INSERT INTO po_party_cards (party_id, image, mime, contact) VALUES ($1, $2, $3, $4)`, [partyId, image.data, image.mime, JSON.stringify(contact)])
  const p = await getPartyData(partyId)
  if (!p) return null
  const label = contactLabel(contact)
  const next: PoParty = {
    ...p,
    manager: label || p.manager,
    managerPhone: contact.mobile || contact.phone || p.managerPhone,
    name: p.name || contact.company,
    phone: p.phone || contact.phone,
    fax: p.fax || contact.fax,
    email: p.email || contact.email,
    address: p.address || contact.address,
  }
  await pool.query(`UPDATE po_parties SET data = $2 WHERE id = $1`, [partyId, JSON.stringify(normalizeParty(next))])
  return normalizeParty(next)
}
