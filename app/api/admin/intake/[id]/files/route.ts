import { getSessionFrom, isAdmin } from '@/lib/admin'
import { addFile, getIntake } from '@/lib/intake/table'
import { sniffImage } from '@/lib/quote-photos'

/**
 * AI 견적 접수 자료 올리기. 한 번에 파일 하나(multipart: file, caption). 브라우저가 사진을 줄여서 여러 번 부른다.
 * 사진은 앞머리로 실제 이미지인지 확인하고, PDF·텍스트는 그대로 둔다.
 */
export const dynamic = 'force-dynamic'

/** Vercel 함수 본문 한도(4.5MB) 안쪽 */
const MAX_BYTES = 4 * 1024 * 1024

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  const { id } = await params
  const intake = await getIntake(Number(id))
  if (!intake) return json({ error: '접수를 찾을 수 없습니다.' }, 404)

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return json({ error: '파일이 없습니다.' }, 400)
  if (file.size > MAX_BYTES) return json({ error: `${file.name}: 4MB를 넘습니다.` }, 413)
  const caption = String(form?.get('caption') ?? '').slice(0, 500)
  const buf = Buffer.from(await file.arrayBuffer())

  let mime: string | null = sniffImage(buf)
  if (!mime) {
    if (file.type === 'application/pdf' && buf.subarray(0, 5).toString('ascii') === '%PDF-') mime = 'application/pdf'
    else if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) mime = 'text/plain'
  }
  if (!mime) return json({ error: `${file.name}: 사진(JPG·PNG·WEBP), PDF, 텍스트 파일만 올릴 수 있습니다.` }, 415)

  const saved = await addFile(intake.id, file.name.slice(0, 200), mime, buf, caption)
  return json({ file: { ...saved, createdAt: saved.createdAt.toISOString() } })
}
