import Anthropic from '@anthropic-ai/sdk'
import { getSessionFrom, isAdmin } from '@/lib/admin'

/**
 * 배관 도면 작성 화면의 대화창: 지금 도면(JSON)과 요청(+사진)을 Claude에 보내 고친 도면을 받는다.
 * 요청: multipart (prompt, image × 최대 4). prompt 에는 화면이 만든 규칙·지금 도면·요청이 다 들어 있다.
 * 응답: Claude가 돌려준 JSON 그대로({ reply, model }) 또는 { error }. ANTHROPIC_API_KEY 가 있어야 한다.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MODEL = 'claude-opus-5-5'
const MAX_BYTES = 4 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** 답에서 JSON 하나를 꺼낸다: 전체 → 코드블록 → 첫 { 부터 마지막 } */
function parseLoose(text: string): unknown {
  const tries = [text, text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? '', text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)]
  for (const t of tries) {
    try {
      if (t.trim()) return JSON.parse(t)
    } catch {}
  }
  throw new SyntaxError('no json')
}

export async function POST(req: Request) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.', code: 'not_granted' }, 401)
  if (!process.env.ANTHROPIC_API_KEY)
    return json({ error: '대화로 고치려면 Vercel 환경변수 ANTHROPIC_API_KEY 가 필요합니다.', code: 'not_granted' }, 503)

  const form = await req.formData().catch(() => null)
  const prompt = String(form?.get('prompt') ?? '').slice(0, 200_000)
  if (!prompt) return json({ error: '요청이 비었습니다.' }, 400)
  const images: Anthropic.Beta.BetaContentBlockParam[] = []
  let total = 0
  for (const f of form?.getAll('image') ?? []) {
    if (!(f instanceof File) || images.length >= 4) continue
    if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) return json({ error: 'JPG, PNG, WEBP, GIF 사진만 보낼 수 있습니다.', code: 'image_rejected' }, 415)
    total += f.size
    if (total > MAX_BYTES) return json({ error: '사진이 합쳐서 4MB를 넘습니다. 줄여서 보내 주세요.', code: 'image_rejected' }, 413)
    images.push({ type: 'image', source: { type: 'base64', media_type: f.type as (typeof IMAGE_TYPES)[number], data: Buffer.from(await f.arrayBuffer()).toString('base64') } })
  }

  const client = new Anthropic()
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: '배관 도면 보조. 답은 사용자가 정한 JSON 하나만 쓴다. 설명 문장이나 코드블록 밖 글자를 붙이지 않는다.',
      messages: [{ role: 'user', content: [...images, { type: 'text', text: prompt }] }],
    })
    const msg = await stream.finalMessage()
    if (msg.stop_reason === 'refusal') return json({ error: '이 요청은 처리하지 못했습니다.', code: 'refused' }, 422)
    if (msg.stop_reason === 'max_tokens') return json({ error: '답이 너무 길어 잘렸습니다. 나눠서 요청해 주세요.', code: 'invalid_json' }, 422)
    const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
    return json(parseLoose(text))
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: '요청이 많아 잠시 뒤 다시 시도해야 합니다.', code: 'rate_limited' }, 429)
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'ANTHROPIC_API_KEY 가 올바르지 않습니다.', code: 'not_granted' }, 503)
    if (e instanceof Anthropic.APIError) return json({ error: `Claude 호출 실패 (${e.status ?? '연결'}): ${e.message}` }, 502)
    if (e instanceof SyntaxError) return json({ error: '답 형식이 깨져 반영하지 못했습니다.', code: 'invalid_json' }, 502)
    throw e
  }
}
