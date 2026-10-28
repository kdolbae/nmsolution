import { readFile } from '@/lib/intake/table'

/**
 * AI 접수 자료 파일. 열쇠(key)가 맞아야 돌려준다. 제안서에 넣은 사진을 업체 페이지(로그인 없음)에서도 띄우기 위한 주소.
 * 열쇠는 파일마다 무작위라 주소를 모르면 못 본다. 관리자 화면 미리보기도 같은 주소를 쓴다.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params
  const f = await readFile(Number(id), key)
  if (!f) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(f.data), {
    headers: {
      'Content-Type': f.mime,
      'Content-Length': String(f.bytes),
      'Cache-Control': 'private, max-age=86400',
      'X-Robots-Tag': 'noindex',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    },
  })
}
