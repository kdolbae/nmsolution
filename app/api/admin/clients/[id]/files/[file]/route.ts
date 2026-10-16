import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { clientFiles } from '@/lib/clients/files'
import { getClient } from '@/lib/clients/table'

export const dynamic = 'force-dynamic'

/** 업체 제출 서류 내려받기 (관리자 전용). 목록은 lib/clients/files.ts */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return new Response('로그인이 필요합니다.', { status: 401 })

  const { id, file } = await params
  const client = await getClient(Number(id))
  if (!client) return new Response('없는 업체', { status: 404 })
  const set = clientFiles(client.name)
  const f = set?.files.find((x) => x.file === file)
  if (!set || !f) return new Response('없는 파일', { status: 404 })

  const body = await readFile(path.join(process.cwd(), 'private', 'client-files', set.dir, f.file))
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': f.type,
      'Content-Disposition': `attachment; filename="${f.file}"; filename*=UTF-8''${encodeURIComponent(f.download)}`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
