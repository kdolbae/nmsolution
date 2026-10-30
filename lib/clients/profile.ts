import Anthropic from '@anthropic-ai/sdk'
import { pool } from '@/lib/db'
import { ensureClients, getClient } from './table'
import { cardInputs } from './cards'

/**
 * 업체 프로필(내부자료). 업체 등록 때 업체명·명함을 받아 Claude 가 웹 검색으로 조사해 종합한다.
 * 주업종·주요 제품·주 고객사·재무상태·규모·사업장·영업 참고를 출처와 함께 남긴다. 담당자는 명함(lib/clients/cards.ts)에 따로 둔다.
 *
 * 업체·고객에게 절대 보이지 않는다: clients 표가 아닌 client_profiles 표에만 두고,
 * 업체용 링크·협력업체 포털·인쇄·PDF 어디에서도 읽지 않는다. 어드민 업체 화면에서만 본다.
 * 저장소가 공개라 조사 내용은 코드·시드에 넣지 않고 DB 에만 둔다. sql/011_client_profiles.sql 과 같은 모양.
 * ANTHROPIC_API_KEY 가 있어야 조사가 돈다.
 */

export const PROFILE_MODEL = 'claude-opus-5-5'
/** 이보다 오래 '조사 중'이면 함수가 시간 초과로 끊긴 것으로 본다 (route maxDuration 300초 + 여유) */
const STALE_MS = 6 * 60 * 1000

export type CompanyProfile = {
  /** 종합 의견 (3~6문장) */
  summary: string
  /** 주업종 */
  industry: string
  products: string[]
  customers: { name: string; note: string }[]
  financials: {
    year: string
    revenue: string
    operatingProfit: string
    netIncome: string
    /** 추세·부채 등 재무 판단 */
    assessment: string
  }
  scale: { established: string; ceo: string; employees: string; parent: string }
  sites: { name: string; address: string }[]
  bizNumber: string
  homepage: string
  /** 공장 개보수 영업에 쓸 점 */
  salesPoints: string[]
  /** 조심할 점 (재무·분쟁·동명 회사 등) */
  risks: string[]
  /** 공개 자료로 확인하지 못한 것 */
  unknowns: string[]
  sources: { title: string; url: string }[]
}

export type ProfileStatus = 'idle' | 'running' | 'done' | 'error'

export type ProfileRecord = {
  status: ProfileStatus
  error: string
  hint: string
  profile: CompanyProfile | null
  startedAt: string | null
  finishedAt: string | null
}

let ready: Promise<void> | null = null

export function ensureProfiles(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS client_profiles (
        client_id   bigint primary key references clients(id) on delete cascade,
        status      text not null default 'idle',
        error       text,
        hint        text,
        profile     jsonb,
        model       text,
        started_at  timestamptz,
        finished_at timestamptz,
        updated_at  timestamptz not null default now()
      )`)
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type Row = {
  status: string
  error: string | null
  hint: string | null
  profile: CompanyProfile | null
  started_at: Date | null
  finished_at: Date | null
}

export async function getProfile(clientId: number): Promise<ProfileRecord> {
  await ensureProfiles()
  const { rows } = await pool.query<Row>(
    `SELECT status, error, hint, profile, started_at, finished_at
     FROM client_profiles WHERE client_id = $1`,
    [clientId],
  )
  const r = rows[0]
  if (!r) return { status: 'idle', error: '', hint: '', profile: null, startedAt: null, finishedAt: null }
  let status = r.status as ProfileStatus
  let error = r.error ?? ''
  if (status === 'running' && r.started_at && Date.now() - r.started_at.getTime() > STALE_MS) {
    status = 'error'
    error = '조사가 시간 안에 끝나지 않았음. 다시 조사를 눌러 주기 바람.'
  }
  return {
    status,
    error,
    hint: r.hint ?? '',
    profile: r.profile,
    startedAt: r.started_at?.toISOString() ?? null,
    finishedAt: r.finished_at?.toISOString() ?? null,
  }
}

/** 조사를 시작 상태로 둔다 */
export async function startProfile(clientId: number, hint: string) {
  await ensureProfiles()
  await pool.query(
    `INSERT INTO client_profiles (client_id, status, error, hint, started_at, finished_at, updated_at)
     VALUES ($1, 'running', NULL, $2, now(), NULL, now())
     ON CONFLICT (client_id) DO UPDATE SET status = 'running', error = NULL, hint = $2, started_at = now(), finished_at = NULL, updated_at = now()`,
    [clientId, hint],
  )
}

async function finish(clientId: number, result: { profile: CompanyProfile } | { error: string }) {
  if ('profile' in result) {
    await pool.query(
      `UPDATE client_profiles SET status = 'done', error = NULL, profile = $2, model = $3, finished_at = now(), updated_at = now() WHERE client_id = $1`,
      [clientId, JSON.stringify(result.profile), PROFILE_MODEL],
    )
  } else {
    await pool.query(`UPDATE client_profiles SET status = 'error', error = $2, finished_at = now(), updated_at = now() WHERE client_id = $1`, [
      clientId,
      result.error.slice(0, 1000),
    ])
  }
}

// ---------- Claude 조사 ----------

const SYSTEM = `너는 엔엠솔루션(NM SOLUTION, 공장·건물 개보수 시공사)의 영업 내부 조사 담당이다. 견적을 낼 업체를 조사해 내부용 업체 프로필을 만든다. 이 자료는 업체에게 보여 주지 않는다.

조사 순서
1. 명함(사진·글)이 있으면 회사명·주소·이메일 도메인·홈페이지를 먼저 확인한다. 담당자 정보는 따로 저장하므로 프로필에 옮기지 않는다.
2. web_search 로 회사를 찾는다. 이름이 같은 회사가 여럿이면 명함 주소·이메일 도메인·홈페이지로 같은 회사를 가린다.
3. 주업종, 주요 제품·서비스, 주 고객사(납품처·거래처), 재무상태(매출·영업이익·순이익과 기준 연도, 추세), 설립연도·대표·직원 수·모회사, 사업장(본사·공장 주소), 사업자등록번호, 홈페이지를 찾는다. 회사 홈페이지, 전자공시(DART), 기업정보 사이트(잡코리아·사람인·크레딧잡·자소설닷컴·NICE 등), 뉴스를 본다.
4. 공장 개보수(지붕·판넬·전기·설비 공사) 영업에 쓸 점과 조심할 점을 적는다.

규칙
- 찾은 사실만 쓴다. 추정한 값은 "추정"이라고 밝힌다. 재무 수치는 기준 연도를 꼭 붙이고, 연도를 모르면 "연도 미표기"라고 쓴다.
- 확인하지 못한 항목은 지어내지 말고 빈 문자열로 두고 unknowns 에 적는다.
- sources 에는 실제로 근거로 쓴 페이지만 제목과 주소로 넣는다.
- 문체는 "~함" 체로 담백하게 쓴다. summary 는 3~6문장으로 업체가 어떤 회사인지, 규모와 재무가 어떤지, 우리 공사와 어떻게 이어지는지 종합한다.
- 조사를 마치면 save_profile 도구를 한 번 불러 결과를 저장한다. 결과는 도구 입력으로만 내고 따로 글로 쓰지 않는다.`

const str = { type: 'string' } as const
const strList = { type: 'array', items: str } as const
function obj(props: Record<string, unknown>) {
  return { type: 'object', additionalProperties: false, required: Object.keys(props), properties: props }
}

const PROFILE_SCHEMA = obj({
  summary: str,
  industry: str,
  products: strList,
  customers: { type: 'array', items: obj({ name: str, note: str }) },
  financials: obj({ year: str, revenue: str, operatingProfit: str, netIncome: str, assessment: str }),
  scale: obj({ established: str, ceo: str, employees: str, parent: str }),
  sites: { type: 'array', items: obj({ name: str, address: str }) },
  bizNumber: str,
  homepage: str,
  salesPoints: strList,
  risks: strList,
  unknowns: strList,
  sources: { type: 'array', items: obj({ title: str, url: str }) },
})

const SAVE_TOOL = {
  name: 'save_profile',
  description: '조사를 마친 업체 프로필을 저장한다. 조사가 끝나면 한 번만 부른다.',
  strict: true,
  input_schema: PROFILE_SCHEMA,
} as unknown as Anthropic.Beta.BetaTool

export async function researchProfile(clientId: number): Promise<void> {
  try {
    const profile = await research(clientId)
    await finish(clientId, { profile })
  } catch (e) {
    console.error('[profile] 조사 실패', e)
    await finish(clientId, { error: errorText(e) }).catch(() => null)
  }
}

function errorText(e: unknown) {
  if (e instanceof Anthropic.RateLimitError) return '요청이 많아 잠시 뒤 다시 조사해야 함.'
  if (e instanceof Anthropic.AuthenticationError) return 'ANTHROPIC_API_KEY 가 올바르지 않음.'
  if (e instanceof Anthropic.APIError) return `조사 실패 (${e.status ?? '연결'}): ${e.message}`
  return e instanceof Error ? e.message : '조사하지 못했음.'
}

async function research(clientId: number): Promise<CompanyProfile> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('자동 조사를 쓰려면 Vercel 환경변수 ANTHROPIC_API_KEY 가 필요함.')
  const client = await getClient(clientId)
  if (!client) throw new Error('업체를 찾을 수 없음.')
  const { rows } = await pool.query<{ hint: string | null }>(`SELECT hint FROM client_profiles WHERE client_id = $1`, [clientId])
  const hint = rows[0]?.hint ?? ''
  const cards = await cardInputs(clientId)

  const content: Anthropic.Beta.BetaContentBlockParam[] = []
  for (const c of cards) {
    if (c.image) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: c.image.mime as 'image/jpeg' | 'image/png' | 'image/webp', data: c.image.data.toString('base64') },
      })
    }
  }
  const cardLines = cards
    .map((c, i) => {
      const read = c.contact && [c.contact.company, c.contact.address, c.contact.email, c.contact.website].filter(Boolean).join(' / ')
      return [`명함 ${i + 1}${c.image ? ' (사진 첨부)' : ''}`, c.text, read && `읽은 내용: ${read}`].filter(Boolean).join('\n')
    })
    .join('\n\n')
  const known = [
    `업체명: ${client.name}`,
    client.bizNumber && `사업자등록번호: ${client.bizNumber}`,
    client.siteAddress && `현장 주소: ${client.siteAddress}`,
    cardLines && `명함:\n${cardLines}`,
    hint && `작성자 메모: ${hint}`,
  ]
    .filter(Boolean)
    .join('\n')
  content.push({ type: 'text', text: `${known}\n\n이 업체를 조사해 내부용 업체 프로필을 만들어 줘.` })

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content }]
  const api = new Anthropic()
  let nudged = false
  for (let turn = 0; turn < 8; turn++) {
    const stream = api.beta.messages.stream({
      model: PROFILE_MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: SYSTEM,
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 10, user_location: { type: 'approximate', country: 'KR' } },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 6 },
        SAVE_TOOL,
      ],
      tool_choice: { type: 'auto' },
      messages,
    })
    const msg = await stream.finalMessage()
    if (msg.stop_reason === 'refusal') throw new Error('이 업체는 조사하지 못했음.')
    const saved = msg.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'save_profile')
    if (saved) return saved.input as CompanyProfile
    if (msg.stop_reason === 'max_tokens') throw new Error('조사 결과가 너무 길어 잘렸음. 다시 조사해 주기 바람.')
    messages.push({ role: 'assistant', content: msg.content })
    // pause_turn 이면 그대로 다시 보내면 이어서 검색한다. 글로만 끝냈으면 저장을 한 번 더 요청한다
    if (msg.stop_reason !== 'pause_turn') {
      if (nudged) break
      nudged = true
      messages.push({ role: 'user', content: '조사한 내용을 save_profile 도구로 저장해 줘.' })
    }
  }
  throw new Error('조사를 마치지 못했음. 다시 조사해 주기 바람.')
}
