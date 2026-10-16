import { getSessionFrom, isAdmin } from '@/lib/admin'
import { sniffImage } from '@/lib/quote-photos'
import { addPhoto, MAX_REPORT_PHOTO_BYTES } from '@/lib/portal/progress'

export const dynamic = 'force-dynamic'

/**
 * 일일 보고에 현장 사진 한 장 올리기 (관리자). 브라우저에서 긴 변 1600px JPEG 로 줄여 한 장씩 보낸다.
 * form: clientId, reportId, photo, caption?, taskId?
 */
export async function POST(req: Request) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: '사진이 너무 큽니다.' }, { status: 400 })
  }
  const clientId = Number(form.get('clientId'))
  const reportId = Number(form.get('reportId'))
  const taskId = Number(form.get('taskId')) || null
  const caption = String(form.get('caption') ?? '')
  const file = form.get('photo')
  if (!Number.isInteger(clientId) || !Number.isInteger(reportId) || !(file instanceof Blob)) return Response.json({ error: '잘못된 요청' }, { status: 400 })
  if (file.size > MAX_REPORT_PHOTO_BYTES) return Response.json({ error: '사진 한 장이 2MB 를 넘습니다.' }, { status: 413 })

  const data = Buffer.from(await file.arrayBuffer())
  const mime = sniffImage(data)
  if (!mime) return Response.json({ error: 'JPG · PNG · WEBP 사진만 올릴 수 있습니다.' }, { status: 415 })
  try {
    const id = await addPhoto(clientId, reportId, { mime, data, caption, taskId })
    return Response.json({ id, bytes: data.length })
  } catch (e) {
    console.error('[progress/photos] 저장 실패', e)
    return Response.json({ error: e instanceof Error ? e.message : '저장 실패' }, { status: 400 })
  }
}
