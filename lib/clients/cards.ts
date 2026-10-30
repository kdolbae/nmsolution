import Anthropic from '@anthropic-ai/sdk'
import { pool } from '@/lib/db'
import { ensureClients } from './table'

/**
 * 업체 명함. 업체 하나에 여러 장을 넣고, 넣을 때마다 Claude 가 읽어 담당자를 직함과 함께 저장한다.
 * 명함 사진·담당자 정보는 개인정보라 DB(client_cards)에만 둔다. 저장소가 공개라 코드·시드에 넣지 않는다.
 * 어드민 업체 화면과 SBworks 연동 API 에서만 읽고, 업체용 링크·포털·인쇄에는 나오지 않는다.
 */

export const CARD_MODEL = 'claude-opus-5-5'
/** 브라우저에서 긴 변 1600px JPEG 로 줄여 오지만, 줄이지 못한 사진도 받을 수 있게 넉넉히 */
export const MAX_CARD_BYTES = 4 * 1024 * 1024
export const MAX_CARDS_PER_UPLOAD = 10

export type CardContact = {
  company: string
  name: string
  title: string
  department: string
  phone: string
  mobile: string
  fax: string
  email: string
  address: string
  website: string
}

export type Card = {
  id: number
  status: 'reading' | 'done' | 'error'
  error: string
  text: string
  hasImage: boolean
  contact: CardContact | null
  createdAt: string
}

let ready: Promise<void> | null = null

export function ensureCards(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS client_cards (
        id         bigint generated always as identity primary key,
        client_id  bigint not null references clients(id) on delete cascade,
        status     text not null default 'reading',
        error      text,
        card_text  text,
        image      bytea,
        mime       text,
        contact    jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS client_cards_client_idx ON client_cards (client_id)`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type Row = {
  id: string
  status: string
  error: string | null
  card_text: string | null
  has_image: boolean
  contact: CardContact | null
  created_at: Date
}

export async function listCards(clientId: number): Promise<Card[]> {
  await ensureCards()
  const { rows } = await pool.query<Row>(
    `SELECT id, status, error, card_text, image IS NOT NULL AS has_image, contact, created_at
     FROM client_cards WHERE client_id = $1 ORDER BY id`,
    [clientId],
  )
  return rows.map((r) => ({
    id: Number(r.id),
    status: r.status as Card['status'],
    error: r.error ?? '',
    text: r.card_text ?? '',
    hasImage: r.has_image,
    contact: r.contact,
    createdAt: r.created_at.toISOString(),
  }))
}

/** 조사에 넣을 명함 사진·글 */
export async function cardInputs(clientId: number): Promise<{ text: string; image: { mime: string; data: Buffer } | null; contact: CardContact | null }[]> {
  await ensureCards()
  const { rows } = await pool.query<{ card_text: string | null; image: Buffer | null; mime: string | null; contact: CardContact | null }>(
    `SELECT card_text, image, mime, contact FROM client_cards WHERE client_id = $1 ORDER BY id`,
    [clientId],
  )
  return rows.map((r) => ({ text: r.card_text ?? '', image: r.image && r.mime ? { mime: r.mime, data: r.image } : null, contact: r.contact }))
}

export async function cardImage(clientId: number, cardId: number): Promise<{ mime: string; data: Buffer } | null> {
  await ensureCards()
  const { rows } = await pool.query<{ image: Buffer | null; mime: string | null }>(`SELECT image, mime FROM client_cards WHERE id = $1 AND client_id = $2`, [
    cardId,
    clientId,
  ])
  const r = rows[0]
  return r?.image && r.mime ? { mime: r.mime, data: r.image } : null
}

export async function addCard(clientId: number, input: { text: string; image: { mime: string; data: Buffer } | null }): Promise<number> {
  await ensureCards()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO client_cards (client_id, card_text, image, mime) VALUES ($1, $2, $3, $4) RETURNING id`,
    [clientId, input.text, input.image?.data ?? null, input.image?.mime ?? null],
  )
  return Number(rows[0].id)
}

export async function removeCard(clientId: number, cardId: number) {
  await ensureCards()
  await pool.query(`DELETE FROM client_cards WHERE id = $1 AND client_id = $2`, [cardId, clientId])
}

/** 직접 고친 담당자 정보 저장 */
export async function updateCardContact(clientId: number, cardId: number, contact: CardContact) {
  await ensureCards()
  await pool.query(`UPDATE client_cards SET contact = $3, status = 'done', error = NULL, updated_at = now() WHERE id = $1 AND client_id = $2`, [
    cardId,
    clientId,
    JSON.stringify(cleanContact(contact)),
  ])
}

export function cleanContact(c: Partial<CardContact> | null | undefined): CardContact {
  const t = (v: unknown) => String(v ?? '').trim().slice(0, 300)
  return {
    company: t(c?.company),
    name: t(c?.name),
    title: t(c?.title),
    department: t(c?.department),
    phone: t(c?.phone),
    mobile: t(c?.mobile),
    fax: t(c?.fax),
    email: t(c?.email),
    address: t(c?.address),
    website: t(c?.website),
  }
}

/** 담당자 표시: "이름 직함" */
export function contactLabel(c: Pick<CardContact, 'name' | 'title'>) {
  return [c.name, c.title].filter(Boolean).join(' ')
}

// ---------- 명함 읽기 ----------

const str = { type: 'string' } as const
const CONTACT_KEYS = ['company', 'name', 'title', 'department', 'phone', 'mobile', 'fax', 'email', 'address', 'website'] as const
const CARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...CONTACT_KEYS],
  properties: Object.fromEntries(CONTACT_KEYS.map((k) => [k, str])),
}

const SYSTEM = `명함을 읽어 담당자 정보를 옮긴다.
- 명함에 적힌 그대로 옮긴다. 없는 값은 빈 문자열로 둔다. 짐작해서 채우지 않는다.
- title 은 직함·직위(예: 이사, 부장, 책임, 팀장)다. 꼭 찾아서 넣는다. 영문 직함만 있으면 영문 그대로 쓴다.
- department 는 부서·팀이다.
- phone 은 사무실 전화, mobile 은 휴대폰(010 등), fax 는 팩스다. 숫자 사이 하이픈은 명함 표기를 따른다.
- 한글·영문이 함께 있으면 한글을 쓴다.`

/** 명함 한 장을 읽어 담당자 정보를 저장한다. 처음 읽은 담당자는 비어 있는 업체 담당자·연락처 칸에도 넣는다 */
export async function readCard(clientId: number, cardId: number): Promise<void> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('명함 읽기를 쓰려면 Vercel 환경변수 ANTHROPIC_API_KEY 가 필요함.')
    const { rows } = await pool.query<{ card_text: string | null; image: Buffer | null; mime: string | null }>(
      `SELECT card_text, image, mime FROM client_cards WHERE id = $1 AND client_id = $2`,
      [cardId, clientId],
    )
    const r = rows[0]
    if (!r) return
    const content: Anthropic.ContentBlockParam[] = []
    if (r.image && r.mime) {
      content.push({ type: 'image', source: { type: 'base64', media_type: r.mime as 'image/jpeg' | 'image/png' | 'image/webp', data: r.image.toString('base64') } })
    }
    content.push({ type: 'text', text: r.card_text ? `명함 글:\n${r.card_text}\n\n이 명함을 읽어 줘.` : '이 명함을 읽어 줘.' })
    const msg = await new Anthropic().messages.create({
      model: CARD_MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: CARD_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    })
    if (msg.stop_reason === 'refusal') throw new Error('이 명함은 읽지 못했음.')
    const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
    const contact = cleanContact(JSON.parse(text) as CardContact)
    await pool.query(`UPDATE client_cards SET status = 'done', error = NULL, contact = $3, updated_at = now() WHERE id = $1 AND client_id = $2`, [
      cardId,
      clientId,
      JSON.stringify(contact),
    ])
    await pool.query(
      `UPDATE clients SET
         contact_person = COALESCE(NULLIF(contact_person, ''), NULLIF($2, '')),
         phone = COALESCE(NULLIF(phone, ''), NULLIF($3, '')),
         email = COALESCE(NULLIF(email, ''), NULLIF($4, ''))
       WHERE id = $1`,
      [clientId, contactLabel(contact), contact.mobile || contact.phone, contact.email],
    )
  } catch (e) {
    console.error('[cards] 명함 읽기 실패', e)
    const error =
      e instanceof Anthropic.AuthenticationError
        ? 'ANTHROPIC_API_KEY 가 올바르지 않음.'
        : e instanceof Anthropic.APIError
          ? `명함 읽기 실패 (${e.status ?? '연결'}): ${e.message}`
          : e instanceof Error
            ? e.message
            : '명함을 읽지 못했음.'
    await pool
      .query(`UPDATE client_cards SET status = 'error', error = $3, updated_at = now() WHERE id = $1 AND client_id = $2`, [cardId, clientId, error.slice(0, 1000)])
      .catch(() => null)
  }
}
