import { checkKey, clientDetail, clientId, json } from '@/lib/sbworks'

export const dynamic = 'force-dynamic'

/** 업체 상세: 기업정보·프로필(내부자료)·명함 담당자·최신 견적과 버전 기록·상세 공정 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = checkKey(req)
  if (denied) return denied
  const id = clientId((await params).id)
  const detail = id && (await clientDetail(id))
  if (!detail) return json({ error: '업체를 찾을 수 없음.' }, 404)
  return json(detail)
}
