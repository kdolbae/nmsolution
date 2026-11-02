import { createHash, randomBytes } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureClients, finalizeClient, getClient, getVersion, listVersions } from '@/lib/clients/table'
import { calcQuote } from '@/lib/clients/quote'
import { contractHtml, type ContractTerms } from './render'

/**
 * 전자계약 (전 업체 공통, 2026-11-02 kevin).
 *
 * - 작업제안서 + 견적서(내부 버전 vN)를 근거로 어드민에서 계약서를 만든다. 견적서(본 견적·추가 견적서) 하나에 계약서 여러 장 가능(취소 후 다시 작성).
 * - 계약 주체(법인/개인)는 고객이 고르지 않고 엔엠솔루션이 계약서를 세팅할 때 정한다(당사자 칸 양식이 달라짐).
 * - 서명은 출력 후 서면 기명날인(인증서 전자서명 업체 연동은 하지 않음, kevin).
 * - '발행'을 누르면 그때의 계약서·제안서·견적서를 한 벌로 굳히고(snapshot) SHA-256 해시를 남긴다. 그 뒤로는 내용을 못 고친다(취소 후 새로 작성).
 *   발행본은 인쇄·PDF 로 쓰고, 고객용 보기 링크(/contract/<무작위 키>)도 열린다. 열람·PDF 는 업체 접속 기록에 남고 어드민에서만 보인다.
 * - 날인한 계약서를 받으면 '날인 완료'를 누른다. 근거 버전이 최신이면 견적을 '계약 확정(vN 잠금)'으로 같이 잠근다.
 * - 진행 기록(작성·발행·열람·날인·취소)은 contract_events 에 따로 쌓는다.
 * 표는 첫 조회 때 생긴다.
 */

export type PartyType = 'corp' | 'person'
export type ContractStatus = 'draft' | 'issued' | 'signed' | 'cancelled'

export const STATUS_LABEL: Record<ContractStatus, string> = {
  draft: '작성 중',
  issued: '발행 (날인 대기)',
  signed: '날인 완료',
  cancelled: '취소',
}

export type ContractParty = {
  type: PartyType
  /** 법인: 상호, 개인: 성명 */
  name: string
  /** 법인: 사업자등록번호 */
  bizNumber: string
  /** 법인: 법인등록번호(선택) */
  corpNumber: string
  /** 법인: 대표자 */
  ceo: string
  address: string
  phone: string
  email: string
}

export type ContractRow = {
  id: number
  clientId: number
  no: number
  number: string
  status: ContractStatus
  versionNo: number
  party: ContractParty
  terms: ContractTerms
  supply: number
  vat: number
  token: string | null
  docHash: string | null
  createdAt: Date
  createdBy: string
  issuedAt: Date | null
  signedAt: Date | null
  signedNote: string
  cancelledAt: Date | null
}

export type ContractEvent = { at: Date; kind: string; by: string | null; ip: string | null; ua: string | null; details: Record<string, unknown> | null }

let ready: Promise<void> | null = null

export function ensureContracts(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`
        CREATE TABLE IF NOT EXISTS client_contracts (
          id                 bigint generated always as identity primary key,
          client_id          bigint not null references clients(id) on delete cascade,
          contract_no        int not null,
          number             text not null,
          status             text not null default 'draft',
          version_no         int not null,
          party              jsonb not null,
          terms              jsonb not null,
          supply             bigint not null default 0,
          vat                bigint not null default 0,
          token              text unique,
          snapshot_html      text,
          proposal_html      text,
          doc_hash           text,
          signed_note        text,
          created_at         timestamptz not null default now(),
          created_by         text,
          updated_at         timestamptz not null default now(),
          issued_at          timestamptz,
          signed_at          timestamptz,
          cancelled_at       timestamptz,
          UNIQUE (client_id, contract_no)
        );
        CREATE TABLE IF NOT EXISTS contract_events (
          id          bigint generated always as identity primary key,
          contract_id bigint not null references client_contracts(id) on delete cascade,
          created_at  timestamptz not null default now(),
          kind        text not null,
          by_name     text,
          ip          text,
          ua          text,
          details     jsonb
        );
        CREATE INDEX IF NOT EXISTS contract_events_idx ON contract_events (contract_id, created_at);`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type DbRow = {
  id: string
  client_id: string
  contract_no: number
  number: string
  status: ContractStatus
  version_no: number
  party: ContractParty
  terms: ContractTerms
  supply: string
  vat: string
  token: string | null
  doc_hash: string | null
  created_at: Date
  created_by: string | null
  issued_at: Date | null
  signed_at: Date | null
  signed_note: string | null
  cancelled_at: Date | null
}

const COLS = `id, client_id, contract_no, number, status, version_no, party, terms, supply, vat, token, doc_hash,
  created_at, created_by, issued_at, signed_at, signed_note, cancelled_at`

function toRow(r: DbRow): ContractRow {
  return {
    id: Number(r.id),
    clientId: Number(r.client_id),
    no: r.contract_no,
    number: r.number,
    status: r.status,
    versionNo: r.version_no,
    party: normalizeParty(r.party),
    terms: normalizeTerms(r.terms),
    supply: Number(r.supply),
    vat: Number(r.vat),
    token: r.token,
    docHash: r.doc_hash,
    createdAt: r.created_at,
    createdBy: r.created_by ?? '',
    issuedAt: r.issued_at,
    signedAt: r.signed_at,
    signedNote: r.signed_note ?? '',
    cancelledAt: r.cancelled_at,
  }
}

const str = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max)

export function normalizeParty(raw: unknown): ContractParty {
  const p = (raw ?? {}) as Record<string, unknown>
  return {
    type: p.type === 'person' ? 'person' : 'corp',
    name: str(p.name, 120),
    bizNumber: str(p.bizNumber, 20),
    corpNumber: str(p.corpNumber, 20),
    ceo: str(p.ceo, 60),
    address: str(p.address, 200),
    phone: str(p.phone, 40),
    email: str(p.email, 120),
  }
}

export function normalizeTerms(raw: unknown): ContractTerms {
  const t = (raw ?? {}) as Record<string, unknown>
  return {
    title: str(t.title, 200),
    site: str(t.site, 200),
    startDate: str(t.startDate, 10),
    endDate: str(t.endDate, 10),
    payment: str(t.payment, 2000),
    warranty: str(t.warranty, 200),
    delayRate: str(t.delayRate, 100),
    special: str(t.special, 4000),
    contractDate: /^\d{4}-\d{2}-\d{2}$/.test(str(t.contractDate, 10)) ? str(t.contractDate, 10) : '',
  }
}

export async function listContracts(clientId: number): Promise<ContractRow[]> {
  await ensureContracts()
  const { rows } = await pool.query<DbRow>(`SELECT ${COLS} FROM client_contracts WHERE client_id = $1 ORDER BY contract_no DESC`, [clientId])
  return rows.map(toRow)
}

export async function getContract(clientId: number, no: number): Promise<ContractRow | null> {
  await ensureContracts()
  const { rows } = await pool.query<DbRow>(`SELECT ${COLS} FROM client_contracts WHERE client_id = $1 AND contract_no = $2`, [clientId, no])
  return rows[0] ? toRow(rows[0]) : null
}

/** 고객 링크 키로 찾는다. 발행·날인 완료만 열린다 */
export async function getContractByToken(token: string): Promise<(ContractRow & { snapshotHtml: string; proposalHtml: string }) | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null
  await ensureContracts()
  const { rows } = await pool.query<DbRow & { snapshot_html: string | null; proposal_html: string | null }>(
    `SELECT ${COLS}, snapshot_html, proposal_html FROM client_contracts
      WHERE token = $1 AND status IN ('issued','signed')`,
    [token],
  )
  const r = rows[0]
  return r ? { ...toRow(r), snapshotHtml: r.snapshot_html ?? '', proposalHtml: r.proposal_html ?? '' } : null
}

export async function listEvents(contractId: number): Promise<ContractEvent[]> {
  await ensureContracts()
  const { rows } = await pool.query<{ created_at: Date; kind: string; by_name: string | null; ip: string | null; ua: string | null; details: Record<string, unknown> | null }>(
    `SELECT created_at, kind, by_name, ip, ua, details FROM contract_events WHERE contract_id = $1 ORDER BY created_at`,
    [contractId],
  )
  return rows.map((r) => ({ at: r.created_at, kind: r.kind, by: r.by_name, ip: r.ip, ua: r.ua, details: r.details }))
}

/** 계약 진행 기록 한 줄 (증빙용). 고객 쪽 기록이면 h 로 IP·기기를 남긴다 */
export async function addEvent(contractId: number, kind: string, opts: { by?: string; h?: Headers; details?: Record<string, unknown> } = {}) {
  await ensureContracts()
  const ip = opts.h ? (opts.h.get('x-forwarded-for') || '').split(',')[0].trim() || opts.h.get('x-real-ip') || null : null
  await pool.query(`INSERT INTO contract_events (contract_id, kind, by_name, ip, ua, details) VALUES ($1,$2,$3,$4,$5,$6)`, [
    contractId,
    kind,
    opts.by ?? null,
    ip?.slice(0, 64) ?? null,
    opts.h?.get('user-agent')?.slice(0, 400) ?? null,
    opts.details ? JSON.stringify(opts.details) : null,
  ])
}

/** 계약서 기본값: 업체 정보·견적서에서 채운다 */
export async function contractDefaults(clientId: number): Promise<{ party: ContractParty; terms: ContractTerms; versionNo: number | null }> {
  const client = await getClient(clientId)
  if (!client) throw new Error('업체를 찾지 못했습니다.')
  const versions = await listVersions(clientId)
  return {
    versionNo: client.finalized?.version ?? versions[0]?.no ?? null,
    party: normalizeParty({
      type: client.bizNumber ? 'corp' : 'person',
      name: client.name,
      bizNumber: client.bizNumber ?? '',
      ceo: client.quote.recipientCeo ?? '',
      address: '',
      phone: client.phone ?? '',
      email: client.email ?? '',
    }),
    terms: normalizeTerms({ title: client.quote.title, site: client.siteAddress ?? '' }),
  }
}

/** 새 계약서(작성 중). 번호 = 견적번호-C순번 */
export async function createContract(clientId: number, versionNo: number, party: ContractParty, terms: ContractTerms, by: string): Promise<ContractRow> {
  await ensureContracts()
  const client = await getClient(clientId)
  if (!client) throw new Error('업체를 찾지 못했습니다.')
  const v = await getVersion(clientId, versionNo)
  if (!v) throw new Error(`v${versionNo} 버전을 찾지 못했습니다.`)
  const c = calcQuote(v.quote)
  const { rows } = await pool.query<DbRow>(
    `INSERT INTO client_contracts (client_id, contract_no, number, version_no, party, terms, supply, vat, created_by)
     SELECT $1, n, $2 || '-C' || n, $3, $4, $5, $6, $7, $8
       FROM (SELECT COALESCE(MAX(contract_no), 0) + 1 AS n FROM client_contracts WHERE client_id = $1) x
     RETURNING ${COLS}`,
    [clientId, v.quote.number || client.quote.number, versionNo, JSON.stringify(normalizeParty(party)), JSON.stringify(normalizeTerms(terms)), c.supply, c.vat, by],
  )
  const row = toRow(rows[0])
  await addEvent(row.id, 'created', { by, details: { version: versionNo } })
  return row
}

/** 작성 중인 계약서만 고칠 수 있다 */
export async function updateContract(clientId: number, no: number, versionNo: number, party: ContractParty, terms: ContractTerms, by: string) {
  await ensureContracts()
  const v = await getVersion(clientId, versionNo)
  if (!v) throw new Error(`v${versionNo} 버전을 찾지 못했습니다.`)
  const c = calcQuote(v.quote)
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE client_contracts SET version_no = $3, party = $4, terms = $5, supply = $6, vat = $7, updated_at = now()
      WHERE client_id = $1 AND contract_no = $2 AND status = 'draft' RETURNING id`,
    [clientId, no, versionNo, JSON.stringify(normalizeParty(party)), JSON.stringify(normalizeTerms(terms)), c.supply, c.vat],
  )
  if (!rows[0]) throw new Error('발행한 계약서는 고칠 수 없습니다. 취소하고 새로 작성하세요.')
  await addEvent(Number(rows[0].id), 'edited', { by })
}

/** 발행 전 확인: 빠진 값이 있으면 문구 목록 */
export function missingFields(c: Pick<ContractRow, 'party' | 'terms'>): string[] {
  const m: string[] = []
  const p = c.party
  if (!p.name) m.push(p.type === 'corp' ? '상호' : '성명')
  if (p.type === 'corp' && !p.bizNumber) m.push('사업자등록번호')
  if (p.type === 'corp' && !p.ceo) m.push('대표자')
  if (!p.address) m.push('주소')
  if (!c.terms.title) m.push('공사명')
  if (!c.terms.site) m.push('공사 장소')
  if (!c.terms.startDate || !c.terms.endDate) m.push('공사 기간')
  if (!c.terms.payment) m.push('대금 지급 조건')
  return m
}

/** 계약서 HTML 을 지금 내용으로 만든다 (미리보기·발행 공통) */
export async function buildContractHtml(c: ContractRow): Promise<{ html: string; proposalHtml: string }> {
  const client = await getClient(c.clientId)
  if (!client) throw new Error('업체를 찾지 못했습니다.')
  const v = await getVersion(c.clientId, c.versionNo)
  if (!v) throw new Error(`v${c.versionNo} 버전을 찾지 못했습니다.`)
  return {
    html: contractHtml({ number: c.number, party: c.party, terms: c.terms, quote: v.quote, versionNo: c.versionNo, client }),
    proposalHtml: v.proposalHtml,
  }
}

export const docHashOf = (html: string, proposalHtml: string) =>
  createHash('sha256').update(html).update('\n<!--NM:PROPOSAL-->\n').update(proposalHtml).digest('hex')

/** 발행: 내용을 굳히고 해시·고객 링크 키를 만든다 */
export async function issueContract(clientId: number, no: number, by: string): Promise<ContractRow> {
  const c = await getContract(clientId, no)
  if (!c) throw new Error('계약서를 찾지 못했습니다.')
  if (c.status !== 'draft') throw new Error('이미 발행한 계약서입니다.')
  const missing = missingFields(c)
  if (missing.length) throw new Error(`빠진 항목: ${missing.join(', ')}`)
  const { html, proposalHtml } = await buildContractHtml(c)
  const hash = docHashOf(html, proposalHtml)
  const token = randomBytes(24).toString('base64url')
  const { rows } = await pool.query<DbRow>(
    `UPDATE client_contracts SET status = 'issued', token = $3, snapshot_html = $4, proposal_html = $5, doc_hash = $6, issued_at = now(), updated_at = now()
      WHERE client_id = $1 AND contract_no = $2 AND status = 'draft' RETURNING ${COLS}`,
    [clientId, no, token, html, proposalHtml, hash],
  )
  if (!rows[0]) throw new Error('이미 발행한 계약서입니다.')
  await addEvent(c.id, 'issued', { by, details: { hash, version: c.versionNo } })
  return toRow(rows[0])
}

/** 취소: 고객 링크가 바로 닫힌다. 날인 완료본도 취소할 수 있다(계약 해지 등). 견적 잠금은 따로 해제 */
export async function cancelContract(clientId: number, no: number, by: string) {
  await ensureContracts()
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE client_contracts SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE client_id = $1 AND contract_no = $2 AND status IN ('draft','issued','signed') RETURNING id`,
    [clientId, no],
  )
  if (!rows[0]) throw new Error('이미 취소한 계약서입니다.')
  await addEvent(Number(rows[0].id), 'cancelled', { by })
}

/** 작성 중인 계약서 삭제 (발행한 적 없는 것만) */
export async function deleteDraft(clientId: number, no: number) {
  await ensureContracts()
  const { rowCount } = await pool.query(`DELETE FROM client_contracts WHERE client_id = $1 AND contract_no = $2 AND status = 'draft'`, [clientId, no])
  if (!rowCount) throw new Error('작성 중인 계약서만 지울 수 있습니다.')
}

/**
 * 날인 완료: 양쪽이 날인한 계약서를 받았을 때. 근거 버전이 지금 최신이고 아직 잠기지 않았으면 견적을 '계약 확정'으로 잠근다.
 * 돌려주는 locked: 이번에 잠갔으면 잠근 버전, 이미 잠겨 있었거나 버전이 달라 못 잠갔으면 null 과 이유.
 */
export async function markSigned(clientId: number, no: number, note: string, by: string): Promise<{ locked: number | null; reason?: string }> {
  const c = await getContract(clientId, no)
  if (!c) throw new Error('계약서를 찾지 못했습니다.')
  if (c.status !== 'issued') throw new Error('발행한 계약서만 날인 완료로 바꿀 수 있습니다.')
  await pool.query(
    `UPDATE client_contracts SET status = 'signed', signed_at = now(), signed_note = $3, updated_at = now() WHERE client_id = $1 AND contract_no = $2`,
    [clientId, no, note.slice(0, 300)],
  )
  await addEvent(c.id, 'signed', { by, details: note ? { note } : undefined })
  const client = await getClient(clientId)
  const latest = (await listVersions(clientId))[0]?.no
  if (client?.finalized) return { locked: null, reason: `이미 v${client.finalized.version} 으로 계약 확정됨` }
  if (latest !== c.versionNo) return { locked: null, reason: `계약서 근거 v${c.versionNo} 가 최신 v${latest} 와 달라 견적을 잠그지 않음` }
  const v = await finalizeClient(clientId, by)
  await addEvent(c.id, 'quote_locked', { by, details: { version: v } })
  return { locked: v }
}
