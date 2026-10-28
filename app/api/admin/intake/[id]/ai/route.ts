import Anthropic from '@anthropic-ai/sdk'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { AiError, analyzeOrAnswer, makeDraft } from '@/lib/intake/ai'
import { getIntake, readFiles, updateIntake } from '@/lib/intake/table'
import { listQuoteCases } from '@/lib/clients/quote-cases-db'

/**
 * AI 견적 접수의 Claude 호출 (lib/intake/ai.ts).
 * 요청 JSON: { action: 'analyze' | 'answer' | 'draft', text?: string }
 * 응답: 갱신된 접수(analysis·messages·draft) 또는 { error }.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'AI 접수를 쓰려면 Vercel 환경변수 ANTHROPIC_API_KEY 가 필요합니다.' }, 503)
  const { id } = await params
  const intake = await getIntake(Number(id))
  if (!intake) return json({ error: '접수를 찾을 수 없습니다.' }, 404)

  const body = (await req.json().catch(() => ({}))) as { action?: string; text?: string }
  const text = String(body.text ?? '').trim().slice(0, 8000)
  if (body.action === 'answer' && !text) return json({ error: '답변이 비어 있습니다.' }, 400)
  if (!intake.description.trim() && body.action === 'analyze') return json({ error: '설명을 먼저 적어 주세요. (사진만 있어도 한 줄은 적어야 함)' }, 400)

  try {
    const [files, cases] = await Promise.all([readFiles(intake.id), listQuoteCases(intake.clientId ?? undefined)])
    if (body.action === 'draft') {
      const draft = await makeDraft(intake, files, cases)
      await updateIntake(intake.id, { draft })
      return json({ draft })
    }
    if (body.action === 'analyze' || body.action === 'answer') {
      const { analysis, messages } = await analyzeOrAnswer(intake, files, cases, body.action === 'answer' ? text : undefined)
      await updateIntake(intake.id, { analysis, messages })
      return json({ analysis, messages })
    }
    return json({ error: '알 수 없는 요청입니다.' }, 400)
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status)
    if (e instanceof Anthropic.RateLimitError) return json({ error: '요청이 많아 잠시 뒤 다시 시도해야 합니다.' }, 429)
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'ANTHROPIC_API_KEY 가 올바르지 않습니다.' }, 503)
    if (e instanceof Anthropic.APIError) return json({ error: `AI 호출 실패 (${e.status ?? '연결'}): ${e.message}` }, 502)
    if (e instanceof SyntaxError) return json({ error: '결과를 해석하지 못했습니다. 다시 시도해 주세요.' }, 502)
    throw e
  }
}
