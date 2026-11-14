import { revalidateTag } from 'next/cache'
import { checkKey, json } from '@/lib/sbworks'
import { NCMS_TAG } from '@/lib/ncms'

export const dynamic = 'force-dynamic'

/**
 * N-CMS 가 홈페이지 내용을 저장하면 부른다(마케팅 › 홈페이지 저장 → 이 주소로 POST, Bearer SBWORKS_API_KEY).
 * 캐시해 둔 N-CMS 내용을 버려 다음 방문부터 새 내용이 보이게 한다. 키가 틀리면 아무것도 안 한다.
 */
export async function POST(req: Request) {
  const denied = checkKey(req)
  if (denied) return denied
  revalidateTag(NCMS_TAG, { expire: 0 })
  return json({ ok: true, at: new Date().toISOString() })
}
